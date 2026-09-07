import type { Run } from './game.ts';

const CHAPTER_BOSSES = [
  {
    name: '荆棘守望者',
    title: '沉眠誓约的最后守卫',
    portrait: '/art/boss-watcher.webp',
    quote: '此门之后，再无归途。',
    hint: '穿过散斧弹隙 · 举盾时从侧翼攻击',
    color: '#b6cf9b',
  },
  {
    name: '蚀月巫妖',
    title: '群星坟场的吟咏者',
    portrait: '/art/boss-lich.webp',
    quote: '你所仰望的光，早已死去。',
    hint: '观察两批星弹 · 保持瞄准与走位',
    color: '#ccb9eb',
  },
  {
    name: '灰烬之王',
    title: '余烬王座的永恒君主',
    portrait: '/art/boss-king.webp',
    quote: '王权不熄，万物皆为灰烬。',
    hint: '躲避交叉火弹 · 集火打断末日敕令',
    color: '#f1bc8d',
  },
] as const;
const COMMANDER = {
  name: '黑甲统领',
  title: '铁誓军团的锋刃',
  portrait: '/art/boss-commander.webp',
  quote: '军令所至，寸土不让。',
  hint: '躲开锁定重击 · 半血后留意追加散斧',
  color: '#c9bb98',
};
const EXECUTIONER = {
  name: '荒野刽子手',
  title: '迷雾道路的索命者',
  portrait: '/art/boss-executioner.webp',
  quote: '把你的命，留在这里。',
  hint: '持续瞄准 · 半血后留意第二轮追斧',
  color: '#cbb39a',
};

export function bossProfile(run: Pick<Run, 'floor' | 'node'>) {
  return run.node?.kind === 'boss'
    ? CHAPTER_BOSSES[Math.min(2, Math.floor(run.floor / 4))]
    : run.node?.kind === 'elite'
      ? COMMANDER
      : EXECUTIONER;
}
