import { writeFileSync, mkdirSync } from 'node:fs';
import {
  createRun,
  createMap,
  HEROES,
  RELICS,
  SUPPLY_REWARDS,
  ELITE_FALLBACK_REWARDS,
  SHOP_ITEMS,
  eventChoices,
  troopMultiplier,
  stats,
  experience,
} from '../lib/game.ts';
import {
  ENDLESS_REWARDS,
  ENDLESS_CURVE,
  ENDLESS_ECONOMY,
  endlessEncounter,
  healthGrowth,
  depthDamage,
  depthIncome,
} from '../lib/endless.ts';
import { CHECKPOINT_PRESETS } from '../lib/presets.ts';
import { setArmy, formatArmy } from '../lib/army.ts';

const families = { all: '通用', knight: '骑士', ranger: '游侠', mage: '法师' };
const rows = [];
for (const [source, list] of [
  ['符文／升级选项', RELICS],
  ['战后补给', SUPPLY_REWARDS],
  ['耗尽后的珍藏补给', ELITE_FALLBACK_REWARDS],
  ['无尽盟约', ENDLESS_REWARDS],
])
  for (const r of list)
    rows.push({
      来源: source,
      ID: r.id,
      名称: r.name,
      职业: families[r.family],
      品质: r.rarity,
      叠加上限: source === '无尽盟约' ? '反复选择，见条件' : r.max,
      金币代价: 0,
      效果: r.desc,
      条件:
        r.id === 'square_key'
          ? '仅商店；普通/困难每局一次，无尽可解锁深门'
          : '',
    });
for (const r of SHOP_ITEMS)
  rows.push({
    来源: '商店',
    ID: r.id,
    名称: r.name,
    职业:
      r.kind === 'relic'
        ? families[RELICS.find((x) => x.id === r.relicId).family]
        : '通用',
    品质: '',
    叠加上限: '每家店同一商品一次',
    金币代价: r.cost,
    效果: r.desc,
    条件: '每店随机5件，秘钥单独陈列；职业限制与符文上限生效',
  });
const eventExamples = [];
for (const floor of [2, 7, 12, 32, 77]) {
  const found = new Map();
  for (let seed = 0; seed < 200 && found.size < 10; seed++) {
    const run = createRun('mage', seed, 'endless');
    run.floor = floor;
    run.phase = 'event';
    run.nodes = createMap(seed, Math.floor(floor / 15) * 15);
    run.node = {
      ...run.nodes.find((r) => r[0].floor === floor)[0],
      kind: 'event',
    };
    run.squad = 10000;
    run.maxHp = 400;
    run.hp = 200;
    run.gold = 1e12;
    run.weaponTier = 20;
    run.xp = 1200;
    for (const e of eventChoices(run)) found.set(e.id, e);
  }
  for (const e of found.values()) {
    eventExamples.push({
      room: floor + 1,
      layer: Math.floor(floor / 5) + 1,
      ...e,
    });
    if (floor === 12)
      rows.push({
        来源: '事件（第13关示例）',
        ID: e.id,
        名称: e.name,
        职业: e.id === 'legacy' ? '随职业变更' : '通用',
        品质: '',
        叠加上限: '每个事件选一次',
        金币代价: e.goldCost,
        效果: e.description,
        条件: `生命代价 ${e.hpCost}；数值随角色及深度变化`,
      });
  }
}
const curve = [];
for (const n of [
  10,
  12,
  100,
  1000,
  10000,
  1e6,
  1e8,
  1e12,
  Number.MAX_SAFE_INTEGER,
  1e16,
  1e32,
  1e64,
  1e128,
  1e256,
]) {
  const base = troopMultiplier(n),
    double = troopMultiplier(n * 2),
    r = createRun('knight');
  const exponent = Math.log10(n);
  setArmy(r, { mantissa: 1, exponent: Math.floor(exponent * 2) });
  // For non-power-of-ten examples, use the mathematical log directly.
  const squared = 1 + Math.log2(1 + (n * n) / 12);
  curve.push({
    兵力: n,
    显示:
      n === Number.MAX_SAFE_INTEGER ? '旧上限≈9007.2兆' : n.toExponential(3),
    伤害倍率: base,
    兵力翻倍伤害提升百分比: (double / base - 1) * 100,
    平方后伤害倍率: Number.isFinite(squared)
      ? squared
      : 1 + (2 * exponent - Math.log10(12)) * Math.LOG2E * Math.LN10,
    平方伤害提升百分比:
      ((Number.isFinite(squared)
        ? squared
        : 1 + (2 * exponent - Math.log10(12)) * Math.LOG2E * Math.LN10) /
        base -
        1) *
      100,
  });
}
for (const exponent of [512, 1024, 32768]) {
  const r = createRun('knight');
  setArmy(r, { mantissa: 1, exponent });
  const base = troopMultiplier(r);
  setArmy(r, { mantissa: 1, exponent: exponent * 2 });
  const squared = troopMultiplier(r);
  curve.push({
    兵力: `1e${exponent}`,
    显示: `1.00×10^${exponent}`,
    伤害倍率: base,
    兵力翻倍伤害提升百分比: 100 / base,
    平方后伤害倍率: squared,
    平方伤害提升百分比: (squared / base - 1) * 100,
  });
}
const depthCurve = Array.from({ length: 100 }, (_, floor) => {
  const r = createRun('knight', 1, 'endless');
  r.floor = floor;
  return {
    关: floor + 1,
    层: Math.floor(floor / 5) + 1,
    难度档: Math.floor(floor / 15) + 1,
    敌人生命预算倍率: healthGrowth(r, 1.27),
    敌人攻击倍率: depthDamage(r),
    金币倍率: depthIncome(r),
  };
});
const table = (headers, values) =>
  `| ${headers.join(' | ')} |\n| ${headers.map(() => '---').join(' | ')} |\n` +
  values
    .map(
      (r) =>
        `| ${headers
          .map((k) =>
            String(r[k] ?? '')
              .replaceAll('|', '／')
              .replaceAll('\n', ' '),
          )
          .join(' | ')} |`,
    )
    .join('\n');
const csv = (values) => {
  const headers = Object.keys(values[0]);
  return (
    '\uFEFF' +
    [headers, ...values.map((r) => headers.map((k) => r[k]))]
      .map((row) =>
        row
          .map((v) => '"' + String(v ?? '').replaceAll('"', '""') + '"')
          .join(','),
      )
      .join('\n')
  );
};
mkdirSync('docs/balance', { recursive: true });
mkdirSync('artifacts', { recursive: true });
const notes = `# 灰烬之门 1.2 数值调试册

本表由当前游戏代码生成。层按章节首领计：1层＝5关，3层＝15关。重新生成：\`node scripts/export-balance.mjs\`。所有表格都是实际配置或明确注明角色条件的计算示例，不是固定掉落承诺。

## 兵力如何变成伤害

兵力伤害倍率 **M(N)＝1＋log₂(1＋N／12)**。单枚主弹伤害＝角色基础伤害 × 等级成长 × 武器成长 × 通用伤害符文 × 重击/弹体符文 × 盾击 × 职业协同 × 无尽薪火 × M(N) × 无尽军势。基础期望秒伤再乘攻击频率与平均暴击收益；副弹、穿透、爆裂、灼烧、主动技能和命中率另算。

这是一条对数曲线。高兵力下，兵力翻倍只让 M 增加约1；平方让 M 约翻倍。\`万军回声\`将整个兵力贡献乘1.3，和兵力本身×1.3的收益不同。旧上限约9007兆时 M≈50.4；提高上限后，同样的平方仍会增加实际伤害。

新兵力以约15位有效数字的尾数与整数指数保存，可超过 \`10^308\`。平方、开方、比例削减、法师增兵、门数字、存档、战绩显示和排序均使用该形式。底层指数上限为9,007,199,254,740,991；\`squad\`数值字段的1e300只作兼容投影，不是兵力上限。低兵力按整数结算，法师主动增兵向上取整。远小于当前军团15位精度的固定招募数不再改变有效显示。

${table(
  [
    '显示',
    '伤害倍率',
    '兵力翻倍伤害提升百分比',
    '平方后伤害倍率',
    '平方伤害提升百分比',
  ],
  curve.map((r) =>
    Object.fromEntries(
      Object.entries(r).map(([k, v]) => [
        k,
        typeof v === 'number' ? Number(v.toFixed(4)) : v,
      ]),
    ),
  ),
)}

## 三职业与基础成长

${table(
  ['职业', '初始生命', '初始兵力', '主动技能', '被动'],
  HEROES.map((h) => ({
    职业: h.name,
    初始生命: h.hp,
    初始兵力: h.squad,
    主动技能: h.skill + '：' + h.skillDesc,
    被动: h.passive,
  })),
)}

- 基础伤害：骑士7.2、游侠5.9、法师8.8；基础攻频：游侠3.5次/秒，其余2.7次/秒。
- 等级上限15；每级基础伤害+2%，生命上限+6并恢复6。升下一等级需求：30＋(当前等级−1)×14＋6×max(0,当前等级−5)²。每次升级三选一强化。
- 武器：前10级每级基础伤害+10%，10级后每级+5.5%；普通/困难上限25，无尽上限10000。
- 暴击：基础伤害倍率2；超出100%暴击率的部分以1:1加入暴伤。游侠技能的100个百分点直接叠加，5秒内攻频×2。
- 职业符文累计3层激活：骑士伤害×1.15，游侠暴击率+10个百分点，法师攻速+20%。
- 护甲最多60%；护盾最多250。生命上限普通/困难1200，无尽1e12。金币、经验和一般计数仍以安全整数保存；本次大数改造针对兵力。

## 无尽难度与平方窗口

前90关共六轮，每轮15关；第3、6轮是陡升节点。首次15关采用${ENDLESS_CURVE.openingBase}^floor生命预算，并使用困难式双章节首领与复燃灰烬之王。之后每轮的起点按第15关基础预算乘轮次系数，轮内以线性方式增加${ENDLESS_CURVE.withinRoundGrowth * 100}%。91—100采用独立长阶预算，第100关侧重机制与完整演出，降低原始攻击压力。怪物类型、精英、首领、幕次、阶段和异化另有独立系数，因此实际首领血量不等于此表的统一预算。敌人不会按玩家当前兵力补涨血。

平方对高兵力提供约2倍火力；武器、军势与重铸仍可继续成长。重铸对后续转换采用递减收益，保留新契约的价值，避免反复回收普通符文产生远超敌人的指数滚雪球。优势取决于进门前兵力、构筑、命中率和操作。实际引擎对照样本另见发布审计；不能将自动驾驶完成率解释为真人胜率。

当前参数：\`${JSON.stringify(ENDLESS_CURVE)}\`。

${table(
  ['关', '层', '难度档', '敌人生命预算倍率', '敌人攻击倍率', '金币倍率'],
  depthCurve
    .filter(
      (r) =>
        r.关 === 1 || r.关 >= 91 || r.关 % 15 === 0 || (r.关 - 1) % 15 === 0,
    )
    .map((r) =>
      Object.fromEntries(
        Object.entries(r).map(([k, v]) => [k, Number(v.toFixed(3))]),
      ),
    ),
)}

## 全部选项、遗物、补给、商店与事件

事件示例统一使用：第13关、秘火法师、兵力1万、生命200/400、武器20级、累计经验1200。每次轮抽3项奇遇，另有保底路资，只能选一项。完整跨深度事件示例见JSON。

${table(['来源', 'ID', '名称', '职业', '品质', '叠加上限', '金币代价', '效果', '条件'], rows)}

## 动态奖励与出现条件

- 符文候选排除异职业、已满层与商店专属秘钥；首位优先职业，精英第二位优先非普通。抽取权重：普通1、稀有0.7、史诗0.35、传说0.12。精英三选一最终至少一件史诗/传说，耗尽后用珍藏补给兜底。
- 普通补给：药剂只在受伤时出现，武器未满级时出现，固定50人补给在兵力低于1e14时出现。全满后的史诗补给仍可反复领取其金币、治疗等部分。
- 事件：血誓/传承代价为生命上限8%（取整）；招募max(60＋幕序×60，兵力×(0.5＋幕序×0.15))；铸造max(3，武器等级×12%)级，受上限约束；生命井增加max(30＋幕序×20，最大生命×22%)，并恢复新增上限和原缺血30%。幕序0/1/2循环取本段章节，当前事件逻辑在第3层后固定为2。
- 事件金币价格：(基础价＋幕序×20)×无尽金币倍率。招募基础35，锻造/生命井40，贤者25。宝库奖励(180＋floor×24)金币，路资(70＋floor×12)金币，均再乘金币倍率。免费回礼治疗60%上限，免费薪火治疗15%并三选一。贤者给予升一级所缺经验＋当前升级需求50%。
- 无尽金币倍率=min(1e9,1.045^max(0,floor−14))，当前实现深度指数最多480。普通与困难无此倍率。所有grantGold来源使用该倍率，包括击杀、宝箱、钱币、事件与补给。
- 商店每次从18件候选中随机展示5件（候选数随职业排除变化），秘钥额外展示；同店每件一次。无尽治疗取商品基础值与最大生命35%两者中的较大值。
- 秘钥：首把666；开过上一重且读懂下一封印才出现下一把，后两档分别6666、66666，无第四把。普通/困难每局一次；无尽最多读两重残章，已读懂或已无后续商店时不再提供废的秘闻。旧存档多余残章仍保留，但不会解锁额外高价钥匙。通过试炼先经过5道红门，再选平方或其他路线。
- 无尽盟约从完成第15关后每5关提供。续燃薪火伤害×${1 + ENDLESS_ECONOMY.flameGain}。焚印要求至少18层普通符文且完成20关；伤害×[1＋焚毁层数×${ENDLESS_ECONOMY.reforgePerLayer}/(1＋此前重铸次数×${ENDLESS_ECONOMY.reforgeDiminishing})]，保留武器、HP、盟约、侍从与秘钥，返还钢刃3层、职业前三符文各1层，并恢复30%生命。此永存提升仅在本局内保留。
- 首领盟友完成20关后可选，40关后第二位；必须已击败该首领。每8秒援击一次，每位伤害为当前期望DPS×2.8。深门残章、盟友与重铸会轮换占用第三张盟约，不保证每次都出现。
- 普通敌人经验6、弓手8、盾卫10、关底精英20、章节首领45；每级研习一次。敌人金币为4/6/8（随幕），金币箱22/34/46金币并+4兵力；兵装箱+1武器等级。
- 战斗过关金币：普通28、精英55、章节首领80、禁术精英90；再加每层渡鸦钱币20，并乘无尽金币倍率。
- 营火二选一：恢复最大生命40%，或武器+1级。队伍受伤会按攻击对应比例损失兵力，完全被护盾吸收则不减兵；章节全屏压力只伤HP不减兵。
- 每击败章节首领并跨章，恢复50%最大生命，最多回满。无尽第100关正式通关，第101关为祝福尾声，不再生成后续刷榜房间。

## 复生预设与登神长阶

复生预设按固定武器、符文、兵力与攻击预算重建，既不复制旧构筑，也不读取敌人当前生命来补数值。三职业在临时技能启动前使用相同基础期望DPS预算，技能爆发、盾击与走位仍有区别。该DPS不等于实际命中伤害；侧弹、护甲、异化减伤与无敌窗口必须另计。预设参数：\`${JSON.stringify(CHECKPOINT_PRESETS)}\`。

${table(
  ['关', '战名', '阵容', '异化', '王的第二条命'],
  Array.from({ length: 100 }, (_, floor) => ({
    floor,
    encounter: endlessEncounter({ difficulty: 'endless', floor, seed: 721604 }),
  }))
    .filter((row) => row.encounter)
    .map(({ floor, encounter: e }) => ({
      关: floor + 1,
      战名: e.name,
      阵容: e.groups.map((group) => group.join('＋')).join(' → '),
      异化:
        e.mutations?.map((group) => group.join('＋')).join(' → ') ||
        e.mutation ||
        '无',
      王的第二条命: e.secondLives ? '是（仅适用王）' : '否；天使独立复活',
    })),
)}

## 调试入口

调兵力表示：lib/army.ts；基础伤害/武器/暴击/门/奖励：lib/game.ts；三职业主动与战斗：lib/combat.ts；15关周期与深层盟约：lib/endless.ts。修改后重新导出本表并运行机制测试。HTML数值查看器只用于比较，不会改动线上游戏。
`;
writeFileSync('docs/BALANCE_REFERENCE.md', notes);
writeFileSync('docs/balance/rewards.csv', csv(rows));
writeFileSync('docs/balance/troop-curve.csv', csv(curve));
writeFileSync('docs/balance/endless-curve.csv', csv(depthCurve));
writeFileSync(
  'docs/balance/catalog.json',
  JSON.stringify(
    {
      version: '1.2',
      ENDLESS_CURVE,
      ENDLESS_ECONOMY,
      CHECKPOINT_PRESETS,
      rows,
      curve,
      depthCurve,
      eventExamples,
    },
    null,
    2,
  ),
);
const data = JSON.stringify({ rows, curve, depthCurve }).replaceAll(
  '<',
  '\\u003c',
);
const html = `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>灰烬之门 · 数值调试册</title><style>
:root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;background:#101714;color:#e5e0d0;font:16px/1.7 system-ui,sans-serif}main{max-width:1200px;margin:auto;padding:40px 24px}h1,h2{font-family:serif;color:#e4c584}small,p{color:#b2b9ad}section{border-top:1px solid #44503e;margin-top:32px;padding-top:20px}.controls{display:flex;gap:20px;flex-wrap:wrap}input,select{background:#1d2922;color:#eee5ce;border:1px solid #617050;padding:10px;font:inherit}input[type=range]{width:100%}.metrics{display:flex;gap:28px;flex-wrap:wrap}.metrics b{display:block;font-size:28px;color:#e7c985}.scroll{overflow:auto;max-height:620px}table{width:100%;border-collapse:collapse;font-size:14px}th,td{text-align:left;padding:12px;border-bottom:1px solid #344032;vertical-align:top}th{position:sticky;top:0;background:#263324}td:nth-child(3){min-width:130px}td:nth-child(8){min-width:260px}svg{width:100%;height:260px;background:#152019;margin:16px 0}.note{padding:16px;background:#233020;border-left:3px solid #c6a66a}button{cursor:pointer;padding:10px 14px;background:#36472d;color:#fff0cd;border:1px solid #9c925d}a{color:#e0c584}</style>
<main><small>ASHEN GATES / BALANCE REFERENCE / 1.2</small><h1>军势、长夜与命运的馈赠</h1><p>1层＝一次章节首领＝5关；3层＝15关。前90关共六轮，91—100为登神长阶。此页面用于调试和核对，不改动游戏。</p>
<section><h2>兵力并不等于伤害</h2><p>M(N) = 1 + log₂(1 + N / 12)。拖动数量级，观察翻倍和平方分别带来多少火力。</p><div class="controls"><label>尾数 <input id="mantissa" type="number" min="1" max="9.99" step=".01" value="1"></label><label>10的指数 <input id="exp" type="number" min="0" max="32768" value="16"></label></div><input id="range" aria-label="兵力数量级" type="range" min="0" max="256" value="16"><div class="metrics"><div>当前兵力<b id="army"></b></div><div>兵力伤害倍率<b id="multi"></b></div><div>兵力翻倍的增伤<b id="double"></b></div><div>平方的增伤<b id="square"></b></div></div><svg id="plot" viewBox="0 0 1000 260" role="img" aria-label="兵力指数与伤害倍率曲线"></svg><p id="plot-note"></p><p class="note">高兵力下，平方约让这部分火力翻倍；兵力×2只使倍率增加约1。武器、符文和军势契约还会继续乘在这个倍率上。</p></section>
<section><h2>长夜每15关提高一档</h2><p>下面显示共同的生命预算，精英、首领、章节和异化另乘各自系数。敌人不会读取你的兵力来补涨血。</p><div class="scroll" id="depth"></div></section>
<section><h2>全部馈赠与商店</h2><div class="controls"><input id="search" placeholder="搜索名称、效果或ID" aria-label="搜索奖励"><select id="source" aria-label="筛选来源"><option value="">全部来源</option></select><button id="download">下载当前奖励表CSV</button></div><p id="count"></p><div class="scroll" id="rewards"></div><p>事件例子：第13关，法师，1万兵力，200/400生命，武器20级，1200经验。其他深度和角色数值见随附的完整数值册。</p></section></main><script>
const data=${data};const $=id=>document.getElementById(id);const headers=Object.keys(data.rows[0]);
function table(target,rows,keys){const t=document.createElement('table'),head=t.createTHead().insertRow();keys.forEach(k=>{const c=document.createElement('th');c.textContent=k;head.append(c)});const body=t.createTBody();rows.forEach(r=>{const tr=body.insertRow();keys.forEach(k=>{const td=tr.insertCell();td.textContent=typeof r[k]==='number'?Number(r[k].toFixed(4)):r[k]??''})});$(target).replaceChildren(t)}
function update(){let m=Math.min(9.99,Math.max(1,Number($('mantissa').value)||1)),e=Math.min(32768,Math.max(0,Math.floor(Number($('exp').value)||0))),L=e+Math.log10(m);const fn=x=>x<15?1+Math.log2(1+10**x/12):1+(x-Math.log10(12))*Math.LOG2E*Math.LN10;const a=fn(L),d=fn(L+Math.log10(2)),s=fn(L*2);$('army').textContent=m.toFixed(2)+' × 10^'+e;$('multi').textContent=a.toFixed(3)+'×';$('double').textContent='+'+((d/a-1)*100).toFixed(2)+'%';$('square').textContent='+'+((s/a-1)*100).toFixed(2)+'%';const max=Math.max(32,e*2),top=fn(max),path=Array.from({length:201},(_,i)=>{const x=i*max/200;return (i?'L':'M')+(50+i*4.5).toFixed(1)+','+(220-fn(x)/top*190).toFixed(1)}).join(' ');$('plot').innerHTML='<path d="M50,20 V220 H950" fill="none" stroke="#60725b"/><path d="'+path+'" fill="none" stroke="#ddc484" stroke-width="3"/><circle cx="'+(50+L/max*900)+'" cy="'+(220-a/top*190)+'" r="6" fill="#b8e2b5"/><text x="50" y="248" fill="#b9c5b2">10^0</text><text x="870" y="248" fill="#b9c5b2">10^'+max+'</text>';$('plot-note').textContent='横轴：兵力数量级（指数0至'+max+'）；纵轴：兵力伤害倍率（0至'+top.toFixed(1)+'）。绿点为当前兵力。'}
let filtered=data.rows;function filter(){const q=$('search').value.trim().toLowerCase(),source=$('source').value;filtered=data.rows.filter(r=>(!source||r['来源']===source)&&Object.values(r).join(' ').toLowerCase().includes(q));table('rewards',filtered,headers);$('count').textContent=filtered.length+' / '+data.rows.length+' 项'}
new Set(data.rows.map(r=>r['来源'])).forEach(s=>{const o=document.createElement('option');o.value=o.textContent=s;$('source').append(o)});$('search').oninput=$('source').onchange=filter;$('mantissa').oninput=$('exp').oninput=update;$('range').oninput=()=>{$('exp').value=$('range').value;update()};$('download').onclick=()=>{const csv='\\ufeff'+[headers,...filtered.map(r=>headers.map(k=>r[k]))].map(row=>row.map(v=>'"'+String(v??'').replaceAll('"','""')+'"').join(',')).join('\\n');const a=document.createElement('a'),url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));a.href=url;a.download='ashen-rewards.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
table('depth',data.depthCurve.filter(r=>r['关']===1||r['关']%15===0||(r['关']-1)%15===0),Object.keys(data.depthCurve[0]));filter();update();</script></html>`;
writeFileSync('artifacts/balance-lab.html', html);
writeFileSync('docs/balance/lab.html', html);
console.log(
  `Exported ${rows.length} reward rows, ${curve.length} army samples, ${depthCurve.length} rooms, ${eventExamples.length} event examples.`,
);
