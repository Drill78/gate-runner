import { HEROES, gateLabel, progress, type Battle, type Entity } from './game';

// The canvas contains the live game world. All interface text and controls remain in React.
export function drawBattle(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  b: Battle,
  reducedMotion = false,
) {
  ctx.clearRect(0, 0, w, h);
  const hero = HEROES.find((x) => x.id === b.player.classId)!;
  const project = (lane: number, p: number) => ({
    x: w * (0.5 + lane * 0.255 * (0.22 + 0.78 * p)),
    y: h * (0.26 + 0.6 * Math.pow(Math.max(0, p), 1.4)),
    s: 0.24 + 0.76 * p,
  });
  const poly = (points: number[][], fill: string, stroke?: string) => {
    ctx.beginPath();
    points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  };
  const text = (
    str: string,
    x: number,
    y: number,
    size: number,
    color: string,
    weight = '400',
  ) => {
    ctx.font = `${weight} ${size}px 'Segoe UI','Microsoft YaHei',sans-serif`;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.shadowColor = '#08110c';
    ctx.shadowBlur = 5;
    ctx.fillText(str, x, y);
    ctx.shadowBlur = 0;
  };
  // Moving stone causeway and its perspective grid communicate forward travel.
  poly(
    [
      [w * 0.405, h * 0.26],
      [w * 0.595, h * 0.26],
      [w * 1.05, h],
      [w * -0.05, h],
    ],
    '#27352de8',
  );
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(w * 0.405, h * 0.26);
  ctx.lineTo(w * 0.595, h * 0.26);
  ctx.lineTo(w * 1.05, h);
  ctx.lineTo(w * -0.05, h);
  ctx.closePath();
  ctx.clip();
  for (let i = 0; i < 16; i++) {
    const p = (i / 16 + (reducedMotion ? 0 : b.time * 0.06)) % 1;
    const a = project(-1.8, p * 1.2),
      z = project(1.8, p * 1.2);
    ctx.strokeStyle = i % 2 ? '#89907a26' : '#111f1999';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(z.x, z.y);
    ctx.stroke();
  }
  for (let i = -2; i <= 2; i++) {
    const a = project(i * 0.68, 0),
      z = project(i * 0.68, 1.2);
    ctx.strokeStyle = '#9da58618';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(z.x, z.y);
    ctx.stroke();
  }
  ctx.restore();
  for (const side of [-1, 1]) {
    const a = project(side * 1.54, 0),
      z = project(side * 1.54, 1.23);
    ctx.strokeStyle = '#a7a78452';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(z.x, z.y);
    ctx.stroke();
  }
  const player = project(b.visualLane, 1);
  const shadow = ctx.createRadialGradient(
    player.x,
    player.y,
    1,
    player.x,
    player.y,
    85,
  );
  shadow.addColorStop(0, `${hero.color}30`);
  shadow.addColorStop(1, `${hero.color}00`);
  ctx.fillStyle = shadow;
  ctx.fillRect(player.x - 85, player.y - 85, 170, 170);
  function bar(
    x: number,
    y: number,
    width: number,
    value: number,
    color: string,
  ) {
    ctx.fillStyle = '#09120fdd';
    ctx.fillRect(x - width / 2, y, width, 5);
    ctx.fillStyle = color;
    ctx.fillRect(x - width / 2, y, width * Math.max(0, value), 5);
  }
  function unit(
    x: number,
    y: number,
    s: number,
    color: string,
    enemy = false,
    leader = false,
    index = 0,
  ) {
    const stride = reducedMotion ? 0 : Math.sin(b.time * 12 + index) * 2 * s;
    ctx.fillStyle = '#0006';
    ctx.beginPath();
    ctx.ellipse(x, y + 7 * s, 9 * s, 3 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = enemy ? '#625b48' : '#8b917b';
    ctx.lineWidth = 3 * s;
    ctx.beginPath();
    ctx.moveTo(x - 3 * s, y - 4 * s);
    ctx.lineTo(x - 4 * s, y + 5 * s + stride);
    ctx.moveTo(x + 3 * s, y - 4 * s);
    ctx.lineTo(x + 4 * s, y + 5 * s - stride);
    ctx.stroke();
    poly(
      [
        [x - 6 * s, y - 19 * s],
        [x + 6 * s, y - 19 * s],
        [x + 8 * s, y - 2 * s],
        [x - 8 * s, y - 2 * s],
      ],
      enemy ? '#5b6151' : color,
    );
    ctx.fillStyle = enemy ? '#dfd6b9' : '#b6bbaf';
    ctx.beginPath();
    ctx.arc(x, y - 24 * s, 5 * s, 0, Math.PI * 2);
    ctx.fill();
    if (enemy) {
      ctx.fillStyle = '#1a201c';
      ctx.fillRect(x - 3 * s, y - 25 * s, 2 * s, 2 * s);
      ctx.fillRect(x + 1 * s, y - 25 * s, 2 * s, 2 * s);
    } else {
      ctx.fillStyle = leader ? '#e3c47d' : '#424e45';
      ctx.fillRect(x - 6 * s, y - 28 * s, 12 * s, 3 * s);
      ctx.fillStyle = '#313b31';
      ctx.fillRect(x - 4 * s, y - 23 * s, 8 * s, 2 * s);
    }
    ctx.strokeStyle = '#d6d2b5';
    ctx.lineWidth = 2 * s;
    ctx.beginPath();
    ctx.moveTo(x + 9 * s, y - 6 * s);
    ctx.lineTo(x + 12 * s, y - 25 * s);
    ctx.stroke();
    if (leader || b.player.classId === 'knight') {
      poly(
        [
          [x - 12 * s, y - 17 * s],
          [x - 5 * s, y - 17 * s],
          [x - 5 * s, y - 7 * s],
          [x - 9 * s, y - 3 * s],
          [x - 13 * s, y - 8 * s],
        ],
        enemy ? '#6d6045' : '#6f806d',
        '#c2b991',
      );
    }
  }
  function gate(e: Entity, lane: number, g: NonNullable<Entity['gate']>[0]) {
    const p = progress(e, b.time),
      q = project(lane, p),
      gw = Math.min(w * 0.36, 210) * q.s,
      gh = 132 * q.s;
    const positive = g.op === '+' || g.op === '×';
    const color = !positive ? '#e8a393' : g.op === '×' ? '#a4d7ef' : '#b4e3aa';
    ctx.save();
    ctx.translate(q.x, q.y);
    ctx.shadowColor = color;
    ctx.shadowBlur = 15 * q.s;
    ctx.beginPath();
    ctx.moveTo(-gw / 2, 0);
    ctx.lineTo(-gw / 2, -gh + gw * 0.25);
    ctx.quadraticCurveTo(-gw / 2, -gh, 0, -gh - 8 * q.s);
    ctx.quadraticCurveTo(gw / 2, -gh, gw / 2, -gh + gw * 0.25);
    ctx.lineTo(gw / 2, 0);
    ctx.closePath();
    const gradient = ctx.createLinearGradient(0, -gh, 0, 0);
    gradient.addColorStop(0, positive ? '#477e728e' : '#a454488e');
    gradient.addColorStop(1, positive ? '#264e44d9' : '#592f29d9');
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2 * q.s;
    ctx.stroke();
    ctx.shadowBlur = 0;
    text(gateLabel(g), 0, -gh * 0.33, Math.max(23, 48 * q.s), color, '600');
    if (q.s > 0.45)
      text(
        positive ? (g.op === '×' ? '回响之门' : '援军之门') : '诅咒之门',
        0,
        -gh * 0.76,
        Math.max(11, 13 * q.s),
        color,
      );
    ctx.restore();
  }
  function entity(e: Entity) {
    const p = progress(e, b.time);
    if (p < 0 || e.done) return;
    const q = project(e.lane, p);
    if (e.kind === 'gate') {
      gate(e, -1, e.gate![0]);
      gate(e, 1, e.gate![1]);
      return;
    }
    if (e.kind === 'hazard') {
      for (let i = 0; i < 5; i++) {
        const x = q.x + (i - 2) * 15 * q.s;
        poly(
          [
            [x - 7 * q.s, q.y],
            [x, q.y - 25 * q.s],
            [x + 7 * q.s, q.y],
          ],
          '#8c8270',
          '#c8af80',
        );
      }
      text('避开陷阱', q.x, q.y - 35 * q.s, 12, '#e6b394');
      return;
    }
    if (e.kind === 'chest') {
      const ww = 63 * q.s,
        hh = 44 * q.s;
      ctx.save();
      ctx.shadowColor = '#e5ad4e';
      ctx.shadowBlur = 13 * q.s;
      ctx.fillStyle = '#735036';
      ctx.strokeStyle = '#d8b36b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(q.x - ww / 2, q.y - hh, ww, hh, [9 * q.s, 9 * q.s, 2, 2]);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#b39655';
      ctx.fillRect(q.x - ww / 2, q.y - hh * 0.48, ww, 4 * q.s);
      ctx.fillRect(q.x - ww * 0.3, q.y - hh, 4 * q.s, hh);
      ctx.fillRect(q.x + ww * 0.25, q.y - hh, 4 * q.s, hh);
      ctx.fillStyle = '#efd28c';
      ctx.fillRect(q.x - 4 * q.s, q.y - hh * 0.58, 8 * q.s, 12 * q.s);
      ctx.restore();
      bar(q.x, q.y - hh - 13, ww, e.hp / e.maxHp, '#d1b06b');
      if (q.s > 0.45)
        text(
          `${e.name} · ${Math.ceil(e.hp)}`,
          q.x,
          q.y - hh - 23,
          12,
          '#f0d295',
        );
    } else {
      const size = q.s * (e.boss ? 2.7 : 1.8);
      unit(q.x, q.y, size, '#aeac91', true);
      if (e.boss) {
        ctx.strokeStyle = '#d3b071';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(q.x - 12 * size, q.y - 29 * size);
        ctx.lineTo(q.x - 8 * size, q.y - 39 * size);
        ctx.lineTo(q.x, q.y - 33 * size);
        ctx.lineTo(q.x + 8 * size, q.y - 39 * size);
        ctx.lineTo(q.x + 12 * size, q.y - 29 * size);
        ctx.stroke();
      }
      const width = (e.boss ? 145 : 90) * q.s;
      bar(
        q.x,
        q.y - (e.boss ? 113 : 70) * q.s,
        width,
        e.hp / e.maxHp,
        e.boss ? '#c98069' : '#be9674',
      );
      text(
        `${e.name} · ${Math.ceil(e.hp)}`,
        q.x,
        q.y - (e.boss ? 123 : 80) * q.s,
        Math.max(11, 14 * q.s),
        '#eccead',
      );
      if (e.burnUntil > b.time) {
        ctx.fillStyle = '#e7a45c88';
        ctx.beginPath();
        ctx.arc(q.x, q.y - 15 * q.s, 18 * q.s, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  b.entities
    .filter((e) => !e.done && e.start <= b.time)
    .sort((a, c) => progress(a, b.time) - progress(c, b.time))
    .forEach(entity);
  const count = Math.min(b.player.squad, 32),
    cols = Math.min(6, Math.ceil(Math.sqrt(count))),
    rows = Math.ceil(count / cols);
  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / cols),
      col = i % cols;
    unit(
      player.x + (col - (cols - 1) / 2) * 15,
      player.y + (row - rows / 2) * 15,
      0.7,
      hero.color,
      false,
      i === 0,
      i,
    );
  }
  unit(player.x, player.y - rows * 7 - 14, 1.05, hero.color, false, true, 99);
  if (b.shield > 0) {
    ctx.strokeStyle = '#e4c88188';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(
      player.x,
      player.y - 20,
      Math.max(42, cols * 10),
      Math.max(38, rows * 12),
      0,
      0,
      Math.PI * 2,
    );
    ctx.stroke();
  }
  const labelY = Math.min(h - 25, player.y + rows * 7 + 22);
  text(`${b.player.squad}`, player.x, labelY, 28, '#f3e8bb', '600');
  for (const effect of b.effects) {
    ctx.globalAlpha = Math.min(1, effect.life * 2);
    const x = w * (0.5 + effect.x),
      y = h * effect.y;
    if (effect.type === 'text') {
      text(
        effect.text,
        x,
        y - (1.5 - effect.life) * 18,
        effect.text.length > 8 ? 13 : 19,
        effect.color,
        '600',
      );
    } else if (effect.type === 'shot') {
      ctx.strokeStyle = effect.color;
      ctx.lineWidth = b.player.classId === 'mage' ? 4 : 2;
      ctx.shadowColor = effect.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(w * (0.5 + effect.targetX!), h * effect.targetY!);
      ctx.stroke();
      ctx.shadowBlur = 0;
    } else {
      for (let i = 0; i < 9; i++) {
        const radius = (0.7 - effect.life) * 80,
          angle = (i * Math.PI * 2) / 9;
        ctx.fillStyle = effect.color;
        ctx.fillRect(
          x + Math.cos(angle) * radius,
          y + Math.sin(angle) * radius,
          3,
          3,
        );
      }
    }
  }
  ctx.globalAlpha = 1;
  if (b.skillFlash > 0) {
    ctx.strokeStyle = hero.color;
    ctx.globalAlpha = b.skillFlash;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(player.x, player.y, (0.85 - b.skillFlash) * w, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  if (b.flash > 0) {
    ctx.fillStyle = `rgba(177,55,42,${b.flash * 0.7})`;
    ctx.fillRect(0, 0, w, h);
  }
}
