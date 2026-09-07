'use client';
import { useState } from 'react';
import {
  Shield,
  BowArrow,
  WandSparkles,
  Flame,
  Skull,
  Swords,
  Coins,
  Sparkles,
  Users,
  Heart,
  ChevronRight,
  Flag,
  Copy,
  Eye,
  Target,
  Crown,
  Star,
  Check,
  ShoppingBag,
  HelpCircle,
  ArrowUpRight,
  ArrowRight,
  BookOpen,
  Anvil,
  Tent,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import {
  HEROES,
  ACTS,
  RELICS,
  RELIC_BY_ID,
  NODE_INFO,
  SHOP_ITEMS,
  availableNodes,
  familyCount,
  stats,
  firepower,
  experience,
  formatNumber,
  weaponName,
  type ClassId,
  type Run,
  type NodeKind,
  type Relic,
} from '@/lib/game';
export const CLASS_ICONS = {
  knight: Shield,
  ranger: BowArrow,
  mage: WandSparkles,
};
const ICONS = {
  shield: Shield,
  bow: BowArrow,
  wand: WandSparkles,
  flame: Flame,
  sword: Swords,
  coin: Coins,
  spark: Sparkles,
  users: Users,
  heart: Heart,
  flag: Flag,
  copy: Copy,
  eye: Eye,
  target: Target,
  crown: Crown,
  star: Star,
};
export const NODE_ICONS: Record<NodeKind, typeof Swords> = {
  battle: Swords,
  elite: Skull,
  treasure: Coins,
  rest: Flame,
  shop: ShoppingBag,
  event: HelpCircle,
  boss: Crown,
};
export function RelicIcon({
  name,
  size = 24,
}: {
  name: string;
  size?: number;
}) {
  const Icon = ICONS[name as keyof typeof ICONS] || Sparkles;
  return <Icon size={size} />;
}
export function ClassPicker({
  id,
  onSelect,
}: {
  id: ClassId;
  onSelect: (id: ClassId) => void;
}) {
  const hero = HEROES.find((h) => h.id === id)!;
  const Icon = CLASS_ICONS[id];
  return (
    <aside className="hero-panel panel">
      <div className="panel-heading">
        <span>选择职业</span>
        <span className="muted">01 — 03</span>
      </div>
      <div className="class-options">
        {HEROES.map((h) => {
          return (
            <button
              key={h.id}
              aria-pressed={id === h.id}
              className={`class-card ${id === h.id ? 'selected' : ''}`}
              style={{ '--hero-color': h.color } as React.CSSProperties}
              onClick={() => onSelect(h.id)}
            >
              <span className="class-emblem">
                <img src={`/art/${h.id}.webp`} alt="" />
              </span>
              <span>
                <small>{h.sub}</small>
                <strong>{h.name}</strong>
                <em>{h.tags}</em>
              </span>
              <ChevronRight size={16} />
            </button>
          );
        })}
      </div>
      <div className="hero-description">
        <h3>
          <Icon size={17} /> {hero.name}
        </h3>
        <p>{hero.desc}</p>
        <div className="hero-stats">
          <span>
            <Heart size={16} />
            生命<b>{hero.hp}</b>
          </span>
          <span>
            <Users size={16} />
            队伍<b>{hero.squad}</b>
          </span>
        </div>
      </div>
      <div className="starting-item">
        <span className="item-icon">
          <Swords size={24} />
        </span>
        <div>
          <small>初始武器</small>
          <strong>{hero.weapon}</strong>
          <span>普通 · 等级 I</span>
        </div>
      </div>
      <div className="build-tip">
        <Sparkles size={18} />
        <p>
          {hero.skill}
          <br />
          <span>{hero.skillDesc}</span>
        </p>
      </div>
    </aside>
  );
}
export function RoutePanel({
  run,
  onEnter,
}: {
  run: Run;
  onEnter: (id: string) => void;
}) {
  const floor = run.phase === 'reward' ? run.floor - 1 : run.floor;
  const actIndex = Math.min(2, Math.floor(floor / 4)),
    act = ACTS[actIndex];
  const rows = run.nodes.slice(actIndex * 4, actIndex * 4 + 4);
  const available =
    run.phase === 'map' ? availableNodes(run).map((n) => n.id) : [];
  return (
    <aside className="route-panel panel">
      <div className="panel-heading">
        <span>远征路线</span>
        <span className="muted">{act.roman} / Ⅲ</span>
      </div>
      <div className="act-label">
        <small>ACT {actIndex + 1}</small>
        <h2>{act.name}</h2>
        <p>{act.sub}</p>
      </div>
      <div className="route-map">
        <svg
          className="map-connections"
          viewBox="0 0 210 320"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {rows
            .slice(0, 3)
            .flatMap((row, i) =>
              row.flatMap((a) =>
                rows[i + 1]
                  .filter(
                    (z) => z.kind === 'boss' || Math.abs(a.col - z.col) <= 1,
                  )
                  .map((z) => (
                    <line
                      key={`${a.id}-${z.id}`}
                      x1={35 + a.col * 70}
                      y1={280 - i * 80}
                      x2={35 + z.col * 70}
                      y2={200 - i * 80}
                      className={
                        run.path.includes(a.id) && run.path.includes(z.id)
                          ? 'travelled'
                          : ''
                      }
                    />
                  )),
              ),
            )}
        </svg>
        {[...rows].reverse().map((row, index) => (
          <div className="map-floor" key={row[0].floor}>
            <span className="floor-number">
              {String(row[0].floor + 1).padStart(2, '0')}
            </span>
            {[0, 1, 2].map((col) => {
              const node = row.find((n) => n.col === col);
              if (!node) return <span key={col} />;
              const Icon = NODE_ICONS[node.kind];
              const completed = run.path.includes(node.id);
              const reachable = available.includes(node.id);
              return (
                <button
                  key={col}
                  className={`map-node ${node.kind === 'boss' ? 'boss' : ''} ${reachable ? 'active' : ''} ${completed ? 'completed' : ''} ${run.node?.id === node.id && run.phase === 'battle' ? 'fighting' : ''}`}
                  disabled={!reachable}
                  onClick={() => onEnter(node.id)}
                  aria-label={`第 ${node.floor + 1} 层 ${NODE_INFO[node.kind].name}${completed ? '，已完成' : reachable ? '，可前往' : '，未开放'}`}
                  title={`${node.kind === 'boss' ? act.boss : NODE_INFO[node.kind].name} · ${NODE_INFO[node.kind].desc}`}
                >
                  <Icon size={index === 0 ? 23 : 19} />
                  {completed ? (
                    <span className="map-check">
                      <Check size={11} />
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <div className="map-legend">
        <span>
          <Swords size={12} />
          战斗
        </span>
        <span>
          <Skull size={12} />
          精英
        </span>
        <span>
          <Flame size={12} />
          营火
        </span>
        <span>
          <ShoppingBag size={12} />
          商人
        </span>
      </div>
      <div className="route-note">
        <span className="diamond">◇</span>
        <p>
          {run.phase === 'setup'
            ? '每条岔路，都是一种可能。'
            : run.phase === 'map'
              ? '选择发光的节点，继续前进。'
              : '余烬仍在，你的旅途尚未结束。'}
          <br />
          {run.phase === 'setup'
            ? '每次陨落，都能重新出发。'
            : `已征服 ${run.floor} / 12 层`}
        </p>
      </div>
    </aside>
  );
}
export function BuildPanel({
  run,
  shield,
  onCodex,
}: {
  run: Run;
  shield: number;
  onCodex: () => void;
}) {
  const hero = HEROES.find((h) => h.id === run.classId)!;
  const s = stats(run, shield),
    count = familyCount(run);
  const power = firepower(run, shield);
  const xp = experience(run);
  const families = { knight: '圣盾反击', ranger: '暴击连射', mage: '奥术回响' };
  return (
    <aside className="build-panel panel">
      <div className="panel-heading">
        <span>冒险者</span>
        <button
          className="icon-button"
          onClick={onCodex}
          aria-label="打开构筑图鉴"
        >
          <BookOpen size={16} />
        </button>
      </div>
      <div className="adventurer">
        <span className="class-emblem" style={{ color: hero.color }}>
          <img src={`/art/${hero.id}.webp`} alt="" />
        </span>
        <div>
          <small>{hero.sub}</small>
          <h2>{hero.name}</h2>
          <span>{hero.tags}</span>
        </div>
      </div>
      <div className="experience-details">
        <strong>冒险等级 {xp.level}</strong>
        <span>
          {xp.level === 12 ? '等级已满' : `${xp.current}/${xp.needed} XP`}
        </span>
        <Progress value={xp.progress} aria-label="冒险等级经验" />
        <p>击杀获得经验。每级攻击 +2%，生命上限 +2。</p>
      </div>
      <div className="health-section">
        <div className="stat-label">
          <span>
            <Heart size={14} />
            生命
          </span>
          <b>
            {Math.ceil(run.hp)} <em>/ {run.maxHp}</em>
          </b>
        </div>
        <Progress
          value={(run.hp / run.maxHp) * 100}
          className="hp-progress"
          aria-label="生命值"
        />
        <div className="shield-label">
          <Shield size={13} /> 护盾 <b>{Math.ceil(shield)}</b>
          <span>减伤 {Math.round(s.armor * 100)}%</span>
        </div>
      </div>
      <div className="resource-grid">
        <div>
          <Users size={18} />
          <b>{formatNumber(run.squad)}</b>
          <span>兵力</span>
        </div>
        <div>
          <Coins size={18} />
          <b>{run.gold}</b>
          <span>金币</span>
        </div>
      </div>
      <div className="starting-item">
        <span
          className={`item-icon tier-${Math.min(3, Math.ceil(run.weaponTier / 3))}`}
        >
          <RelicIcon
            name={
              run.classId === 'knight'
                ? 'sword'
                : run.classId === 'ranger'
                  ? 'bow'
                  : 'wand'
            }
          />
        </span>
        <div>
          <small>当前武器 · Lv.{run.weaponTier}</small>
          <strong>{weaponName(run)}</strong>
          <span>
            {run.weaponTier < 3 ? '普通' : run.weaponTier < 6 ? '稀有' : '史诗'}{' '}
            · 攻击强度 {s.damage.toFixed(1)}
          </span>
        </div>
      </div>
      <div className="combat-stats">
        <span>
          兵力加成<b>×{power.multiplier.toFixed(2)}</b>
        </span>
        <span>
          齐射伤害<b>{power.volley.toFixed(1)}</b>
        </span>
        <span>
          攻击频率<b>{s.rate.toFixed(1)} / 秒</b>
        </span>
        <span>
          暴击率<b>{Math.round(s.crit * 100)}%</b>
        </span>
        <span>
          常态每秒火力
          <b>{power.dps.toFixed(0)}</b>
        </span>
      </div>
      <p className="firepower-note">
        齐射 = 攻击强度 × 兵力加成。兵力收益递减，持续增长。
      </p>
      <div className={`synergy-box ${s.synergy ? 'unlocked' : ''}`}>
        <div>
          <Sparkles size={16} />
          <b>{families[run.classId]}</b>
          <span>{Math.min(3, count)} / 3</span>
        </div>
        <p>
          {s.synergy
            ? {
                knight: '流派已激活 · 全部伤害 +15%',
                ranger: '流派已激活 · 暴击率 +10%',
                mage: '流派已激活 · 攻速 +20%',
              }[run.classId]
            : '收集 3 层职业强化，激活流派加成。'}
        </p>
        <div className="synergy-pips">
          {[0, 1, 2].map((i) => (
            <span key={i} className={count > i ? 'filled' : ''} />
          ))}
        </div>
      </div>
      <div className="relic-list-heading">
        <span>已获强化</span>
        <span>{Object.values(run.relics).reduce((a, b) => a + b, 0)}</span>
      </div>
      <div className="relic-list">
        {Object.entries(run.relics).length ? (
          Object.entries(run.relics).map(([id, n]) => (
            <button
              key={id}
              className={`relic-mini rarity-${RELIC_BY_ID[id].rarity}`}
              onClick={onCodex}
              title={`${RELIC_BY_ID[id].name} ×${n}：${RELIC_BY_ID[id].desc}`}
              aria-label={`${RELIC_BY_ID[id].name} ${n} 层，打开图鉴查看`}
            >
              <RelicIcon name={RELIC_BY_ID[id].icon} size={19} />
              <span>{n}</span>
            </button>
          ))
        ) : (
          <p className="empty-relics">第一份秘宝，正在前方等待。</p>
        )}
      </div>
    </aside>
  );
}
export function RelicCard({
  relic,
  owned = 0,
  onPick,
  compact = false,
}: {
  relic: Relic;
  owned?: number;
  onPick?: () => void;
  compact?: boolean;
}) {
  const body = (
    <>
      <div className="relic-card-top">
        <span>{relic.rarity}</span>
        <span>{relic.tag}</span>
      </div>
      <span className="relic-large-icon">
        <RelicIcon name={relic.icon} size={compact ? 27 : 37} />
      </span>
      <h3>{relic.name}</h3>
      <p>{relic.desc}</p>
      <div className="relic-card-bottom">
        {relic.family === 'all'
          ? '通用强化'
          : HEROES.find((h) => h.id === relic.family)!.name}
        <span>
          {owned ? `已有 ${owned} / ${relic.max}` : `最多 ${relic.max} 层`}
        </span>
      </div>
      {onPick ? (
        <span className="choose-relic">
          选择强化 <ArrowUpRight size={15} />
        </span>
      ) : null}
    </>
  );
  return onPick ? (
    <button className={`relic-card rarity-${relic.rarity}`} onClick={onPick}>
      {body}
    </button>
  ) : (
    <article className={`relic-card compact rarity-${relic.rarity}`}>
      {body}
    </article>
  );
}
export function Codex({ run }: { run: Run }) {
  const [filter, setFilter] = useState<ClassId | 'all'>(run.classId);
  return (
    <div className="codex">
      <fieldset className="codex-filters" aria-label="筛选强化职业">
        {(['all', 'knight', 'ranger', 'mage'] as const).map((id) => (
          <button
            className={filter === id ? 'active' : ''}
            onClick={() => setFilter(id)}
            key={id}
            aria-pressed={filter === id}
          >
            {id === 'all' ? '通用' : HEROES.find((h) => h.id === id)!.name}
          </button>
        ))}
      </fieldset>
      <p className="codex-intro">
        职业强化累计 3 层激活流派。相同强化可叠加，数值按层数累加。
      </p>
      <div className="codex-grid">
        {RELICS.filter((r) => r.family === filter).map((r) => (
          <RelicCard
            key={r.id}
            relic={r}
            owned={run.relics[r.id] || 0}
            compact
          />
        ))}
      </div>
    </div>
  );
}
export function RoomScreen({
  run,
  onEnter,
  onReward,
  onRest,
  onBuy,
  onLeaveShop,
  onEvent,
  onRestart,
}: {
  run: Run;
  onEnter: (id: string) => void;
  onReward: (id: string) => void;
  onRest: (action: 'heal' | 'forge') => void;
  onBuy: (id: string) => void;
  onLeaveShop: () => void;
  onEvent: (action: 'blood' | 'gold' | 'leave') => void;
  onRestart: () => void;
}) {
  const phase = run.phase;
  const act = ACTS[Math.min(2, Math.floor(run.floor / 4))];
  return (
    <div className={`room-screen room-${phase}`}>
      {phase === 'map' ? (
        <>
          <div className="room-heading">
            <span className="eyebrow">CHOOSE YOUR PATH</span>
            <h2>下一道门，通向何处？</h2>
            <p>
              第 {run.floor + 1} 层 · {act.name}
            </p>
          </div>
          <div className="route-choices">
            {availableNodes(run).map((n) => {
              const Icon = NODE_ICONS[n.kind];
              return (
                <button
                  key={n.id}
                  className={`route-choice kind-${n.kind}`}
                  onClick={() => onEnter(n.id)}
                >
                  <span className="node-choice-icon">
                    <Icon size={27} />
                  </span>
                  <div>
                    <small>
                      {n.kind === 'boss'
                        ? 'ACT BOSS'
                        : `路线 ${['左', '中', '右'][n.col]}`}
                    </small>
                    <h3>
                      {n.kind === 'boss' ? act.boss : NODE_INFO[n.kind].name}
                    </h3>
                    <p>{NODE_INFO[n.kind].desc}</p>
                  </div>
                  <ArrowRight size={18} />
                </button>
              );
            })}
          </div>
          <p className="checkpoint-note">
            <Check size={13} /> 下一段征程，取决于你的选择
          </p>
        </>
      ) : null}
      {phase === 'reward' ? (
        <>
          <div className="room-heading">
            <span className="victory-sigil">
              <Sparkles size={30} />
            </span>
            <span className="eyebrow">A GIFT FROM THE ASHES</span>
            <h2>力量，源于你的选择。</h2>
            <p>选择一项强化，带入接下来的远征。</p>
          </div>
          <div className="reward-cards">
            {run.reward.map((id) => (
              <RelicCard
                key={id}
                relic={RELIC_BY_ID[id]}
                owned={run.relics[id] || 0}
                onPick={() => onReward(id)}
              />
            ))}
          </div>
          <p className="room-footnote">
            强化持续整局 · 相同强化可叠加 · 职业强化 3 层激活流派
          </p>
        </>
      ) : null}
      {phase === 'rest' ? (
        <>
          <div className="room-heading">
            <span className="room-sigil">
              <Flame size={45} />
            </span>
            <span className="eyebrow">A MOMENT OF RESPITE</span>
            <h2>旅人营火</h2>
            <p>卸下盔甲。火光会记住你的故事。</p>
          </div>
          <div className="room-options">
            <button onClick={() => onRest('heal')}>
              <Tent size={28} />
              <h3>休整队伍</h3>
              <p>恢复最大生命的 40%</p>
              <span>
                恢复 {Math.min(run.maxHp - run.hp, Math.ceil(run.maxHp * 0.4))}{' '}
                生命
              </span>
            </button>
            <button
              onClick={() => onRest('forge')}
              disabled={run.weaponTier >= 10}
            >
              <Anvil size={28} />
              <h3>磨砺武器</h3>
              <p>永久提高本局武器等级</p>
              <span>
                {run.weaponTier >= 10
                  ? '武器已满级'
                  : `Lv.${run.weaponTier} → Lv.${run.weaponTier + 1}`}
              </span>
            </button>
          </div>
          <p className="room-footnote">只能选择一项。前方的道路仍在等待。</p>
        </>
      ) : null}
      {phase === 'shop' ? (
        <>
          <div className="room-heading">
            <span className="room-sigil">
              <ShoppingBag size={37} />
            </span>
            <span className="eyebrow">THE RAVEN’S WARES</span>
            <h2>渡鸦商人</h2>
            <p>“好东西，总要留给活着的人。”</p>
          </div>
          <div className="shop-grid">
            {SHOP_ITEMS.map((item) => {
              const sold = run.purchases.includes(item.id);
              const unavailable =
                run.gold < item.cost ||
                sold ||
                (item.id === 'potion' && run.hp === run.maxHp) ||
                (item.id === 'weapon' && run.weaponTier >= 10);
              return (
                <button
                  key={item.id}
                  disabled={unavailable}
                  onClick={() => onBuy(item.id)}
                >
                  <RelicIcon name={item.icon} />
                  <div>
                    <h3>{item.name}</h3>
                    <p>{item.desc}</p>
                  </div>
                  <span>
                    {sold ? (
                      <Check size={17} />
                    ) : (
                      <>
                        <Coins size={14} />
                        {item.cost}
                      </>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
          <button
            className="primary-button room-continue"
            onClick={onLeaveShop}
          >
            继续旅程 <ArrowRight size={17} />
          </button>
        </>
      ) : null}
      {phase === 'event' ? (
        <>
          <div className="room-heading">
            <span className="room-sigil">
              <Star size={43} />
            </span>
            <span className="eyebrow">WHISPERS OF FATE</span>
            <h2>无人供奉的祭坛</h2>
            <p>
              残破石碑上刻着一句古语：
              <br />
              “凡有所求，必有所献。”
            </p>
          </div>
          <div className="event-choices">
            <button disabled={run.hp <= 18} onClick={() => onEvent('blood')}>
              <Heart size={20} />
              <span>
                <b>献上鲜血</b>
                <small>失去 18 生命，获得随机职业强化</small>
              </span>
              <ChevronRight size={16} />
            </button>
            <button disabled={run.gold < 35} onClick={() => onEvent('gold')}>
              <Users size={20} />
              <span>
                <b>唤醒沉眠者</b>
                <small>支付 35 金币，招募 22 名队员</small>
              </span>
              <ChevronRight size={16} />
            </button>
            <button onClick={() => onEvent('leave')}>
              <Coins size={20} />
              <span>
                <b>拾取散落的钱币</b>
                <small>获得 12 金币，安然离去</small>
              </span>
              <ChevronRight size={16} />
            </button>
          </div>
        </>
      ) : null}
      {phase === 'victory' || phase === 'defeat' ? (
        <>
          <div className="room-heading">
            <span className={`end-sigil ${phase === 'victory' ? 'won' : ''}`}>
              {phase === 'victory' ? <Crown size={55} /> : <Flame size={49} />}
            </span>
            <span className="eyebrow">
              {phase === 'victory' ? 'THE CROWN IS YOURS' : 'THE EMBERS REMAIN'}
            </span>
            <h2>
              {phase === 'victory'
                ? '灰烬之上，新王加冕。'
                : '身归灰烬，誓言未熄。'}
            </h2>
            <p>
              {phase === 'victory'
                ? '十二层高塔已被征服。你的名字将被传唱。'
                : '命运不会记住每一次陨落，却会记住再次出发的人。'}
            </p>
          </div>
          <div className="end-stats">
            <div>
              <b>
                {run.floor}
                <small>/12</small>
              </b>
              <span>征服层数</span>
            </div>
            <div>
              <b>{run.gates}</b>
              <span>穿越之门</span>
            </div>
            <div>
              <b>{run.chests}</b>
              <span>击破宝箱</span>
            </div>
            <div>
              <b>{run.kills}</b>
              <span>击败敌人</span>
            </div>
          </div>
          <div className="end-build">
            {Object.entries(run.relics).map(([id, n]) => (
              <span key={id} title={RELIC_BY_ID[id].desc}>
                <RelicIcon name={RELIC_BY_ID[id].icon} size={15} />
                {RELIC_BY_ID[id].name}
                {n > 1 ? ` ×${n}` : ''}
              </span>
            ))}
          </div>
          <button className="primary-button room-continue" onClick={onRestart}>
            再次踏上征途 <ArrowRight size={18} />
          </button>
        </>
      ) : null}
    </div>
  );
}
export function Help() {
  return (
    <div className="help-content">
      <section>
        <h3>01 · 穿过数值之门</h3>
        <p>
          使用 <kbd>←</kbd> <kbd>→</kbd> 或 <kbd>A</kbd> <kbd>D</kbd>{' '}
          持续左右移动，松开即停。触屏在场地任意位置点击或拖动。门有不同宽度，每组
          2–3 道；以队长中心经过的门结算一次。门隙不生效，红门减少兵力，最少保留
          1 人。
        </p>
      </section>
      <section>
        <h3>02 · 瞄准，自动开火</h3>
        <p>
          队伍自动攻击瞄准范围内最近的目标。兵装秘匣升级武器；补给宝箱提供金币和兵力。需要持续对准才能击破。击败敌人获得金币和经验，升级提高攻击与生命。漏掉敌人仍会受伤且没有奖励；红色预警或飞来弹幕需要及时躲避。
        </p>
      </section>
      <section>
        <h3>03 · 在关键时刻释放技能</h3>
        <p>
          按 <kbd>Space</kbd> 或点击技能按钮，释放职业技能。技能通常冷却 12
          秒。按 <kbd>P</kbd> / <kbd>Esc</kbd>{' '}
          暂停；切到其他页面也会自动暂停。防御来自职业技能、护盾与护甲，没有通用格挡。
        </p>
      </section>
      <section>
        <h3>04 · 构筑属于你的流派</h3>
        <p>
          战后从三项强化中选一项，强化持续整局。累计 3
          层职业强化激活额外加成。选择精英获得更好奖励，也可以去营火治疗、商店购买补给。
        </p>
      </section>
      <section>
        <h3>05 · 登上十二层高塔</h3>
        <p>
          三幕各 4 层，每幕战斗分别有 8 / 10 / 12
          波敌军，越往上节奏越快。荆棘守望者投掷散斧，举盾时需要侧翼攻击；蚀月巫妖释放交错魔法弹幕；灰烬之王的吟唱可持续攻击打断。三位章节首领交战一段时间后开始周期性全屏伤害，拖得越久伤害越高，需要尽快击败；该伤害可被职业护盾与护甲减免，不损失兵力。首领登场
          22 秒后狂暴。生命归零则本局结束，所有职业始终可选。
        </p>
      </section>
      <section>
        <h3>06 · 兵力与攻击强度</h3>
        <p>
          兵力代表军团规模，没有 999 上限；武器和遗物提升攻击强度。兵力加成 = 1
          + log₂(1 + 兵力 / 12)，齐射伤害 = 攻击强度 ×
          兵力加成。每秒火力包含攻速和平均暴击收益，未计技能、弹射和灼烧。受伤会损失兵力，护盾完全吸收伤害时不会损兵。
        </p>
      </section>
      <p className="save-explanation">
        进度仅保存在当前浏览器，关卡间自动存档；战斗中刷新会回到该房间前的存档。左上角「角色」可查看装备、构筑与路线，或切换音效；查看时暂停战斗。
      </p>
    </div>
  );
}
