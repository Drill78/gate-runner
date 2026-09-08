'use client';
import { useSyncExternalStore } from 'react';
import {
  Crown,
  Flame,
  Heart,
  ArrowRight,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { HEROES, RELIC_BY_ID, formatNumber, type Run } from '@/lib/game';
import { formatMagnitude, peakArmyMagnitude } from '@/lib/army';
import { combatClock, identity } from '@/lib/chronicle';
import { RecordSeal } from './chronicle-panel';
import './expedition-results.css';

const subscribe = (fn: () => void) => {
  window.addEventListener('ashen-chronicle', fn);
  return () => window.removeEventListener('ashen-chronicle', fn);
};
const nameSnapshot = () => identity().name;
const serverName = () => '无名旅人';
export function ExpeditionResults({
  run,
  onRestart,
  onRevive,
  onAcceptDefeat,
  onEpilogue,
  onCheckpoint,
  checkpointDepth = 0,
}: {
  run: Run;
  onRestart: () => void;
  onRevive: () => void;
  onAcceptDefeat: () => void;
  onEpilogue: () => void;
  onCheckpoint: (room: 46 | 91) => void;
  checkpointDepth?: number;
}) {
  const hero = HEROES.find((h) => h.id === run.classId)!;
  const name = useSyncExternalStore(subscribe, nameSnapshot, serverName);
  const ascension = run.phase === 'ascension';
  const epilogue =
    run.phase === 'victory' &&
    run.difficulty === 'endless' &&
    Boolean(run.ascended);
  const won = ascension || run.phase === 'victory';
  const fallen = run.phase === 'fallen';
  const total = run.difficulty === 'endless' ? 100 : 15;
  const points = (run.journey || []).filter((p) => p.room <= total);
  const maxLog = Math.max(1, ...points.map((p) => p.armyLog));
  const path = (metric: 'hp' | 'armyLog') =>
    points
      .map(
        (p, i) =>
          `${i ? 'L' : 'M'}${12 + (points.length > 1 ? i / (points.length - 1) : 0) * 576},${metric === 'hp' ? 92 - (p.hp / p.maxHp) * 76 : 92 - (p.armyLog / maxLog) * 76}`,
      )
      .join(' ');
  return (
    <article
      className={`expedition-result ${won ? 'result-won' : ''} ${ascension || epilogue ? 'result-ascended' : ''}`}
    >
      <div className="result-radiance" aria-hidden="true" />
      <header className="result-heading">
        <span className="result-emblem">
          {won ? <Crown size={42} /> : <Flame size={40} />}
        </span>
        <span className="eyebrow">
          {epilogue
            ? 'THANK YOU FOR PLAYING'
            : ascension
              ? 'APOTHEOSIS'
              : fallen
                ? 'ONE MORE EMBER'
                : won
                  ? 'THE OATH FULFILLED'
                  : 'THE EMBERS REMAIN'}
        </span>
        <h2>
          {run.devMode && won && !ascension && !epilogue
            ? '独立演武已完成。'
            : epilogue
              ? '故事落幕，光仍与你同行。'
              : ascension
                ? '破除迷雾，终究登神。'
                : fallen
                  ? '余火尚温，你仍可归来。'
                  : won
                    ? '灰烬之上，新王加冕。'
                    : run.retired
                      ? '携火归来，长夜犹存。'
                      : '身归灰烬，誓言未熄。'}
        </h2>
        <p>
          {run.devMode && won && !ascension && !epilogue
            ? '本次演练已结束，可以返回演武场继续选择首领。'
            : epilogue
              ? '感谢你让这个世界，拥有了最后一位见证者。'
              : ascension
                ? '恭喜你，走完了凡人不曾走完的路。感谢每一次选择、每一次坚持，以及你带来的光。'
                : fallen
                  ? '一枚归魂币，可以重燃此战。你已走过的路不会消失。'
                  : won
                    ? '十五关高塔已被征服。你的名字将被传唱。'
                    : '这段路值得被记住。歇一会儿，火种会等你。'}
        </p>
      </header>
      <div className="result-dossier">
        <img
          src={`/art/${run.classId}.webp`}
          alt={hero.name}
          width={150}
          height={210}
        />
        <div>
          <span className="eyebrow">{hero.sub}</span>
          <h3>
            {(ascension || epilogue) && !run.devMode ? '✦ ' : ''}
            {name}
          </h3>
          <strong>
            {hero.name} · {hero.person}
          </strong>
          <p>「{hero.quote}」</p>
          <span className="result-mode">
            {run.devMode
              ? '演武记录'
              : run.difficulty === 'endless'
                ? '登神远征'
                : run.difficulty === 'hard'
                  ? '灰烬再临'
                  : '普通远征'}
            {run.checkpointStart ? ` · 第${run.checkpointStart}关续战` : ''}
          </span>
        </div>
        <div className="result-depth">
          <b>{Math.min(total, run.floor)}</b>
          <span>/ {total} 关</span>
          <small>
            {ascension || epilogue ? '完美通关' : won ? '王座征服' : '远征足迹'}
          </small>
        </div>
      </div>
      <dl className="result-metrics">
        {[
          ['交战时长', combatClock(run.combatTime)],
          ['巅峰军势', formatMagnitude(peakArmyMagnitude(run))],
          ['积累金币', formatNumber(run.goldEarned)],
          ['兵装等级', `Lv.${run.weaponTier}`],
          ['敌军退散', formatNumber(run.kills)],
          ['秘匣开启', formatNumber(run.chests)],
          ['焚印重铸', String(run.endless.reforges)],
          ['归魂次数', String(run.revivalsUsed || 0)],
        ].map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      {points.length > 0 && (
        <div className="result-charts">
          <figure>
            <figcaption>
              <Heart size={14} />
              余火轨迹 <small>每关结束时生命比例 · 0—100%</small>
            </figcaption>
            <svg viewBox="0 0 600 110" aria-label="各关结束时的生命百分比">
              <title>各关结束时的生命百分比</title>
              <path
                className="chart-guide"
                d="M12 16H588 M12 54H588 M12 92H588"
              />
              <path className="chart-hp" d={path('hp')} />
              {points.length === 1 && (
                <circle
                  cx={12}
                  cy={92 - (points[0].hp / points[0].maxHp) * 76}
                  r={3}
                  fill="#a9c3ae"
                />
              )}
            </svg>
          </figure>
          <figure>
            <figcaption>
              <Sparkles size={14} />
              军势攀升{' '}
              <small>兵力以十进制指数表示 · 0—{Math.ceil(maxLog)}</small>
            </figcaption>
            <svg viewBox="0 0 600 110" aria-label="各关兵力十进制指数的变化">
              <title>各关兵力十进制指数的变化</title>
              <path
                className="chart-guide"
                d="M12 16H588 M12 54H588 M12 92H588"
              />
              <path className="chart-army" d={path('armyLog')} />
              {points.length === 1 && (
                <circle
                  cx={12}
                  cy={92 - (points[0].armyLog / maxLog) * 76}
                  r={3}
                  fill="#e7bd6c"
                />
              )}
            </svg>
          </figure>
          <span className="chart-caption">
            第{points[0].room}关 → 第{points.at(-1)!.room}关 ·
            仅绘制本次实际经过的关卡
          </span>
        </div>
      )}
      <div className="result-runes">
        {Object.entries(run.relics).map(([id, count]) => (
          <span key={id} title={RELIC_BY_ID[id]?.desc}>
            {RELIC_BY_ID[id]?.name || id}
            <b>×{count}</b>
          </span>
        ))}
      </div>
      {ascension && (
        <div className="ascension-gifts">
          <Crown />
          <div>
            <strong>
              {run.devMode ? '登神演出预览' : '登神之证 · 永久铭刻'}
            </strong>
            <p>
              {run.devMode
                ? '本次不会授予正式荣誉或上传战绩。'
                : '金色仪容、姓名前的登神星徽与终极成就，已为你点亮。百关战绩正在送往灰烬史册。'}
            </p>
          </div>
        </div>
      )}
      {epilogue && (
        <div className="creator-credit">
          <span>制作与陪伴</span>
          <strong>绿色咸咸圈&GPT-6 Astra</strong>
          <p>游戏通关！愿你走出屏幕之后，也始终拥有重新出发的勇气。</p>
        </div>
      )}
      {!run.devMode && !fallen && !epilogue && <RecordSeal runId={run.runId} />}
      <div className="result-actions">
        {fallen ? (
          <>
            <button className="primary-button" onClick={onRevive}>
              <Flame size={18} />
              燃尽一枚归魂币 · 满血重战（余{run.revivalCoins}枚）
            </button>
            <button className="text-button" onClick={onAcceptDefeat}>
              让这段远征留在史册
            </button>
          </>
        ) : ascension ? (
          <button className="primary-button" onClick={onEpilogue}>
            走向最后的祝福 <ArrowRight size={18} />
          </button>
        ) : (
          <>
            <button className="primary-button" onClick={onRestart}>
              返回启程之地 <ArrowRight size={18} />
            </button>
            {run.difficulty === 'endless' && !won && checkpointDepth >= 45 && (
              <button
                className="secondary-button"
                onClick={() => onCheckpoint(checkpointDepth >= 90 ? 91 : 46)}
              >
                <RotateCcw size={17} />
                从第{checkpointDepth >= 90 ? 91 : 46}关的篝火续行 · 固定构筑
              </button>
            )}
          </>
        )}
      </div>
    </article>
  );
}

const ROUND_TEXT = [
  [
    '第一轮 · 余火重燃',
    '你曾见过王座的尽头。今夜，守门人的誓言更深，倒下的王也将再次起身。',
  ],
  [
    '第二轮 · 王影未散',
    '第一顶王冠落入尘埃，回声却从更远的王座传来。不要在第一位王倒下时放下武器。',
  ],
  [
    '第三轮 · 长夜断崖',
    '黑影、血月与金光开始侵蚀旧日的君主。这一轮，长夜将真正试探你的构筑。',
  ],
  [
    '第四轮 · 诸誓合围',
    '诸王带着近卫归来。每一种异化都留有破绽，耐心等到属于你的那一次出手。',
  ],
  [
    '第五轮 · 三度焚冠',
    '三顶王冠燃起不同颜色的火。你所携带的，不只是兵刃，还有一路收下的誓言。',
  ],
  [
    '第六轮 · 终夜审判',
    '最后一重长夜横在面前。群王之后，云层正在裂开；请把最后一束火，带到那里。',
  ],
];
export function ChapterInterlude({ run }: { run: Run }) {
  if (run.floor % 5 !== 0 || run.floor > 95) return null;
  const endless = run.difficulty === 'endless';
  const round = Math.min(5, Math.floor(run.floor / 15));
  const act = Math.floor((run.floor % 15) / 5);
  const [title, description] =
    run.floor === 95
      ? [
          '长阶中途 · 誓言未息',
          '身后的白羽正化作微尘。你握紧一路收下的祝福，再向着诸神迈出一步。',
        ]
      : run.floor === 90
        ? [
            '登神长阶',
            '群王已尽，长夜已终。前方只剩一条路。白翼会在陨落后再度展开；撑过十秒的狂怒，便能听见神性破碎的声音。',
          ]
        : endless && act === 0
          ? ROUND_TEXT[round]
          : [
              ['荆棘边境', '风穿过残破的旌旗。旧日的誓约仍守在道路尽头。'],
              [
                '月蚀回廊',
                '身后的荆棘终于沉寂。你拾起余火，踏入星光无法照见的回廊。',
              ],
              [
                '余烬王座',
                '最后一段石阶仍有余温。王冠之下，尚有不肯熄灭的灵魂。',
              ],
            ][act];
  return (
    <aside className="chapter-interlude">
      <span>
        {run.floor >= 90
          ? '六轮长夜已尽 · 登神长阶'
          : endless
            ? `长夜第${Math.min(6, round + 1)}轮 · 每轮十五关`
            : '新的章节'}
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {run.floor > 0 && (
        <small>章末余火庇护 · 已恢复最大生命的50%，最多回满</small>
      )}
    </aside>
  );
}
