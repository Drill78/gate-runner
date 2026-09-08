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
  {
    id: 'king-reborn',
    name: '灰烬之王·焚誓重生',
    title: '冠冕已碎，王誓未熄',
    portrait: '/art/boss-king-reborn.webp',
    quote: '连死亡，也休想夺走我的王座。',
    hint: '踏过熄灭的焰痕 · 击破王誓残碑 · 敕令之后仍有余震',
    color: '#ff9964',
    kind: 'boss',
    description:
      '王冠破碎后重铸第二条生命。焚誓巡礼将道路依次点燃，灰烬残碑提供护佑；敕令留有安全区，结束后产生镜像余震。双翼焚风与逆行陨火要求持续变换站位。',
  },
  {
    id: 'king-ascendant',
    name: '登神·灰烬之王',
    title: '盗取黎明之火的最后王者',
    portrait: '/art/boss-king-ascendant.webp',
    quote: '若诸神不肯垂目，我便成为那道光。',
    hint: '日冕会依次合拢 · 留意明暗圣痕 · 两次斩断王权',
    color: '#ffe5aa',
    kind: 'boss',
    description:
      '以日冕、圣枪、破晓敕令与逆光王座编织神域。首次倒下后燃尽残冠，第二条生命改换日冕顺序并追加回声圣枪；破晓敕令可打断，始终保留可达的安全区。',
  },
  {
    id: 'deity',
    name: '主神·无名的黎明',
    title: '万千远征者仰望的光',
    portrait: '/art/boss-deity.webp',
    quote: '走到这里的你，已不必向任何人证明。',
    hint: '循光而行 · 圣约限制每刻可承受的伤害 · 见证最后的黎明',
    color: '#fff5cd',
    kind: 'boss',
    description:
      '横跨天穹的主神依次施展创世光柱、星河巡礼、慈悲敕令、晨曦回响、六翼合奏与黎明归途。圣约使生命缓缓消退，保留完整演出；所有审判均有清晰预告与宽阔生路，不施加久战侵蚀。',
  },
];
export function bossProfile(
  run: Pick<Run, 'floor' | 'node' | 'seed'> & Partial<Pick<Run, 'difficulty'>>,
): EncounterProfile {
  const act = Math.min(
    2,
    Math.floor(
      (run.difficulty === 'endless' ? run.floor % 15 : run.floor) / ACT_LENGTH,
    ),
  );
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
