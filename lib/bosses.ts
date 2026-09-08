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
    hint: '留意依次落下的斧痕 · 躲开回旋飞斧',
    color: '#cbb39a',
    description:
      '挥出五向飞斧，半血后追加追斧。处刑巡礼沿三条道路依次落下，回旋斧从侧翼返回。',
    kind: 'elite',
  },
  {
    id: 'commander',
    name: '黑甲统领',
    title: '铁誓军团的锋刃',
    portrait: '/art/boss-commander.webp',
    quote: '军令所至，寸土不让。',
    hint: '清除弓手援军 · 正面举盾时绕向侧翼',
    color: '#c9bb98',
    description:
      '以战盾格挡正面弹幕，交替散斧与重击；铁誓军阵召来两名弓手，并向中央发起突刺。',
    kind: 'elite',
  },
  {
    id: 'hexblade',
    name: '咒刃骑士',
    title: '失落誓言的回声',
    portrait: '/art/elite-hexblade.webp',
    quote: '你的影子，已经背叛了你。',
    hint: '换位后重新瞄准 · 远离地面的镜影裂隙',
    color: '#c5a1ef',
    description:
      '咒刃锁定旧位置，再引爆镜像斩痕。镜界裂隙使骑士换位，留下持续灼伤的残影地带。',
    kind: 'elite',
  },
  {
    id: 'stonewarden',
    name: '石誓巨像',
    title: '古老圣殿的守门石',
    portrait: '/art/elite-stonewarden.webp',
    quote: '誓约未尽，石心不灭。',
    hint: '侧击石心护盾 · 先躲碎石，再避震心',
    color: '#b9c8bb',
    description:
      '石甲抵御正面攻击。断层之誓先封锁一侧碎石道路，再震击另一侧；预警之间保留可通行的空隙。',
    kind: 'elite',
  },
  {
    id: 'broodmother',
    name: '蛛巢主母',
    title: '深渊丝线的编织者',
    portrait: '/art/elite-broodmother.webp',
    quote: '每条路，都是我的网。',
    hint: '蛛网会减速 · 从中央毒弹缺口穿过',
    color: '#a0d0a2',
    description:
      '交错毒弹锁定来路；蛛巢围猎向两侧铺设持续蛛网，减慢横移速度并造成伤害，中央弹幕留有缺口。',
    kind: 'elite',
  },
  {
    id: 'watcher',
    name: '荆棘守望者',
    title: '沉眠誓约的最后守卫',
    portrait: '/art/boss-watcher.webp',
    quote: '此门之后，再无归途。',
    hint: '根墙会持续伤害 · 追猎印记锁定另一侧',
    color: '#b6cf9b',
    description:
      '散斧与盾击后，荆棘围城封锁半侧道路，另一侧落下追猎印记。久战触发荆棘蚀血。',
    kind: 'boss',
    act: 0,
  },
  {
    id: 'wyvern',
    name: '岚翼古龙',
    title: '暴风圣脊的灾厄',
    portrait: '/art/boss-wyvern.webp',
    quote: '让风暴，替高塔审判你。',
    hint: '躲向暴风侧翼 · 别被推入龙焰',
    color: '#9ad8e8',
    description:
      '龙息锁定旧位置，风刃交错落下。暴风推击将队长推向侧翼龙焰；困难模式与守望者同时出战。',
    kind: 'boss',
    act: 0,
  },
  {
    id: 'lich',
    name: '蚀月巫妖',
    title: '群星坟场的吟咏者',
    portrait: '/art/boss-lich.webp',
    quote: '你所仰望的光，早已死去。',
    hint: '击破两盏魂灯解除护佑 · 留意交错星雨',
    color: '#ccb9eb',
    description:
      '错位星雨留下不同空隙。巫妖召唤两盏可摧毁的魂灯，魂灯存续时受到的伤害降低45%；久战触发蚀月凋零。',
    kind: 'boss',
    act: 1,
  },
  {
    id: 'oracle',
    name: '命运先知',
    title: '破碎星盘的执掌者',
    portrait: '/art/boss-oracle.webp',
    quote: '我已看见，你尚未选择的结局。',
    hint: '离开预言裂隙 · 下一击来自镜像位置',
    color: '#eccb91',
    description:
      '预言留下持续伤害的地面裂隙，逆命回响随后攻击镜像位置。困难模式与巫妖同时出战。',
    kind: 'boss',
    act: 1,
  },
  {
    id: 'king',
    name: '灰烬之王',
    title: '余烬王座的永恒君主',
    portrait: '/art/boss-king.webp',
    quote: '王权不熄，万物皆为灰烬。',
    hint: '三阶段王权 · 穿过断界裂隙，留意换阶段焚路',
    color: '#f1bc8d',
    description:
      '生命降至70%和35%时解放王权，七重火环进化为双环，陨火依次封路，焚风从两侧交叉。终末敕令可集火打断或移入绿区。王座断界依次封路，换阶段时两侧升起火墙；王权震荡在久战后持续强化。',
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
