'use client';
import { useEffect, useState, useId, useSyncExternalStore } from 'react';
import { Trophy, RefreshCw, Feather, Star } from 'lucide-react';
import { HEROES, RELIC_BY_ID, formatNumber, type Difficulty } from '@/lib/game';
import { ENCOUNTERS } from '@/lib/bosses';
import { formatMagnitude, magnitude } from '@/lib/army';
import {
  chronicleRequest,
  identity,
  saveIdentity,
  draftIdentity,
  sealTitle,
  combatClock,
  flushChronicle,
  type ChronicleRow,
} from '@/lib/chronicle';
import './chronicle-panel.css';

const modes = { normal: '普通远征', hard: '灰烬再临', endless: '长夜无尽' };
const subscribeName = (listener: () => void) => {
  window.addEventListener('storage', listener);
  return () => window.removeEventListener('storage', listener);
};
const readName = () => identity().name;
const serverName = () => '';
export function TravellerName() {
  const fieldId = useId();
  const savedName = useSyncExternalStore(subscribeName, readName, serverName);
  const [draft, setName] = useState<string | null>(null);
  const name = draft ?? (savedName === '无名旅人' ? '' : savedName);
  const [message, setMessage] = useState('');
  return (
    <form
      className="traveller-name"
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          await saveIdentity(name);
          setMessage('你的名字已写入史册。');
        } catch {
          setMessage('名字已留在本机，渡鸦归来时再登记。');
        }
      }}
    >
      <label htmlFor={fieldId}>
        旅人之名 <small>将与你的称号一同传颂</small>
      </label>
      <div>
        <input
          id={fieldId}
          value={name}
          placeholder="无名旅人"
          maxLength={16}
          autoComplete="off"
          onChange={(e) => {
            setName(e.target.value);
            draftIdentity(e.target.value);
          }}
        />
        <button type="submit">落款</button>
      </div>
      {message && <output>{message}</output>}
    </form>
  );
}
export function RecordSeal({ runId }: { runId: string }) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState(
    '远征战绩正在送往史册。留下一个值得传颂的称号。',
  );
  const [saving, setSaving] = useState(false);
  return (
    <form
      className="record-seal"
      onSubmit={async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
          await sealTitle(runId, title);
          setMessage('渡鸦将传颂你的称号。');
        } catch {
          setMessage('称号暂存于本机，可稍后重试。');
        } finally {
          setSaving(false);
        }
      }}
    >
      <label htmlFor="epithet">
        <Feather size={18} /> 传颂我的称号
      </label>
      <div>
        <input
          id="epithet"
          maxLength={24}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="如：长夜尽头的守火人"
        />
        <button disabled={saving || !runId}>
          {saving ? '渡鸦启程…' : '铭刻史册'}
        </button>
      </div>
      <output>{message}</output>
    </form>
  );
}
export function ChroniclePanel() {
  const [tab, setTab] = useState<'board' | 'history'>('board');
  const [mode, setMode] = useState<Difficulty>('normal');
  const [sort, setSort] = useState('duration');
  const [classId, setClassId] = useState('all');
  const [page, setPage] = useState(0);
  const [revision, setRevision] = useState(0);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [savingFavorite, setSavingFavorite] = useState('');
  const [favoriteMessage, setFavoriteMessage] = useState('');
  const query = `${tab}?mode=${mode}&sort=${sort}&class=${classId}&page=${page}&favorite=${favoritesOnly ? 1 : 0}`;
  const queryKey = `${query}:${revision}`;
  const [data, setData] = useState<{
    key: string;
    rows: ChronicleRow[];
    more: boolean;
    error: string;
  }>({ key: '', rows: [], more: false, error: '' });
  const loading = data.key !== queryKey;
  const error = loading ? '' : data.error;
  const [selected, setSelected] = useState<ChronicleRow | null>(null);
  const toggleFavorite = async (row: ChronicleRow) => {
    if (savingFavorite) return;
    setSavingFavorite(row.id);
    setFavoriteMessage('');
    try {
      const favorite = !row.favorite;
      await chronicleRequest('favorite', { id: row.id, favorite });
      setSelected((current) =>
        current?.id === row.id
          ? { ...current, favorite: favorite ? 1 : 0 }
          : current,
      );
      setPage(0);
      setRevision((r) => r + 1);
      setFavoriteMessage(
        favorite ? '这段远征已收入珍藏。' : '已撤下珍藏印记，足迹仍留在史册。',
      );
    } catch (e) {
      setFavoriteMessage(
        e instanceof Error ? e.message : '珍藏尚未送达，请重试。',
      );
    } finally {
      setSavingFavorite('');
    }
  };
  useEffect(() => {
    let live = true;
    chronicleRequest<{ rows: ChronicleRow[]; more: boolean }>(query)
      .then((value) => {
        if (live) setData({ ...value, key: queryKey, error: '' });
      })
      .catch((e) => {
        if (live)
          setData({
            key: queryKey,
            rows: [],
            more: false,
            error: e instanceof Error ? e.message : '史册暂时无法连通。',
          });
      });
    return () => {
      live = false;
    };
  }, [query, queryKey]);
  const changeMode = (value: Difficulty) => {
    setMode(value);
    setSort(value === 'endless' ? 'depth' : 'duration');
    setPage(0);
  };
  const details = selected ? JSON.parse(selected.details) : null;
  return (
    <section className="chronicle-panel">
      <div className="chronicle-tabs">
        <button
          aria-pressed={tab === 'board'}
          onClick={() => {
            setTab('board');
            setSelected(null);
            setPage(0);
          }}
        >
          众生史册
        </button>
        <button
          aria-pressed={tab === 'history'}
          onClick={() => {
            setTab('history');
            setSelected(null);
            setPage(0);
          }}
        >
          我的足迹
        </button>
        <button
          aria-label="刷新史册"
          onClick={() => {
            void flushChronicle().then(() => setRevision((r) => r + 1));
          }}
        >
          <RefreshCw size={16} />
        </button>
      </div>
      {tab === 'board' ? (
        <>
          <div className="chronicle-modes">
            {Object.entries(modes).map(([key, label]) => (
              <button
                key={key}
                aria-pressed={mode === key}
                onClick={() => changeMode(key as Difficulty)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="chronicle-filters">
            <label>
              传颂
              <select
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value);
                  setPage(0);
                }}
              >
                {mode === 'endless' ? (
                  <option value="depth">最深远征</option>
                ) : (
                  <option value="duration">最快交战</option>
                )}
                <option value="army">最高兵力</option>
                <option value="gold">最多金币</option>
              </select>
            </label>
            <label>
              誓约
              <select
                value={classId}
                onChange={(e) => {
                  setClassId(e.target.value);
                  setPage(0);
                }}
              >
                <option value="all">所有职业</option>
                {HEROES.map((hero) => (
                  <option key={hero.id} value={hero.id}>
                    {hero.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </>
      ) : (
        <div className="chronicle-history-filter">
          <p>同一旅人印记的历次远征。请保留本浏览器的站点数据。</p>
          <button
            aria-pressed={favoritesOnly}
            onClick={() => {
              setFavoritesOnly((value) => !value);
              setPage(0);
              setSelected(null);
            }}
          >
            <Star size={15} />
            {favoritesOnly ? '查看全部足迹' : '只看珍藏'}
          </button>
        </div>
      )}
      {favoriteMessage && (
        <output className="chronicle-favorite-message" aria-live="polite">
          {favoriteMessage}
        </output>
      )}
      <p className="chronicle-note">
        {tab === 'board'
          ? '每位旅人展示当前排序下的最佳一局。普通与困难收录通关，无尽五层起入榜。'
          : '离线或足迹不完整的远征保留在个人履历。'}{' '}
        计时只计算实际交战。
      </p>
      {loading ? (
        <output className="chronicle-empty">渡鸦正在翻阅史册…</output>
      ) : error ? (
        <p role="alert" className="chronicle-empty">
          {error}
          <button onClick={() => setRevision((r) => r + 1)}>
            再次召唤渡鸦
          </button>
        </p>
      ) : !data.rows.length ? (
        <div className="chronicle-empty">
          <Trophy size={28} />
          <p>
            {tab === 'history' && favoritesOnly
              ? '尚无珍藏。在全部足迹中点亮星印，留下最难忘的远征。'
              : '这一页，尚待有人书写。'}
          </p>
        </div>
      ) : (
        <div className="chronicle-table-wrap">
          <table className="chronicle-table">
            <thead>
              <tr>
                <th>{tab === 'board' ? '位次' : '日期'}</th>
                {tab === 'history' && <th>珍藏</th>}
                <th>旅人 · 称号</th>
                <th>远征</th>
                <th>关数</th>
                <th>交战</th>
                <th>最高兵力</th>
                <th>累积金币</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row, i) => (
                <tr key={row.id}>
                  <td>
                    {tab === 'board'
                      ? String(page * 20 + i + 1).padStart(2, '0')
                      : new Date(row.finished_at).toLocaleDateString('zh-CN')}
                  </td>
                  {tab === 'history' && (
                    <td>
                      <button
                        className="chronicle-favorite"
                        aria-pressed={Boolean(row.favorite)}
                        aria-label={`${row.favorite ? '取消收藏' : '收藏'}：${row.title || row.name} · ${row.depth}关`}
                        title={row.favorite ? '取消收藏' : '收藏这次远征'}
                        disabled={Boolean(savingFavorite)}
                        onClick={() => void toggleFavorite(row)}
                      >
                        <Star
                          size={19}
                          fill={row.favorite ? 'currentColor' : 'none'}
                        />
                      </button>
                    </td>
                  )}
                  <td>
                    <button
                      className="chronicle-traveller"
                      onClick={() => setSelected(row)}
                    >
                      {row.name}
                      <small>{row.title || '尚无传颂之名'}</small>
                    </button>
                  </td>
                  <td>
                    {modes[row.mode]}
                    <small>
                      {HEROES.find((h) => h.id === row.class_id)?.name}
                    </small>
                  </td>
                  <td>{row.depth}</td>
                  <td>{combatClock(row.duration)}</td>
                  <td>
                    {formatMagnitude(
                      row.peak_mantissa && row.peak_exponent !== undefined
                        ? {
                            mantissa: row.peak_mantissa,
                            exponent: row.peak_exponent,
                          }
                        : magnitude(row.peak_squad),
                    )}
                  </td>
                  <td>{formatNumber(row.gold)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="chronicle-pages">
        <button
          disabled={!page || loading}
          onClick={() => setPage((p) => p - 1)}
        >
          上一页
        </button>
        <span>第 {page + 1} 页</span>
        <button
          disabled={!data.more || loading}
          onClick={() => setPage((p) => p + 1)}
        >
          下一页
        </button>
      </div>
      {selected && details && (
        <article className="chronicle-detail">
          <button className="text-button" onClick={() => setSelected(null)}>
            收起档案
          </button>
          <h3>
            {selected.name} · {selected.title || '无名之誓'}
          </h3>
          <p>
            {modes[selected.mode]} ·{' '}
            {selected.status === 'won'
              ? '征服王座'
              : selected.status === 'retired'
                ? '归还火种'
                : '陨落长路'}
            {!selected.ranked ? ' · 私人履历' : ''}
          </p>
          <dl>
            {[
              ['武器', `Lv.${details.weaponTier}`],
              ['生命上限', formatNumber(details.maxHp)],
              ['击败敌军', details.kills],
              ['穿越之门', details.gates],
              ['开启宝箱', details.chests],
              ['焚印重铸', details.reforges],
              ['禁门深度', details.keysOpened],
              ['军势倍率', formatNumber(details.legion)],
              ['战斗秒伤', formatNumber(details.dps)],
              ['命运种子', selected.seed],
            ].map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <p>
            {Object.entries(details.relics || {})
              .map(
                ([id, count]) =>
                  `${RELIC_BY_ID[id]?.name || id} ×${Number(count)}`,
              )
              .join(' · ') || '未携带符文'}
          </p>
          {details.allies?.length > 0 && (
            <p>
              盟誓：
              {details.allies
                .map(
                  (id: string) =>
                    ENCOUNTERS.find((e) => e.id === id)?.name || id,
                )
                .join('、')}
            </p>
          )}
          {tab === 'history' && (
            <>
              <button
                className="chronicle-favorite"
                aria-pressed={Boolean(selected.favorite)}
                disabled={Boolean(savingFavorite) || loading}
                onClick={() => void toggleFavorite(selected)}
              >
                <Star
                  size={17}
                  fill={selected.favorite ? 'currentColor' : 'none'}
                />
                {selected.favorite ? '已珍藏 · 取消收藏' : '珍藏这次远征'}
              </button>
              <RecordSeal key={selected.id} runId={selected.id} />
            </>
          )}
        </article>
      )}
    </section>
  );
}
