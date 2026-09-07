import { ACT_LENGTH, type Run } from './game.ts';
export interface EncounterProfile {
  id: string;
  name: string;
  title: string;
  portrait: string;
  quote: string;
  hint: string;
  color: string;
  description: string;
  kind: 'elite' | 'boss';
  act?: number;
}
export const ENCOUNTERS: EncounterProfile[] = [
  {
    id: 'executioner',
    name: '荒野刽子手',
    title: '迷雾道路的索命者',
    portrait: '/art/boss-executioner.webp',
    quote: '把你的命，留在这里。',
    hint: '穿过散斧弹隙 · 躲开斩首重击',
    color: '#cbb39a',
    description: '挥出五向飞斧，再追击停留的目标。半血后追加一轮追斧。',
    kind: 'elite',
  },
  {
    id: 'commander',
    name: '黑甲统领',
    title: '铁誓军团的锋刃',
    portrait: '/art/boss-commander.webp',
    quote: '军令所至，寸土不让。',
    hint: '正面举盾时绕向侧翼 · 留意第二轮散斧',
    color: '#c9bb98',
    description: '以战盾格挡正面弹幕，交替使用散斧和锁定重击。',
    kind: 'elite',
  },
  {
    id: 'hexblade',
    name: '咒刃骑士',
    title: '失落誓言的回声',
    portrait: '/art/elite-hexblade.webp',
    quote: '你的影子，已经背叛了你。',
    hint: '离开锁定位置 · 两道咒刃先后落下',
    color: '#c5a1ef',
    description: '咒刃锁定释放时的位置，先后引爆两道斩痕；半血后加入交错魔弹。',
    kind: 'elite',
  },
  {
    id: 'stonewarden',
    name: '石誓巨像',
    title: '古老圣殿的守门石',
    portrait: '/art/elite-stonewarden.webp',
    quote: '誓约未尽，石心不灭。',
    hint: '石心护盾时侧击 · 裂地震击留有空隙',
    color: '#b9c8bb',
    description:
      '凝聚石甲抵御正面攻击，再震裂两侧道路。地面预警之间始终留有安全区域。',
    kind: 'elite',
  },
  {
    id: 'broodmother',
    name: '蛛巢主母',
    title: '深渊丝线的编织者',
    portrait: '/art/elite-broodmother.webp',
    quote: '每条路，都是我的网。',
    hint: '穿过交错毒弹 · 避开锁定的蛛网',
    color: '#a0d0a2',
    description: '抛出交错的两轮毒弹，并以蛛网封锁队长原来的位置。',
    kind: 'elite',
  },
  {
    id: 'watcher',
    name: '荆棘守望者',
    title: '沉眠誓约的最后守卫',
    portrait: '/art/boss-watcher.webp',
    quote: '此门之后，再无归途。',
    hint: '穿过散斧弹隙 · 举盾时从侧翼攻击',
    color: '#b6cf9b',
    description:
      '守望者的散斧与盾击皆可躲避。战斗拖延后，荆棘蚀血将周期性侵蚀生命。',
    kind: 'boss',
    act: 0,
  },
  {
    id: 'wyvern',
    name: '岚翼古龙',
    title: '暴风圣脊的灾厄',
    portrait: '/art/boss-wyvern.webp',
    quote: '让风暴，替高塔审判你。',
    hint: '避开龙息落点 · 穿过风刃间隙',
    color: '#9ad8e8',
    description:
      '第一幕的轮换首领。龙息锁定旧位置，风刃交错落下；久战将遭到风暴侵蚀。',
    kind: 'boss',
    act: 0,
  },
  {
    id: 'lich',
    name: '蚀月巫妖',
    title: '群星坟场的吟咏者',
    portrait: '/art/boss-lich.webp',
    quote: '你所仰望的光，早已死去。',
    hint: '观察两批星弹 · 保持瞄准与走位',
    color: '#ccb9eb',
    description: '两轮错位星雨会留下不同空隙。蚀月凋零在宽限结束后周期性触发。',
    kind: 'boss',
    act: 1,
  },
  {
    id: 'oracle',
    name: '命运先知',
    title: '破碎星盘的执掌者',
    portrait: '/art/boss-oracle.webp',
    quote: '我已看见，你尚未选择的结局。',
    hint: '远离预言印记 · 在双重星阵之间移动',
    color: '#eccb91',
    description:
      '第二幕的轮换首领。预言锁定过去的位置，随后降下星阵弹幕；命运收束是其久战惩罚。',
    kind: 'boss',
    act: 1,
  },
  {
    id: 'king',
    name: '灰烬之王',
    title: '余烬王座的永恒君主',
    portrait: '/art/boss-king.webp',
    quote: '王权不熄，万物皆为灰烬。',
    hint: '三阶段王权 · 闪避陨火、火环与焚风',
    color: '#f1bc8d',
    description:
      '生命降至70%和35%时解放王权，七重火环进化为双环，陨火依次封路，焚风从两侧交叉。终末敕令可集火打断或移入绿区；王权震荡在久战后持续强化。',
    kind: 'boss',
    act: 2,
  },
];
export function bossProfile(
  run: Pick<Run, 'floor' | 'node' | 'seed'>,
): EncounterProfile {
  const act = Math.min(2, Math.floor(run.floor / ACT_LENGTH));
  if (run.node?.kind === 'boss') {
    const pool = ENCOUNTERS.filter((e) => e.kind === 'boss' && e.act === act);
    return pool[(run.seed >>> (act * 3)) % pool.length];
  }
  const elites = ENCOUNTERS.filter((e) => e.kind === 'elite');
  const index =
    run.floor === 0 && run.node?.kind !== 'elite'
      ? 0
      : (run.seed + run.floor * 7 + (run.node?.col || 0) * 3) % elites.length;
  const chosen = elites[index];
  return run.node?.enchanted
    ? { ...chosen, title: '禁域侵染 · ' + chosen.title, color: '#d2a3ee' }
    : chosen;
}
