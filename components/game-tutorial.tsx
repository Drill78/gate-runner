'use client';

import { useId, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Flag } from 'lucide-react';
import './game-tutorial.css';

export interface GameTutorialProps {
  onComplete: () => void;
}

function Diagram({ label, children }: { label: string; children: ReactNode }) {
  return (
    <svg className="tutorial-diagram" viewBox="0 0 320 180" aria-label={label}>
      <title>{label}</title>
      <rect
        x="1"
        y="1"
        width="318"
        height="178"
        rx="18"
        fill="#111f1b"
        stroke="#c9aa6d35"
      />
      <path
        d="M20 44H300M20 88H300M20 132H300M68 12V168M160 12V168M252 12V168"
        stroke="#b7c6ad0b"
      />
      {children}
    </svg>
  );
}

function Squad({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      {[-16, 0, 16].map((offset) => (
        <g key={offset} transform={`translate(${offset} 15)`}>
          <rect x="-5" y="0" width="10" height="13" rx="4" fill="#698374" />
          <circle cy="-1" r="4" fill="#b4b9a0" />
        </g>
      ))}
      <path
        d="M0-12 11-3 8 12H-8L-11-3Z"
        fill="#d7b66f"
        stroke="#ffedb8"
        strokeWidth="1.5"
      />
      <path d="M0-8V7M-5-2H5" stroke="#5c4829" strokeWidth="2" />
    </g>
  );
}

function MovementDiagram() {
  return (
    <Diagram label="队伍左右自由移动，子弹沿前方直线飞行；偏离敌人的子弹继续向前。技能按钮位于场地右侧。">
      <rect
        x="102"
        y="29"
        width="29"
        height="31"
        rx="9"
        fill="#77574e"
        stroke="#d7a999"
      />
      <path
        d="m108 39 5 3m12-3-5 3M111 51H122"
        stroke="#ecd7c1"
        strokeWidth="2"
      />
      <rect x="98" y="19" width="37" height="4" rx="2" fill="#a77d70" />
      <path
        d="M160 24V15M160 55V46M160 87V78"
        stroke="#f2d89c"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path d="m155 18 5-6 5 6" fill="none" stroke="#f2d89c" strokeWidth="2" />
      <text x="186" y="49" fill="#c4d5ca" fontSize="14">
        向前发射
      </text>
      <Squad x={160} y={122} />
      <path
        d="M40 127H117M201 127H263m-216-6-7 6 7 6m209-12 7 6-7 6"
        fill="none"
        stroke="#91b9a5"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <text x="160" y="167" textAnchor="middle" fill="#e5dfc7" fontSize="14">
        拖动 / A D
      </text>
      <g transform="translate(289 91)">
        <circle r="21" fill="#4d3d24" stroke="#dab77a" strokeWidth="1.5" />
        <path d="m2-12-10 14h7l-2 10L9-3H1Z" fill="#f2d49a" />
      </g>
      <text x="288" y="129" textAnchor="middle" fill="#e7cca0" fontSize="13">
        技能
      </text>
    </Diagram>
  );
}

function GatesDiagram() {
  return (
    <Diagram label="不等宽双门示例：24 人经过加 10 的门得到 34 人，经过乘 1.28 的门向下取整得到 30 人。">
      <rect
        x="24"
        y="24"
        width="105"
        height="79"
        rx="8"
        fill="#244d3c"
        stroke="#85bd95"
        strokeWidth="2"
      />
      <rect
        x="139"
        y="24"
        width="157"
        height="79"
        rx="8"
        fill="#233c54"
        stroke="#82b6d8"
        strokeWidth="2"
      />
      <text
        x="76"
        y="65"
        textAnchor="middle"
        fill="#d8f4c4"
        fontSize="32"
        fontWeight="800"
      >
        +10
      </text>
      <text
        x="217"
        y="65"
        textAnchor="middle"
        fill="#d4e9fc"
        fontSize="32"
        fontWeight="800"
      >
        ×1.28
      </text>
      <text x="76" y="89" textAnchor="middle" fill="#b9d8b1" fontSize="14">
        34 人
      </text>
      <text x="217" y="89" textAnchor="middle" fill="#bdd7ed" fontSize="14">
        30 人
      </text>
      <path
        d="M153 142 91 115m-1 8 1-8 8 1"
        fill="none"
        stroke="#e2c27f"
        strokeWidth="2"
      />
      <Squad x={164} y={142} />
      <text
        x="235"
        y="145"
        textAnchor="middle"
        fill="#ffe4a3"
        fontSize="24"
        fontWeight="800"
      >
        24 人
      </text>
    </Diagram>
  );
}

function BuildDiagram() {
  return (
    <Diagram label="击杀获得金币和经验，升级时暂停并三选一强化，兵装秘匣提升武器。骑士的三选一示例是初始护盾、护盾增伤和过门补盾，围绕已有构筑选择。">
      <circle cx="38" cy="31" r="12" fill="#735930" stroke="#e5c985" />
      <path d="M38 24V38m-4-10h7m-7 6h7" stroke="#f8dd9d" strokeWidth="2" />
      <text x="59" y="36" fill="#e7d8b6" fontSize="14">
        金币 + 经验
      </text>
      <path
        d="M185 22H213V43H185ZM185 29H213M196 27V35H203V27"
        fill="#705134"
        stroke="#dcb67c"
        strokeWidth="1.5"
      />
      <text x="224" y="36" fill="#e7d8b6" fontSize="14">
        武器升级
      </text>
      {[
        { x: 25, title: '初始护盾', text: '稳住开场', active: false },
        { x: 122, title: '护盾增伤', text: '构筑核心', active: true },
        { x: 219, title: '过门补盾', text: '持续补充', active: false },
      ].map((card) => (
        <g key={card.title} transform={`translate(${card.x} 67)`}>
          <rect
            width="76"
            height="93"
            rx="9"
            fill={card.active ? '#3c3926' : '#202e27'}
            stroke={card.active ? '#e1be76' : '#55624d'}
            strokeWidth={card.active ? 2 : 1}
          />
          <path
            d="m38 13 13 5v12c0 9-13 15-13 15s-13-6-13-15V18Z"
            fill="none"
            stroke={card.active ? '#efd295' : '#aabca7'}
            strokeWidth="2"
          />
          {card.active ? (
            <path d="m36 21-4 10h7l-2 9 8-14h-8Z" fill="#efd295" />
          ) : (
            <path d="M38 22V36M32 29H44" stroke="#aabca7" strokeWidth="2" />
          )}
          <text
            x="38"
            y="62"
            textAnchor="middle"
            fill="#ece7d8"
            fontSize="14"
            fontWeight="600"
          >
            {card.title}
          </text>
          <text
            x="38"
            y="80"
            textAnchor="middle"
            fill={card.active ? '#d8bc80' : '#a5b4a7'}
            fontSize="12"
          >
            {card.text}
          </text>
        </g>
      ))}
    </Diagram>
  );
}

function BossDiagram() {
  return (
    <Diagram label="首领顶部显示大血条。队伍移出红色攻击预警；灰烬之王吟唱可以打断或进入绿色安全区。只有章节首领的周期全屏压力无法通过走位躲避。">
      <text x="24" y="27" fill="#e9d1be" fontSize="14" fontWeight="600">
        章节首领
      </text>
      <text x="296" y="27" textAnchor="end" fill="#d3b5a1" fontSize="13">
        持续输出
      </text>
      <rect x="24" y="35" width="272" height="10" rx="5" fill="#382821" />
      <rect x="24" y="35" width="204" height="10" rx="5" fill="#c57861" />
      <g transform="translate(160 78)">
        <path
          d="m-17-6-5-18 14 7 8-16 8 16 14-7-5 18Z"
          fill="#937345"
          stroke="#e0b578"
        />
        <path d="M-17-5H17L12 20H-12Z" fill="#59443b" stroke="#b1846c" />
        <path d="M-10 4H-3M3 4H10" stroke="#f8c993" strokeWidth="3" />
      </g>
      <path
        d="M140 104H180L204 165H116Z"
        fill="#bb605c35"
        stroke="#d88873"
        strokeWidth="1.5"
        strokeDasharray="5 4"
      />
      <path
        d="m191 132 28 0m-7-6 7 6-7 6"
        fill="none"
        stroke="#afd4ae"
        strokeWidth="2"
      />
      <rect
        x="222"
        y="107"
        width="50"
        height="58"
        rx="8"
        fill="#78b98722"
        stroke="#9acb9d"
        strokeDasharray="4 3"
      />
      <Squad x={246} y={138} />
      <text x="247" y="175" textAnchor="middle" fill="#afd4ae" fontSize="10">
        安全区
      </text>
      <circle
        cx="52"
        cy="117"
        r="23"
        fill="#46392a"
        stroke="#d4a66f"
        strokeWidth="1.5"
      />
      <path
        d="M52 102V117L62 122"
        fill="none"
        stroke="#edc48d"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <text x="52" y="159" textAnchor="middle" fill="#e2bd8e" fontSize="13">
        压力倒计时
      </text>
    </Diagram>
  );
}

function AscensionDiagram() {
  return (
    <div
      style={{
        height: 180,
        overflow: 'hidden',
        borderRadius: 16,
        position: 'relative',
        border: '1px solid #d8bb7955',
      }}
    >
      <img
        src="/art/ascension-stair.webp"
        alt="破云圣光照亮登神长阶，只有一条向上的道路"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: '50% 30%',
        }}
      />
      <span
        style={{
          position: 'absolute',
          bottom: 14,
          left: 0,
          right: 0,
          textAlign: 'center',
          color: '#fff0bc',
          textShadow: '0 2px 12px #000',
        }}
      >
        六轮长夜 · 十级长阶 · 一场告别
      </span>
    </div>
  );
}
const PAGES = [
  {
    label: '移动与射击',
    title: '横移瞄准，向前开火',
    intro: '手指决定方向，队伍会自动发射弹幕。',
    Diagram: MovementDiagram,
    points: [
      ['自由横移', '左右拖动场地；键盘按住 A / D 或 ← / →，松开即停。'],
      ['子弹不会锁定', '横移调整弹道。打空的子弹会继续向前，飞过敌人。'],
      ['技能在右侧', '点击右侧技能按钮，或按空格释放；冷却结束后可再次使用。'],
    ],
    note: '暂停菜单可开启“双击人物释放技能”，默认关闭；先练习把弹道对准敌人。',
  },
  {
    label: '选门与兵力',
    title: '先算收益，再选一道门',
    intro: '门有宽有窄，加减数值也会随兵力缩放。',
    Diagram: GatesDiagram,
    points: [
      ['看队长经过哪里', '通常一组有两门或三门，按队长中心选择，只结算一次。'],
      [
        '兵力是队伍人数',
        '人数越多，齐射火力越高；它不是生命，也不是攻击强度，武器和遗物能继续加强伤害。',
      ],
      [
        '选收益，也要看位置',
        '乘法适合扩大已有队伍，加法能补充兵力；提前移向想选的门，给下一轮射击留出位置。',
      ],
    ],
    note: '示例：24 人选 +10 得 34 人；选 ×1.28 得 30 人，乘除向下取整。',
  },
  {
    label: '奖励与构筑',
    title: '把每次奖励连成一套 build',
    intro: '清怪、开箱、选强化，让成长朝同一个方向走。',
    Diagram: BuildDiagram,
    points: [
      [
        '升级暂停，三选一强化',
        '击杀获得金币与经验。升级时自动暂停，可选职业或弹幕强化；选好后继续战斗。',
      ],
      [
        '在宝箱离开前击破',
        '兵装秘匣提升武器；补给箱给金币和兵力。金币还能在商店换强化。',
      ],
      [
        '战后选成长或补给',
        '过关奖励既有构筑强化，也可能有治疗、招募或武器升级。结合已有搭配和当前状态取舍。',
      ],
    ],
    note: '游侠可以围绕暴击，法师可以围绕法术回响；没有固定必胜配方。',
  },
  {
    label: '首领与压力',
    title: '躲过攻击，也要打得够快',
    intro: '大血条出现，真正的构筑检验开始了。',
    Diagram: BossDiagram,
    points: [
      [
        '盯住首领大血条',
        '关底精英和章节 Boss 的常规攻击都能躲避。移出红区，穿过弹隙。',
      ],
      [
        '留技能应对关键招式',
        '灰烬之王吟唱时，可集中输出或用技能打断，也可移入绿色安全区躲避。',
      ],
      [
        '久战会招来灾厄',
        '只有章节周期压力无法走位躲避：交战一段时间后，全屏伤害逐次增强，要尽快击败首领。',
      ],
    ],
    note: '输出与续航都要成长。暂停菜单里可以随时重看这份教程。',
  },
  {
    label: '长夜远征',
    title: '六轮长夜，终有尽头',
    intro: '一层五关，一轮三层。携火走过长夜，寻找云上的尽头。',
    Diagram: AscensionDiagram,
    points: [
      [
        '每轮十五关',
        '前90关共六轮，第3、6轮是难度跃升。每过五关的章节首领恢复最大生命50%，最多回满。',
      ],
      [
        '薪火与深门',
        '每章盟约可以增加生命、伤害、军势，或焚印重铸、招募首领。重铸越多，下一次转换效率越低。深门残章解锁更贵的后续禁钥。',
      ],
      [
        '归魂与篝火',
        '第15、45、75关各获得一枚归魂币，整局最多三枚；陨落时消耗一枚可满血重启该战。完成第45、90关后，可用固定构筑从第46、91关续战，史册按起点分别排行。',
      ],
    ],
    note: '归魂币不会重置关卡奖励；篝火续行会为你备好一套余火誓装，过往战利品仍留在史册。',
  },
  {
    label: '辨认异化',
    title: '看见颜色，读懂破绽',
    intro: '第三轮开始，诸王不再只有一种面貌。',
    Diagram: BossDiagram,
    points: [
      [
        '黑影与血月',
        '黯化留下延迟生效的黑影伤害区；血月出招更快，命中你后会缓慢回血，留意红色回流。',
      ],
      [
        '金身与合葬',
        '金身有强护盾和短暂无敌，等金光收敛再爆发。合葬会交替使用两种首领的技能。',
      ],
      [
        '留意战场变化',
        '首领举兵、蓄势与战场异象都藏着线索。留意血条下的状态，先看清眼前的威胁，再寻找出手机会。',
      ],
    ],
    note: '多位强敌各有独立血条。面对交错攻势，先稳住走位，再集中火力。',
  },
  {
    label: '登神长阶',
    title: '踏入云上的国度',
    intro: '第91—100关是一张没有岔路的地图。',
    Diagram: AscensionDiagram,
    points: [
      [
        '天使化',
        '白翼会挡下大部分伤害，并不断修复伤势。神光炽盛时先避其锋芒，留意血条下的护佑状态。',
      ],
      [
        '读懂预兆',
        '危险区域会在攻击落下前亮起。看清它的形状与间隙，提早横移；护佑散去时，再倾尽火力。',
      ],
      [
        '向着钟声前行',
        '石阶越高，守望者越不肯退让。让兵力、兵装与誓印一起成长，别把所有希望押在同一种力量上。',
      ],
    ],
    note: '迷雾后的故事，留给亲自走到那里的人。',
  },
] as const;

export function GameTutorial({ onComplete }: GameTutorialProps) {
  const [page, setPage] = useState(0);
  const titleId = useId();
  const content = useRef<HTMLDivElement>(null);
  const current = PAGES[page];
  const PageDiagram = current.Diagram;
  const last = page === PAGES.length - 1;

  function turn(direction: -1 | 1) {
    content.current?.scrollTo({ top: 0, behavior: 'auto' });
    setPage((value) =>
      Math.max(0, Math.min(PAGES.length - 1, value + direction)),
    );
  }

  return (
    <section className="game-tutorial" aria-labelledby={titleId}>
      <header className="tutorial-header">
        <span>
          <BookOpen size={16} aria-hidden="true" /> 冒险手册
        </span>
        <span
          className="tutorial-page-count"
          aria-label={`第 ${page + 1} 页，共 ${PAGES.length} 页`}
        >
          <b>{String(page + 1).padStart(2, '0')}</b> /{' '}
          {String(PAGES.length).padStart(2, '0')}
        </span>
        <output
          className="tutorial-status"
          aria-live="polite"
          aria-atomic="true"
        >
          {`第 ${page + 1} 页，${current.title}。${current.intro}`}
        </output>
      </header>

      <div ref={content} className="tutorial-content">
        <div className="tutorial-page" key={page}>
          <div className="tutorial-heading">
            <span className="tutorial-eyebrow">{current.label}</span>
            <h2 id={titleId}>{current.title}</h2>
            <p>{current.intro}</p>
          </div>
          <figure className="tutorial-figure">
            <PageDiagram />
          </figure>
          <ol className="tutorial-points">
            {current.points.map(([title, body], index) => (
              <li key={title}>
                <span className="tutorial-point-number" aria-hidden="true">
                  {index + 1}
                </span>
                <div>
                  <strong>{title}</strong>
                  <p>{body}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="tutorial-note">{current.note}</p>
        </div>
      </div>

      <footer className="tutorial-footer">
        <button
          type="button"
          className="tutorial-back"
          onClick={() => turn(-1)}
          disabled={page === 0}
        >
          <ArrowLeft size={17} aria-hidden="true" /> 上一页
        </button>
        <div className="tutorial-dots" aria-hidden="true">
          {PAGES.map((item, index) => (
            <span
              key={item.label}
              className={
                index === page ? 'is-current' : index < page ? 'is-read' : ''
              }
            />
          ))}
        </div>
        <button
          type="button"
          className="tutorial-next"
          onClick={last ? onComplete : () => turn(1)}
        >
          {last ? '开始冒险' : '下一页'}
          {last ? (
            <Flag size={17} aria-hidden="true" />
          ) : (
            <ArrowRight size={17} aria-hidden="true" />
          )}
        </button>
      </footer>
    </section>
  );
}
