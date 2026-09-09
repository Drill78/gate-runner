'use client';
import { formatArmy } from '@/lib/army';
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
  KeyRound,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import {
  HEROES,
  ACT_LENGTH,
  TOTAL_FLOORS,
  MAX_LEVEL,
  eventChoices,
  type EventId,
  ACTS,
  RELICS,
  RELIC_BY_ID,
  REWARD_BY_ID,
  NODE_INFO,
  shopInventory,
  shopItemAvailability,
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
  type ShopCategory,
} from '@/lib/game';
import { bossProfile } from '@/lib/bosses';
import {
  actIndex as currentAct,
  isEndless,
  weaponLimit,
  endlessEncounter,
} from '@/lib/endless';
import { ExpeditionResults, ChapterInterlude } from './expedition-results';
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
  key: KeyRound,
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
  const actIndex = currentAct(run);
  const act = ACTS[actIndex];
  return (
    <aside className="route-panel panel">
      <div className="panel-heading">
        <span>远征路线</span>
        <span>
          {isEndless(run)
            ? run.floor >= 90
              ? '登神长阶'
              : `第${Math.floor(run.floor / 15) + 1}轮`
            : `${act.roman} / Ⅲ`}
        </span>
      </div>
      <div className="act-label">
        <h2>{isEndless(run) && run.floor >= 90 ? '登神长阶' : act.name}</h2>
        <p>每层五关 · 沿连线前进</p>
      </div>
      <RouteGraph run={run} onEnter={onEnter} />
      <p className="route-note">
        已征服 {Math.min(run.floor, 100)} /{' '}
        {isEndless(run) ? '100' : TOTAL_FLOORS} 关
      </p>
    </aside>
  );
}
export function RouteGraph({
  run,
  onEnter,
}: {
  run: Run;
  onEnter: (id: string) => void;
}) {
  const actIndex = currentAct(run);
  if (isEndless(run) && run.floor >= 90) {
    const reachable = run.phase === 'map' ? availableNodes(run) : [];
    return (
      <div
        className={`stair-map ${run.floor === 100 ? 'stair-map--epilogue' : ''}`}
        aria-label="登神长阶，唯一的前行之路"
      >
        <ol>
          {run.nodes.flat().map((node) => {
            const active = reachable.some((n) => n.id === node.id),
              completed = run.path.includes(node.id);
            const encounter = endlessEncounter({ ...run, floor: node.floor });
            return (
              <li key={node.id}>
                <button
                  className={`stair-node ${active ? 'active' : ''} ${completed ? 'completed' : ''}`}
                  disabled={!active}
                  onClick={() => onEnter(node.id)}
                  aria-label={`第${node.floor + 1}关 ${encounter?.name || '诸神的祝福'}${completed ? ' 已完成' : ''}`}
                >
                  <b>{node.floor + 1}</b>
                  <span>
                    {completed ? '誓约已成' : encounter?.name || '诸神的祝福'}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    );
  }
  const rows = run.nodes.slice(
    actIndex * ACT_LENGTH,
    (actIndex + 1) * ACT_LENGTH,
  );
  const reachable = run.phase === 'map' ? availableNodes(run) : [];
  return (
    <div className="branch-map" aria-label="沿连线前进的五关路线图">
      <svg viewBox="0 0 350 360" preserveAspectRatio="none" aria-hidden="true">
        {rows.slice(0, -1).flatMap((row, depth) =>
          row.flatMap((node) =>
            node.next.map((id) => {
              const target = rows[depth + 1].find((n) => n.id === id);
              if (!target) return null;
              return (
                <line
                  key={`${node.id}-${id}`}
                  x1={35 + node.col * 70}
                  y1={324 - depth * 72}
                  x2={35 + target.col * 70}
                  y2={252 - depth * 72}
                  className={
                    run.path.includes(node.id) && run.path.includes(id)
                      ? 'travelled'
                      : ''
                  }
                />
              );
            }),
          ),
        )}
      </svg>
      {rows.flatMap((row, depth) =>
        row.map((node) => {
          const active = reachable.find((n) => n.id === node.id);
          const completed = run.path.includes(node.id);
          const enchanted =
            node.kind === 'elite' &&
            Boolean(run.relics.square_key) &&
            !run.squareGateSeen;
          const Icon = NODE_ICONS[node.kind];
          const name =
            node.kind === 'boss'
              ? bossProfile({ ...run, floor: node.floor, node }).name
              : NODE_INFO[node.kind].name;
          return (
            <button
              key={node.id}
              className={`branch-node ${active ? 'active' : ''} ${completed ? 'completed' : ''} ${enchanted ? 'enchanted-node' : ''} ${node.kind === 'boss' ? 'boss' : ''}`}
              style={{
                left: `${(35 + node.col * 70) / 3.5}%`,
                top: `${(324 - depth * 72) / 3.6}%`,
              }}
              disabled={!active}
              onClick={() => onEnter(node.id)}
              aria-label={`第${depth + 1}关，${enchanted ? '被黑雾侵染的' : ''}${name}${active ? '，可前往' : completed ? '，已完成' : '，不可直达'}`}
              title={`${name} · ${NODE_INFO[node.kind].desc}`}
            >
              <Icon size={node.kind === 'boss' ? 24 : 19} />
              <span>
                {completed
                  ? '已完成'
                  : node.kind === 'boss'
                    ? '首领'
                    : {
                        battle: '战斗',
                        elite: enchanted ? '禁域精英' : '精英',
                        treasure: '宝库',
                        rest: '营火',
                        shop: '商店',
                        event: '事件',
                      }[node.kind]}
              </span>
            </button>
          );
        }),
      )}
    </div>
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
          {xp.level === MAX_LEVEL
            ? '等级已满'
            : `${xp.current}/${xp.needed} XP`}
        </span>
        <Progress value={xp.progress} aria-label="冒险等级经验" />
        <p>击杀获得经验。每级攻击 +2%，生命上限 +6。</p>
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
          <span
            title={`装备护甲 ${Math.round(s.equipmentArmor * 100)}% · 军阵护佑 ${Math.round(s.armyArmor * 100)}%，分别抵御剩余伤害`}
          >
            减伤 {Math.round(s.armor * 100)}%
          </span>
        </div>
      </div>
      <div className="resource-grid">
        <div>
          <Users size={18} />
          <b>{formatArmy(run)}</b>
          <span>兵力 · 护佑 {Math.round(s.armyArmor * 100)}%</span>
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
          主弹伤害<b>{power.volley.toFixed(1)}</b>
        </span>
        <span>
          攻击频率<b>{s.rate.toFixed(1)} / 秒</b>
        </span>
        <span>
          暴击率<b>{Math.round(s.crit * 100)}%</b>
        </span>
        <span>
          理论主弹 DPS
          <b>{power.dps.toFixed(0)}</b>
        </span>
        <span>
          常规齐射<b>{1 + s.extraPairs * 2} 枚</b>
        </span>
        <span>
          额外穿透<b>{s.pierceCount} 个目标</b>
        </span>
        <span>
          弹速倍率<b>×{(s.bulletSpeed / 1.7).toFixed(2)}</b>
        </span>
        <span>
          弹体半径<b>×{(s.bulletRadius / 0.025).toFixed(2)}</b>
        </span>
      </div>
      <p className="firepower-note">
        主弹伤害 = 攻击强度 ×
        兵力加成。人数越多，火力越高。自动向前发射，弹体不会锁定。 理论主弹 DPS
        只估算主弹、攻速与暴击；实际输出还受命中率、副弹、穿透和爆裂影响。
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
        {relic.id.startsWith('supply-')
          ? '立即生效'
          : relic.family === 'all'
            ? '通用强化'
            : HEROES.find((h) => h.id === relic.family)!.name}
        <span>
          {relic.id.startsWith('supply-')
            ? '战地补给'
            : owned
              ? `已有 ${owned} / ${relic.max}`
              : `最多 ${relic.max} 层`}
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
        共 {RELICS.filter((r) => r.id !== 'square_key').length}{' '}
        项强化。通用弹幕词条可与任何职业搭配；职业强化累计 3 层激活流派。
        相同强化可叠层，副弹、穿透、爆裂等效果见卡片说明。
      </p>
      <div className="codex-grid">
        {RELICS.filter((r) => r.family === filter && r.id !== 'square_key').map(
          (r) => (
            <RelicCard
              key={r.id}
              relic={r}
              owned={run.relics[r.id] || 0}
              compact
            />
          ),
        )}
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
  onRetire,
  onRevive,
  onAcceptDefeat,
  onEpilogue,
  onCheckpoint,
  checkpointDepth,
  onDeveloperMenu,
}: {
  run: Run;
  onEnter: (id: string) => void;
  onReward: (id: string) => void;
  onRest: (action: 'heal' | 'forge') => void;
  onBuy: (id: string) => void;
  onLeaveShop: () => void;
  onEvent: (action: EventId) => void;
  onRestart: () => void;
  onRetire: () => void;
  onRevive: () => void;
  onAcceptDefeat: () => void;
  onEpilogue: () => void;
  onCheckpoint: (room: 46 | 91) => void;
  checkpointDepth: number;
  onDeveloperMenu?: () => void;
}) {
  const phase = run.phase;
  const act = ACTS[currentAct(run)];
  const [shopFilter, setShopFilter] = useState<ShopCategory | '全部'>('全部');
  if (['victory', 'defeat', 'fallen', 'ascension'].includes(phase))
    return (
      <section
        className="room-screen room-results"
        // Keyboard users must be able to focus and scroll the complete results.
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
        tabIndex={0}
        aria-label="远征结算，可向下滚动查看完整战绩与后续旅程"
      >
        <ExpeditionResults
          run={run}
          onRestart={onRestart}
          onRevive={onRevive}
          onAcceptDefeat={onAcceptDefeat}
          onEpilogue={onEpilogue}
          onCheckpoint={onCheckpoint}
          checkpointDepth={checkpointDepth}
          onDeveloperMenu={onDeveloperMenu}
        />
      </section>
    );
  return (
    <div
      className={`room-screen room-${phase} act-${currentAct(run)} ${isEndless(run) && run.floor >= 90 ? 'is-ascension-route' : ''} ${run.relics.square_key && !run.squareGateSeen ? 'is-forbidden' : ''}`}
    >
      {isEndless(run) && (
        <div className="endless-status">
          <strong>
            {run.floor >= 90
              ? '登神长阶'
              : `第${Math.floor(run.floor / 15) + 1}轮 · 第${Math.floor((run.floor % 15) / 5) + 1}层`}
          </strong>
          <span>
            归魂币 {run.revivalCoins || 0} · 此行已获{' '}
            {run.revivalCoinsEarned || 0}/3
          </span>
          <span>薪火 ×{formatNumber(run.endless.power)}</span>
          <span>军势 ×{formatNumber(run.endless.legion)}</span>
          <span>焚印 {run.endless.reforges} 次</span>
          <span>盟誓 {run.endless.allies.length} 位</span>
          <span>深门 {run.endless.keysOpened} 重</span>
        </div>
      )}
      {phase === 'map' ? (
        <>
          <ChapterInterlude run={run} />
          <div className="room-heading">
            <span className="eyebrow">CHOOSE YOUR PATH</span>
            <h2>
              {isEndless(run) && run.floor >= 90
                ? '向着光，再走一步。'
                : '下一道门，通向何处？'}
            </h2>
            <p>
              第 {run.floor + 1} 关 ·{' '}
              {isEndless(run) && run.floor >= 90 ? '登神长阶' : act.name}
            </p>
          </div>
          <RouteGraph run={run} onEnter={onEnter} />
          <div className="route-choices">
            {availableNodes(run).map((n) => {
              const Icon = NODE_ICONS[n.kind];
              return (
                <button
                  key={n.id}
                  className={`route-choice kind-${n.kind} ${n.enchanted ? 'enchanted-node' : ''}`}
                  onClick={() => onEnter(n.id)}
                >
                  <span className="node-choice-icon">
                    <Icon size={27} />
                  </span>
                  <div>
                    <small>
                      {n.kind === 'boss'
                        ? 'ACT BOSS'
                        : n.enchanted
                          ? '黑雾侵染 · 极度危险'
                          : `连线分支 ${n.col + 1}`}
                    </small>
                    <h3>
                      {n.kind === 'boss'
                        ? endlessEncounter(run)?.name ||
                          bossProfile({ ...run, node: n }).name
                        : NODE_INFO[n.kind].name}
                    </h3>
                    <p>
                      {n.kind === 'boss'
                        ? endlessEncounter(run)?.omen || NODE_INFO[n.kind].desc
                        : NODE_INFO[n.kind].desc}
                    </p>
                  </div>
                  <ArrowRight size={18} />
                </button>
              );
            })}
          </div>
          <p className="checkpoint-note">
            <Check size={13} />{' '}
            {isEndless(run) && run.floor >= 90
              ? '长阶没有岔路。让所有未竟的誓言，在此迎来终章。'
              : '下一段征程，取决于你的选择'}
          </p>
          {isEndless(run) && run.floor > 0 && (
            <button className="text-button endless-retire" onClick={onRetire}>
              归还火种 · 结束远征并铭刻此行
            </button>
          )}
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
                relic={REWARD_BY_ID[id]}
                owned={run.relics[id] || 0}
                onPick={() => onReward(id)}
              />
            ))}
          </div>
          <p className="room-footnote">
            技能强化持续整局 · 补给立即生效 · 职业强化 3 层激活流派
          </p>
          <button className="text-button" onClick={() => onReward('__skip')}>
            跳过本次奖励
          </button>
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
              disabled={run.weaponTier >= weaponLimit(run)}
            >
              <Anvil size={28} />
              <h3>磨砺武器</h3>
              <p>永久提高本局武器等级</p>
              <span>
                {run.weaponTier >= weaponLimit(run)
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
          <fieldset className="codex-filters" aria-label="筛选商店商品">
            {(['全部', '补给', '弹幕', '职业'] as const).map((category) => (
              <button
                type="button"
                key={category}
                className={shopFilter === category ? 'active' : ''}
                aria-pressed={shopFilter === category}
                onClick={() => setShopFilter(category)}
              >
                {category}
              </button>
            ))}
          </fieldset>
          <p className="room-footnote">
            每家商店随机陈列 5 件商品，另有特殊珍藏。每件限购一次。
          </p>
          <div className="shop-grid">
            {shopInventory(run)
              .filter(
                (item) =>
                  item.id === 'relic-square_key' ||
                  shopFilter === '全部' ||
                  item.category === shopFilter,
              )
              .map((item) => {
                const sold = run.purchases.includes(item.id);
                const availability = shopItemAvailability(run, item.id);
                return (
                  <button
                    key={item.id}
                    className={
                      item.id === 'relic-square_key'
                        ? 'shop-special'
                        : item.kind === 'relic' &&
                            RELIC_BY_ID[item.relicId].rarity === '传说'
                          ? 'shop-legendary'
                          : ''
                    }
                    type="button"
                    disabled={!availability.available}
                    onClick={() => onBuy(item.id)}
                    aria-label={`${item.name}，${item.cost} 金币，${availability.available ? '购买' : availability.reason}`}
                    title={availability.reason || item.desc}
                  >
                    <RelicIcon name={item.icon} />
                    <div>
                      <h3>{item.name}</h3>
                      <p>{item.desc}</p>
                      <small>
                        {availability.reason ||
                          (item.id === 'relic-square_key'
                            ? '特殊珍藏'
                            : item.kind === 'relic'
                              ? `已有 ${run.relics[item.relicId] || 0} / ${RELIC_BY_ID[item.relicId].max} 层`
                              : item.category)}
                      </small>
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
            <h2>命运之约</h2>
            <p>
              三桩奇遇，一次抉择；也可收下路资继续前行。
              <br />
              代价与馈赠，随你的远征一同成长。
            </p>
          </div>
          <div className="event-choices">
            {eventChoices(run).map((choice) => (
              <button
                key={choice.id}
                disabled={!choice.available}
                onClick={() => onEvent(choice.id)}
              >
                <RelicIcon name={choice.icon} />
                <span>
                  <b>{choice.name}</b>
                  <small>{choice.description}</small>
                </span>
                <ChevronRight size={16} />
              </button>
            ))}
          </div>
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
          通常 2–3
          道；以队长中心经过的门结算一次。门隙不生效，红门减少兵力，最少保留 1
          人，加减数值随兵力缩放。职业和遗物招募在运算后结算。
        </p>
      </section>
      <section>
        <h3>02 · 瞄准，自动开火</h3>
        <p>
          队伍自动向前发射飞行弹体，横移调整弹道；子弹不会锁定，打空会继续飞过敌人。
          穿透让子弹继续命中后方目标，散射与爆裂覆盖更大范围。兵装秘匣升级武器，补给宝箱提供金币和兵力。
          击败敌人获得金币和经验，升级提高攻击与生命，并暂停战斗让你三选一研习技能强化。漏掉敌人仍会受伤且没有奖励；红色预警或飞来弹幕需要及时躲避。
        </p>
      </section>
      <section>
        <h3>03 · 在关键时刻释放技能</h3>
        <p>
          按 <kbd>Space</kbd> 或点击场地右侧技能按钮，释放职业技能。技能通常冷却
          12
          秒。也可在暂停菜单开启「双击人物释放技能」，连续轻点队长即可施放。按{' '}
          <kbd>P</kbd> / <kbd>Esc</kbd>{' '}
          暂停；切到其他页面也会自动暂停。骑士以护盾与5秒增伤守阵，游侠以全场箭雨开启5秒疾射与必定暴击，法师以追踪火球与军团增幅猎杀敌人。暴击率超过100%的部分等量转为额外暴击伤害。
        </p>
      </section>
      <section>
        <h3>04 · 构筑属于你的流派</h3>
        <p>
          战后从三项奖励中选一项，可能获得技能强化、治疗、招募或武器升级。技能强化持续整局。累计
          3
          层职业强化激活额外加成。穿透、散射、爆裂等通用弹幕词条可以和职业搭配。
          精英战的三选一必含史诗或传说奖励；也可以去营火治疗、商店购买强化和补给。
          传说强化符文以金色标识，出现较少，能带来关键的职业或弹幕能力。
        </p>
      </section>
      <section>
        <h3>05 · 登上十五关高塔</h3>
        <p>
          三层各 5 关，每幕战斗分别有 8 / 10 / 12
          波敌军，每章的灰潮会更加密集。行尸只在接触队长时造成伤害，适合用穿透、散射和爆裂清理；精英有坚韧护甲。关底精英和章节首领的普通技能都可躲避。荆棘守望者投掷散斧，举盾时需要侧翼攻击；蚀月巫妖释放交错魔法弹幕；前两幕另有岚翼古龙与命运先知轮换登场。灰烬之王有三阶段火环、陨火和焚风，吟唱可持续攻击打断，也可移入绿色安全区躲避。只有每幕的章节首领在交战一段时间后开始周期性全屏伤害，拖得越久伤害越高，需要尽快击败；该伤害可被职业护盾与护甲减免，不损失兵力。首领登场
          22
          秒后狂暴。生命归零则本局结束，所有职业始终可选。首次通关解锁困难模式，前两幕同时迎战双首领。
        </p>
      </section>
      <section>
        <h3>06 · 兵力与攻击强度</h3>
        <p>
          兵力代表军团规模，没有 999 上限，人数越多火力越高。主弹伤害 = 攻击强度
          × 兵力加成。理论主弹 DPS
          包含攻速和平均暴击收益，实际输出还受命中率、副弹、穿透、爆裂和技能影响。
          多数攻击在扣生命时也损失兵力，护盾完全吸收或章节压力不损兵。
          千人以上获得军阵护佑，军势越盛，生命受到的伤害越少；收益逐渐放缓，最高额外减伤40%，与装备护甲分别抵御剩余伤害。
          青辉、紫辉与金辉的幸运门偶尔带来大批援军、两倍或五倍军势；门上的数字已包含符文加成。
        </p>
      </section>
      <p className="save-explanation">
        长夜远征前90关分为六轮，随后踏上登神长阶。第15、45、75关各获一枚归魂币，整局最多三枚；第45、90关点亮续战篝火。每五关的章节首领后恢复最大生命50%。异化的辨认与应对可在教程中查看。
        进度仅保存在当前浏览器，关卡间自动存档；战斗中刷新会回到该房间前的存档。左上角「角色」可查看装备、构筑与路线，或切换音效；查看时暂停战斗。
      </p>
    </div>
  );
}
