import type { Entity } from './combat.ts';

type Point = readonly [number, number];

function plate(
  ctx: CanvasRenderingContext2D,
  points: readonly Point[],
  fill: string,
  edge = '#c8ac79',
  width = 1.3,
) {
  ctx.beginPath();
  points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.strokeStyle = edge;
  ctx.lineWidth = width;
  ctx.fill();
  ctx.stroke();
}

function line(
  ctx: CanvasRenderingContext2D,
  points: readonly Point[],
  color: string,
  width = 1.5,
) {
  ctx.beginPath();
  points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}

function shard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
  edge = color,
) {
  plate(
    ctx,
    [
      [x, y - height],
      [x + width, y],
      [x, y + height],
      [x - width, y],
    ],
    color,
    edge,
  );
}

function castPose(e: Entity, time: number, reduced: boolean) {
  const duration = Math.max(0.1, (e.castUntil || 0) - (e.castStartedAt || 0));
  const active = (e.castUntil || 0) > time;
  const progress = Math.max(
    0,
    Math.min(1, (time - (e.castStartedAt || 0)) / duration),
  );
  return {
    active,
    progress,
    lift: active ? (reduced ? 0.65 : Math.sin(progress * Math.PI)) : 0,
  };
}

function crown(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  dark: boolean,
) {
  plate(
    ctx,
    [
      [x - size, y + 5],
      [x - size - 3, y - 11],
      [x - size * 0.43, y - 3],
      [x, y - 21],
      [x + size * 0.43, y - 3],
      [x + size + 3, y - 11],
      [x + size, y + 5],
    ],
    dark ? '#332823' : '#c9a362',
    dark ? '#f6a274' : '#fff0c3',
    1.8,
  );
  line(
    ctx,
    [
      [x - size + 2, y + 1],
      [x + size - 2, y + 1],
    ],
    dark ? '#e87250' : '#fff0c3',
  );
}

function rebornKing(
  ctx: CanvasRenderingContext2D,
  e: Entity,
  time: number,
  reduced: boolean,
) {
  const pose = castPose(e, time, reduced);
  const breath = reduced ? 0 : Math.sin(time * 2.2 + e.id) * 1.8;
  const slash = pose.lift;
  // Torn mantle and rising cinders give the ash body its shape, without a floor aura.
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.scale(side, 1);
    plate(
      ctx,
      [
        [7, -25],
        [28, -31],
        [43, -14],
        [40, 18],
        [55, 47],
        [32, 36],
        [34, 51],
        [12, 41],
      ],
      '#1b1720',
      '#66505b',
    );
    for (let i = 0; i < 5; i++) {
      const flicker = reduced ? 0 : Math.sin(time * 4 + i * 1.8) * 5;
      plate(
        ctx,
        [
          [25 + i * 4, 23 - i * 8],
          [35 + i * 3, -13 - i * 7 - flicker],
          [30 + i * 2, -5 - i * 7],
          [25 + i * 3, -34 - i * 5 - flicker],
          [19 + i * 2, 17 - i * 5],
        ],
        i % 2 ? '#602626' : '#32202c',
        '#c56745',
        0.8,
      );
    }
    plate(
      ctx,
      [
        [7, 17],
        [22, 20],
        [25, 43],
        [30, 50],
        [9, 49],
      ],
      '#28252c',
      '#807176',
    );
    plate(
      ctx,
      [
        [7, 17],
        [14, 20],
        [13, 40],
        [9, 46],
      ],
      '#4d4146',
      '#655458',
    );
    ctx.restore();
  }
  ctx.save();
  ctx.translate(0, breath);
  plate(
    ctx,
    [
      [-21, -27],
      [0, -35],
      [21, -27],
      [18, 9],
      [9, 27],
      [-12, 25],
      [-20, 8],
    ],
    '#302c32',
    '#b48b78',
    2,
  );
  plate(
    ctx,
    [
      [-20, -26],
      [-4, -30],
      [-7, -8],
      [-2, 4],
      [-13, 15],
      [-18, 6],
    ],
    '#63504d',
    '#957168',
  );
  plate(
    ctx,
    [
      [4, -31],
      [19, -25],
      [15, 7],
      [8, 14],
      [3, 0],
      [8, -9],
    ],
    '#15151e',
    '#704a49',
  );
  line(
    ctx,
    [
      [0, -28],
      [-4, -15],
      [3, -6],
      [-3, 8],
      [3, 20],
    ],
    '#ffad71',
    3.2,
  );
  shard(ctx, 0, -4, 5, 12, '#f27145', '#ffe0a2');
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.scale(side, 1);
    plate(
      ctx,
      [
        [17, -25],
        [32, -30],
        [38, -18],
        [31, -9],
        [18, -13],
      ],
      '#4e4245',
      '#b9937d',
    );
    plate(
      ctx,
      [
        [25, -27],
        [26, -43],
        [34, -28],
      ],
      '#21212b',
      '#b59381',
    );
    ctx.restore();
  }
  // One heavy articulated sword arm and one claw: recognisably a ruined king.
  ctx.save();
  ctx.translate(-28, -17);
  ctx.rotate(-0.22 - slash * 0.9);
  plate(
    ctx,
    [
      [-6, -4],
      [7, 0],
      [9, 26],
      [-3, 30],
      [-9, 16],
    ],
    '#3a323a',
    '#a37b70',
  );
  line(
    ctx,
    [
      [2, 25],
      [3, -36],
    ],
    '#221e24',
    8,
  );
  plate(
    ctx,
    [
      [0, 9],
      [-8, -31],
      [-5, -59],
      [2, -66],
      [6, -48],
      [13, -40],
      [7, 10],
    ],
    '#574a4b',
    '#f2b887',
    2,
  );
  line(
    ctx,
    [
      [3, -55],
      [2, -17],
      [5, 4],
    ],
    '#ff8152',
    2,
  );
  line(
    ctx,
    [
      [-9, 14],
      [15, 12],
    ],
    '#bd8863',
    5,
  );
  ctx.restore();
  ctx.save();
  ctx.translate(28, -11 - slash * 8);
  ctx.rotate(0.22 + slash * 0.45);
  plate(
    ctx,
    [
      [-7, -3],
      [5, -2],
      [12, 19],
      [6, 31],
      [-5, 22],
    ],
    '#28252d',
    '#ab806d',
  );
  for (let i = 0; i < 3; i++)
    line(
      ctx,
      [
        [1 + i * 4, 23],
        [3 + i * 5, 34],
        [i * 5, 39],
      ],
      '#efb181',
      2.4,
    );
  ctx.restore();
  plate(
    ctx,
    [
      [-12, -51],
      [0, -57],
      [13, -49],
      [9, -29],
      [0, -24],
      [-10, -31],
    ],
    '#27232b',
    '#c49977',
    1.8,
  );
  plate(
    ctx,
    [
      [-11, -48],
      [-2, -53],
      [-4, -35],
      [0, -27],
      [-9, -32],
    ],
    '#65504b',
    '#87665d',
  );
  line(
    ctx,
    [
      [-9, -42],
      [-2, -39],
    ],
    '#ffb56f',
    2.2,
  );
  line(
    ctx,
    [
      [3, -39],
      [9, -43],
    ],
    '#ffb56f',
    2.2,
  );
  crown(ctx, 0, -55, 15, true);
  ctx.restore();
  for (let i = 0; i < 7; i++) {
    const p = reduced ? 0.5 : (time * 0.32 + i * 0.137) % 1;
    ctx.globalAlpha = 0.65 * (1 - p);
    shard(
      ctx,
      Math.sin(i * 2.3) * (30 + p * 15),
      17 - p * 96,
      1.4,
      3,
      '#fdb174',
    );
  }
  ctx.globalAlpha = 1;
}

function ascendantKing(
  ctx: CanvasRenderingContext2D,
  e: Entity,
  time: number,
  reduced: boolean,
) {
  const eclipse = e.ascendantForm === 'eclipse' || (e.life || 1) >= 2;
  const pose = castPose(e, time, reduced);
  const drift = reduced ? 0 : Math.sin(time * 1.8) * 2;
  const gold = eclipse ? '#d89489' : '#ddbf80';
  const light = eclipse ? '#ffb0a1' : '#fff5d2';
  const armor = eclipse ? '#25232f' : '#dfd5bc';
  ctx.save();
  ctx.translate(0, drift);
  // Solar feather blades become a jagged, asymmetric black reliquary on revival.
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.scale(side, 1);
    for (let i = 3; i >= 0; i--) {
      const bend =
        (reduced ? 0 : Math.sin(time * 2 + i * 0.45)) * 2 + pose.lift * 5;
      const root: Point = [12, -16 + i * 8];
      const tip: Point = [
        eclipse ? 69 - i * 9 : 73 - i * 8,
        -67 + i * 25 - bend,
      ];
      plate(
        ctx,
        [
          root,
          [34 + i * 3, -33 + i * 13],
          tip,
          [tip[0] - 9, tip[1] + 21],
          [27, 3 + i * 7],
        ],
        eclipse
          ? i % 2
            ? '#211c2b'
            : '#51434d'
          : i % 2
            ? '#b9b8b1'
            : '#eee4c7',
        gold,
        1.4,
      );
      line(
        ctx,
        [root, [34, -12 + i * 10], tip],
        eclipse ? '#e47974' : '#fff6d8',
        1,
      );
      if (eclipse)
        shard(ctx, tip[0] + 4, tip[1] - 10 - bend, 3, 7, '#642933', '#ffc0a4');
    }
    plate(
      ctx,
      [
        [4, 15],
        [19, 10],
        [24, 50],
        [12, 69],
        [6, 48],
      ],
      eclipse ? '#322535' : '#b8ad9b',
      gold,
    );
    line(
      ctx,
      [
        [12, 22],
        [15, 53],
      ],
      light,
    );
    ctx.restore();
  }
  plate(
    ctx,
    [
      [-19, -28],
      [0, -36],
      [19, -28],
      [17, 10],
      [0, 29],
      [-17, 10],
    ],
    armor,
    gold,
    2,
  );
  plate(
    ctx,
    [
      [0, -33],
      [15, -25],
      [10, 6],
      [0, 22],
    ],
    eclipse ? '#141420' : '#f9edd4',
    gold,
  );
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.scale(side, 1);
    for (let i = 0; i < 4; i++)
      line(
        ctx,
        [
          [3, -17 + i * 8],
          [15 - i, -24 + i * 9],
        ],
        eclipse ? '#d1b3b1' : '#aa8f61',
        eclipse ? 2.8 : 1.3,
      );
    plate(
      ctx,
      [
        [14, -27],
        [27, -36],
        [35, -26],
        [28, -13],
        [16, -16],
      ],
      eclipse ? '#433342' : '#c2b496',
      light,
    );
    ctx.save();
    ctx.translate(28, -19);
    ctx.rotate(side * 0.08 + pose.lift * (eclipse ? -0.5 : 0.4));
    plate(
      ctx,
      [
        [-6, -4],
        [5, -3],
        [9, 23],
        [1, 28],
        [-5, 18],
      ],
      armor,
      gold,
    );
    if (side === 1 || eclipse) {
      line(
        ctx,
        [
          [7, 36],
          [7, -55],
        ],
        gold,
        4,
      );
      plate(
        ctx,
        [
          [7, -78],
          [eclipse ? 19 : 14, -52],
          [7, -38],
          [0, -53],
        ],
        eclipse ? '#442832' : '#fff0ce',
        light,
        1.6,
      );
      line(
        ctx,
        [
          [-4, -37],
          [18, -37],
        ],
        gold,
        3,
      );
    } else shard(ctx, 4, 33, 7, 13, '#fff6de', gold);
    ctx.restore();
    ctx.restore();
  }
  shard(
    ctx,
    0,
    -5,
    eclipse ? 7 : 4,
    eclipse ? 14 : 10,
    eclipse ? '#e85d68' : '#fff9e6',
    light,
  );
  plate(
    ctx,
    [
      [-11, -51],
      [0, -60],
      [11, -51],
      [9, -30],
      [0, -25],
      [-9, -30],
    ],
    eclipse ? '#231b29' : '#f1e6cb',
    gold,
    1.7,
  );
  if (eclipse) {
    line(
      ctx,
      [
        [-7, -45],
        [-2, -41],
        [-5, -34],
      ],
      '#ff777f',
      2,
    );
    line(
      ctx,
      [
        [7, -45],
        [2, -41],
        [5, -34],
      ],
      '#ff777f',
      2,
    );
    line(
      ctx,
      [
        [0, -50],
        [0, -29],
      ],
      '#846478',
    );
    for (const [x, y, angle] of [
      [-20, -65, -0.45],
      [0, -78, 0.1],
      [22, -63, 0.48],
    ]) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      plate(
        ctx,
        [
          [-5, 4],
          [-7, -8],
          [0, -18],
          [6, -7],
          [5, 4],
        ],
        '#55404c',
        '#ffc0a0',
      );
      ctx.restore();
    }
  } else {
    line(
      ctx,
      [
        [-7, -43],
        [-2, -41],
      ],
      '#8b6a46',
      1.6,
    );
    line(
      ctx,
      [
        [2, -41],
        [7, -43],
      ],
      '#8b6a46',
      1.6,
    );
    crown(ctx, 0, -58, 15, false);
    for (const side of [-1, 1])
      line(
        ctx,
        [
          [side * 12, -59],
          [side * 18, -79],
          [side * 8, -68],
        ],
        '#fff0bb',
        2,
      );
  }
  ctx.restore();
}

function deityCast(
  ctx: CanvasRenderingContext2D,
  name: string,
  half: number,
  progress: number,
  reduced: boolean,
) {
  // These emblems sit at the god's hands above the play lanes. They never mark ground.
  const reach = half * 0.69;
  const shimmer = reduced ? 0 : Math.sin(progress * Math.PI * 2) * 4;
  const gold = '#ffe9ae';
  ctx.save();
  ctx.globalAlpha = 0.68;
  if (name === '万象之弦') {
    for (let i = 0; i < 7; i++) {
      ctx.beginPath();
      ctx.moveTo(-reach, -47 + i * 3);
      ctx.bezierCurveTo(
        -half * 0.22,
        -78 + i * 6 + shimmer,
        half * 0.22,
        -22 - i * 6 - shimmer,
        reach,
        -47 + i * 3,
      );
      ctx.strokeStyle = i % 2 ? '#b5dbea' : gold;
      ctx.lineWidth = i === 3 ? 2.1 : 0.8;
      ctx.stroke();
    }
  } else if (name === '天平圣约') {
    const tilt = reduced ? 0.05 : (progress - 0.5) * 0.14;
    ctx.save();
    ctx.translate(0, -96);
    ctx.rotate(tilt);
    line(
      ctx,
      [
        [-reach * 0.77, 0],
        [0, -9],
        [reach * 0.77, 0],
      ],
      gold,
      2.4,
    );
    for (const side of [-1, 1]) {
      const x = side * reach * 0.7;
      line(
        ctx,
        [
          [x, 0],
          [x - 18, 26],
          [x + 18, 26],
          [x, 0],
        ],
        '#f3d391',
      );
      plate(
        ctx,
        [
          [x - 20, 26],
          [x + 20, 26],
          [x + 11, 34],
          [x - 11, 34],
        ],
        '#665339',
        gold,
      );
    }
    ctx.restore();
  } else if (name === '逐星织路' || name === '星河巡礼') {
    const points: Point[] = Array.from({ length: 7 }, (_, i) => [
      -reach + (i * reach) / 3,
      -88 - Math.sin(i * 1.5) * 18,
    ]);
    line(ctx, points, '#b9d7e4', 1);
    for (let i = 0; i < points.length; i++) {
      const [x, y] = points[i];
      shard(ctx, x, y, 2.5, i / 7 < progress ? 8 : 4, '#fff6d5');
    }
  } else if (name === '寂静钟鸣') {
    ctx.save();
    ctx.translate(0, -102);
    ctx.rotate(reduced ? 0 : Math.sin(progress * Math.PI * 4) * 0.08);
    plate(
      ctx,
      [
        [-16, -22],
        [0, -28],
        [16, -22],
        [20, -4],
        [29, 7],
        [-29, 7],
        [-20, -4],
      ],
      '#806647',
      gold,
      2,
    );
    line(
      ctx,
      [
        [0, -16],
        [0, 12],
      ],
      '#ffe6a6',
      3,
    );
    shard(ctx, 0, 14, 5, 5, '#fff4d3');
    ctx.restore();
    for (const side of [-1, 1])
      for (let i = 0; i < 3; i++) {
        const x = side * (39 + i * 12 + progress * 12);
        line(
          ctx,
          [
            [x, -129 + i * 3],
            [x + side * 5, -120],
            [x, -111 - i * 3],
          ],
          '#eddba9',
          1,
        );
      }
  } else if (name === '破雾终曲') {
    for (const side of [-1, 1]) {
      for (let i = 0; i < 6; i++) {
        const x = side * (half * 0.3 + i * 10);
        line(
          ctx,
          [
            [side * 12, -66],
            [x, -112 - i * 4 - shimmer],
          ],
          i % 2 ? '#d6e9ef' : gold,
          1.4,
        );
      }
      plate(
        ctx,
        [
          [side * reach, -46],
          [side * (reach + 15), -71],
          [side * (reach + 8), -42],
          [side * (reach + 17), -26],
        ],
        '#e0d7bb',
        gold,
      );
    }
  } else if (name === '慈悲敕令' || name === '创世光柱') {
    for (const side of [-1, 1])
      line(
        ctx,
        [
          [side * 15, -70],
          [side * reach, -102],
          [side * reach, -79],
        ],
        gold,
        2,
      );
  } else if (name === '六翼合奏') {
    for (let i = 0; i < 5; i++)
      shard(ctx, (i - 2) * 24, -109 + Math.abs(i - 2) * 6, 2.5, 10, gold);
  } else {
    for (const side of [-1, 1]) {
      line(
        ctx,
        [
          [side * 31, -83],
          [side * reach * 0.75, -100],
          [side * reach, -84],
        ],
        gold,
      );
      shard(ctx, side * reach, -84, 4, 9, '#fff3cf');
    }
  }
  ctx.restore();
}

function deity(
  ctx: CanvasRenderingContext2D,
  e: Entity,
  time: number,
  reduced: boolean,
  half: number,
) {
  const pose = castPose(e, time, reduced);
  const breath = reduced ? 0 : Math.sin(time * 1.4) * 2;
  const gold = '#d5b678',
    light = '#fff0c9';
  const name = pose.active ? e.castName || '' : '';
  // Six independently articulated wings. Tips span 94% of the viewport.
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.scale(side, 1);
    for (let tier = 2; tier >= 0; tier--) {
      const wingBeat = reduced ? 0 : Math.sin(time * 1.3 + tier * 0.55) * 4;
      const rootY = -36 + tier * 21;
      const tipY = -77 + tier * 51 - wingBeat - pose.lift * (10 - tier * 3);
      const span = half * (1 - tier * 0.055);
      plate(
        ctx,
        [
          [22, rootY],
          [span * 0.54, rootY - 29],
          [span, tipY],
          [span * 0.82, tipY + 24],
          [span * 0.53, rootY + 20],
          [27, rootY + 14],
        ],
        tier % 2 ? '#6b716f' : '#a6a9a0',
        '#b9b9a1',
        1.2,
      );
      for (let feather = 0; feather < 7; feather++) {
        const f = feather / 7;
        const rootX = 26 + f * span * 0.45;
        const root = rootY - 12 + f * 6;
        const tipX = span * (0.44 + f * 0.54);
        const tip = rootY + 45 - f * (rootY + 45 - tipY);
        plate(
          ctx,
          [
            [rootX, root],
            [tipX, tip - 10],
            [tipX - 6, tip + 5],
            [rootX + 4, root + 13],
          ],
          feather % 2 ? '#d4d1bc' : '#eeead4',
          gold,
          0.8,
        );
        line(
          ctx,
          [
            [rootX + 4, root + 5],
            [tipX - 5, tip - 2],
          ],
          '#b1a27d',
          0.7,
        );
      }
    }
    ctx.restore();
  }
  // Lower robes anchor the immense body; heavy folds suggest carved stone volume.
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.scale(side, 1);
    plate(
      ctx,
      [
        [3, 4],
        [30, 0],
        [43, 58],
        [half * 0.37, 84],
        [31, 79],
        [15, 96],
        [0, 86],
      ],
      '#666e70',
      gold,
    );
    plate(
      ctx,
      [
        [8, 10],
        [23, 9],
        [25, 53],
        [41, 77],
        [18, 72],
      ],
      '#a7aaa0',
      '#d8c69e',
    );
    line(
      ctx,
      [
        [14, 20],
        [17, 59],
        [25, 74],
      ],
      '#efe7c9',
    );
    ctx.restore();
  }
  // Six arms change gesture with the actual cast timer, including a weighing motion.
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.scale(side, 1);
    for (let arm = 2; arm >= 0; arm--) {
      const gesture =
        name === '天平圣约'
          ? side * (pose.progress - 0.5) * 20
          : pose.lift * (arm === 2 ? -10 : 15);
      const wristX = half * (0.68 - arm * 0.1);
      const wristY = -53 + arm * 37 - gesture + breath;
      const elbowX = wristX * 0.65,
        elbowY = -15 + arm * 24 - gesture * 0.6;
      plate(
        ctx,
        [
          [24, -34 + arm * 19],
          [38, -37 + arm * 18],
          [elbowX + 4, elbowY - 9],
          [wristX + 2, wristY - 9],
          [wristX + 8, wristY + 3],
          [elbowX, elbowY + 10],
          [25, -15 + arm * 17],
        ],
        arm % 2 ? '#aab0a5' : '#d0cfb8',
        gold,
        1.6,
      );
      line(
        ctx,
        [
          [37, -27 + arm * 18],
          [elbowX, elbowY],
          [wristX, wristY],
        ],
        light,
        1.3,
      );
      plate(
        ctx,
        [
          [wristX - 5, wristY - 8],
          [wristX + 8, wristY - 14],
          [wristX + 17, wristY - 8],
          [wristX + 12, wristY + 7],
          [wristX, wristY + 8],
        ],
        '#e8e2c6',
        light,
      );
      for (let finger = 0; finger < 3; finger++)
        line(
          ctx,
          [
            [wristX + 7 + finger * 3, wristY - 5],
            [wristX + 11 + finger * 4, wristY - 18 - finger * 2],
          ],
          '#f0dfb3',
          2.2,
        );
      line(
        ctx,
        [
          [elbowX - 6, elbowY - 6],
          [elbowX + 7, elbowY + 6],
        ],
        '#a17e4d',
        3,
      );
    }
    ctx.restore();
  }
  ctx.save();
  ctx.translate(0, breath);
  plate(
    ctx,
    [
      [-30, -47],
      [0, -57],
      [30, -47],
      [27, 11],
      [0, 42],
      [-27, 11],
    ],
    '#a8b0a9',
    gold,
    2,
  );
  plate(
    ctx,
    [
      [0, -54],
      [23, -44],
      [19, 6],
      [0, 34],
    ],
    '#e6e3cc',
    light,
  );
  plate(
    ctx,
    [
      [-28, -41],
      [-6, -44],
      [-5, 7],
      [-17, 17],
      [-25, 6],
    ],
    '#727f7e',
    '#c0baa0',
  );
  for (const side of [-1, 1])
    for (let rib = 0; rib < 4; rib++) {
      line(
        ctx,
        [
          [side * 5, -28 + rib * 12],
          [side * 22, -35 + rib * 12],
        ],
        '#a38853',
        2,
      );
    }
  shard(ctx, 0, -4, 9, 21, '#fff7d8', '#d4a85f');
  shard(ctx, 0, -5, 3, 10, '#91bfc7', '#d1ebdf');
  plate(
    ctx,
    [
      [-16, -78],
      [0, -92],
      [16, -78],
      [13, -49],
      [0, -39],
      [-13, -49],
    ],
    '#e7e3cc',
    gold,
    2,
  );
  plate(
    ctx,
    [
      [-15, -76],
      [-3, -86],
      [-4, -54],
      [0, -43],
      [-12, -51],
    ],
    '#9da99f',
    '#c3c5ad',
  );
  line(
    ctx,
    [
      [-11, -66],
      [-4, -62],
    ],
    '#6a6956',
    2.4,
  );
  line(
    ctx,
    [
      [4, -62],
      [11, -66],
    ],
    '#6a6956',
    2.4,
  );
  line(
    ctx,
    [
      [0, -69],
      [-2, -54],
      [3, -54],
    ],
    '#ae9663',
  );
  line(
    ctx,
    [
      [-4, -48],
      [4, -48],
    ],
    '#aa895e',
  );
  crown(ctx, 0, -91, 22, false);
  for (const side of [-1, 1]) {
    plate(
      ctx,
      [
        [side * 9, -92],
        [side * 19, -122],
        [side * 23, -142],
        [side * 28, -118],
        [side * 20, -92],
      ],
      '#bda574',
      light,
    );
    line(
      ctx,
      [
        [side * 29, -89],
        [side * 45, -113],
        [side * 56, -119],
      ],
      gold,
      2,
    );
    shard(ctx, side * 56, -119, 3, 10, '#f7e7b7');
  }
  ctx.restore();
  if (name) deityCast(ctx, name, half, pose.progress, reduced);
}

/** Draw in boss-local coordinates after the shared battlefield scale transform. */
export function drawAscensionBoss(
  ctx: CanvasRenderingContext2D,
  e: Entity,
  time: number,
  reducedMotion: boolean,
  viewportWidth: number,
  scale: number,
) {
  if (!['king-reborn', 'king-ascendant', 'deity'].includes(e.encounterId || ''))
    return false;
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  if (e.encounterId === 'king-reborn') rebornKing(ctx, e, time, reducedMotion);
  else if (e.encounterId === 'king-ascendant')
    ascendantKing(ctx, e, time, reducedMotion);
  else deity(ctx, e, time, reducedMotion, (viewportWidth * 0.47) / scale);
  ctx.restore();
  return true;
}

/** Ornament is clipped inside an existing collision lane, never a second footprint. */
export function drawHolyThreat(
  ctx: CanvasRenderingContext2D,
  name: string,
  left: number,
  right: number,
  top: number,
  bottom: number,
  countdown: number,
  reducedMotion: boolean,
  eclipse = false,
) {
  if (right <= left) return;
  const center = (left + right) / 2;
  const half = (right - left) / 2;
  const progress = Math.max(0, Math.min(1, 1 - countdown / 4.5));
  const color = eclipse ? '#f89997' : '#ffe8aa';
  ctx.save();
  ctx.beginPath();
  ctx.rect(left, top, right - left, bottom - top);
  ctx.clip();
  ctx.globalAlpha = 0.32 + progress * 0.35;
  if (/圣枪|枪雨/.test(name)) {
    const y =
      top + 30 + (bottom - top - 75) * (reducedMotion ? 0.45 : progress);
    line(
      ctx,
      [
        [center, top],
        [center, y],
      ],
      color,
      Math.max(2, half * 0.1),
    );
    plate(
      ctx,
      [
        [center, y + 22],
        [center - Math.min(10, half * 0.4), y - 3],
        [center, y - 12],
        [center + Math.min(10, half * 0.4), y - 3],
      ],
      color,
      eclipse ? '#ffd7bd' : '#fff9da',
    );
  } else if (/寂静|钟鸣|余音/.test(name)) {
    for (let i = 0; i < 5; i++) {
      const y = top + ((i + 0.5) * (bottom - top)) / 5;
      line(
        ctx,
        [
          [center - half * 0.7, y - 8],
          [center, y],
          [center + half * 0.7, y - 8],
        ],
        color,
        1.6,
      );
    }
  } else if (/逐星|织路|晨曦/.test(name)) {
    line(
      ctx,
      [
        [center, top],
        [center, bottom],
      ],
      color,
      1,
    );
    for (let i = 0; i < 5; i++)
      shard(
        ctx,
        center,
        top + ((i + 0.5) * (bottom - top)) / 5,
        Math.min(6, half * 0.35),
        12,
        color,
      );
  } else if (/天平|圣约|归零/.test(name)) {
    for (let i = 0; i < 4; i++) {
      const y = top + ((i + 0.5) * (bottom - top)) / 4;
      line(
        ctx,
        [
          [center - half * 0.65, y],
          [center + half * 0.65, y],
        ],
        color,
        2,
      );
      line(
        ctx,
        [
          [center, y - 8],
          [center, y + 8],
        ],
        color,
        1,
      );
    }
  } else if (/破雾|终曲|合奏/.test(name)) {
    for (const side of [-1, 1]) {
      line(
        ctx,
        [
          [center + side * half * 0.6, top],
          [center + side * half * 0.25, bottom],
        ],
        color,
        1.5,
      );
    }
  } else {
    line(
      ctx,
      [
        [center, top],
        [center, bottom],
      ],
      color,
      Math.max(2, Math.min(6, half * 0.15)),
    );
    for (let i = 0; i < 4; i++) {
      const y = top + ((i + 0.5) * (bottom - top)) / 4;
      line(
        ctx,
        [
          [center - half * 0.42, y - 10],
          [center, y],
          [center + half * 0.42, y - 10],
        ],
        color,
        1,
      );
    }
  }
  ctx.restore();
}
