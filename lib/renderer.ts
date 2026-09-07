import { HEROES, gateLabel, formatNumber } from './game.ts';
import {
  worldY,
  projectilePosition,
  type Battle,
  type Entity,
} from './combat.ts';
import { VIEW, screenX, screenY } from './view.ts';

// Orthographic world: linear coordinates and distance-independent object sizes.
export function drawBattle(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  b: Battle,
  reducedMotion = false,
) {
  const hero = HEROES.find((v) => v.id === b.player.classId)!;
  const scale = Math.max(0.86, Math.min(1.18, w / 520));
  const X = (x: number) => screenX(x, w),
    Y = (y: number) => screenY(y, h);
  const playerY = Y(0.8),
    playerX = X(b.x);
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#202a28';
  ctx.fillRect(0, 0, w, h);
  const tile = 70 * scale;
  const scrollDistance = reducedMotion
    ? 0
    : (b.time * (Y(0.9) - Y(0))) /
      (b.entities[0].arrival - b.entities[0].start);
  const scroll = scrollDistance % tile;
  const rowOffset = Math.floor(scrollDistance / tile);
  for (let row = -1; row < h / tile + 1; row++)
    for (let col = -1; col < w / tile + 1; col++) {
      const worldRow = row - rowOffset;
      const x = col * tile + (worldRow & 1 ? tile / 2 : 0),
        y = row * tile + scroll;
      ctx.fillStyle = (worldRow + col) % 3 === 0 ? '#29332f' : '#252f2c';
      ctx.fillRect(x + 1, y + 1, tile - 3, tile - 3);
      ctx.strokeStyle = '#75807017';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 3, y + 3, tile - 7, tile - 7);
    }
  ctx.fillStyle = '#111c17';
  ctx.fillRect(0, 0, w * 0.045, h);
  ctx.fillRect(w * 0.955, 0, w * 0.045, h);
  ctx.strokeStyle = '#a09f7660';
  ctx.lineWidth = 2;
  for (const x of [w * 0.045, w * 0.955]) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  const fog = ctx.createLinearGradient(0, 0, 0, h);
  fog.addColorStop(0, '#0a161a70');
  fog.addColorStop(0.15, '#0c1b1315');
  fog.addColorStop(0.75, '#10191400');
  fog.addColorStop(1, '#09120da0');
  ctx.fillStyle = fog;
  ctx.fillRect(0, 0, w, h);
  const label = (
    text: string,
    x: number,
    y: number,
    size: number,
    color: string,
    weight = '500',
  ) => {
    ctx.font = `${weight} ${size}px 'Segoe UI','Microsoft YaHei',sans-serif`;
    ctx.textAlign = 'center';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#101712ec';
    ctx.strokeText(text, x, y);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
  };
  const round = (
    x: number,
    y: number,
    ww: number,
    hh: number,
    r: number,
    fill: string,
    stroke?: string,
  ) => {
    ctx.beginPath();
    ctx.roundRect(x, y, ww, hh, r);
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  };
  const hpBar = (e: Entity, x: number, y: number, width: number) => {
    round(x - width / 2, y, width, 7, 2, '#090f0ce0');
    round(
      x - width / 2,
      y,
      Math.max(0, (width * e.hp) / e.maxHp),
      7,
      2,
      e.boss ? '#eb8968' : '#c2ba81',
    );
  };
  ctx.fillStyle = '#b0d0ad07';
  ctx.fillRect(playerX - w * 0.13, 80, w * 0.26, playerY - 80);
  ctx.setLineDash([4, 8]);
  ctx.strokeStyle = '#b2cda02c';
  ctx.lineWidth = 1;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(playerX + side * w * 0.13, playerY);
    ctx.lineTo(playerX + side * w * 0.13, 90);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  function soldier(
    x: number,
    y: number,
    color: string,
    index: number,
    leader = false,
    enemy = false,
  ) {
    const s = scale * (enemy ? (leader ? 3.0 : 1.9) : leader ? 1.5 : 1),
      step = reducedMotion ? 0 : Math.sin(b.time * 16 + index) * 1.2;
    ctx.fillStyle = '#060e0b70';
    ctx.beginPath();
    ctx.ellipse(x + 4 * s, y + 5 * s, 10 * s, 7 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    round(x - 6 * s, y + 3 * s + step, 4 * s, 7 * s, 1, '#151d19');
    round(x + 2 * s, y + 3 * s - step, 4 * s, 7 * s, 1, '#151d19');
    const armor = ctx.createRadialGradient(
      x - 3 * s,
      y - 4 * s,
      1,
      x,
      y,
      11 * s,
    );
    armor.addColorStop(0, enemy ? '#bcbaa5' : '#e1dbc0');
    armor.addColorStop(0.4, color);
    armor.addColorStop(1, '#27312c');
    ctx.fillStyle = armor;
    ctx.beginPath();
    ctx.ellipse(x, y, 9 * s, 8 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = enemy ? '#a49b83' : '#d2c59c';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = leader ? '#f0d096' : enemy ? '#a49f8b' : '#b9bdb2';
    ctx.beginPath();
    ctx.arc(x, y - 4 * s, 4.5 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#e0dcc0';
    ctx.lineWidth = 2 * s;
    ctx.beginPath();
    ctx.moveTo(x + 10 * s, y + 2 * s);
    ctx.lineTo(x + 11 * s, y - 17 * s);
    ctx.stroke();
    if (leader || (!enemy && b.player.classId === 'knight'))
      round(x - 14 * s, y - 7 * s, 7 * s, 12 * s, 2 * s, color, '#cdbb84');
  }
  function gates(e: Entity) {
    const y = Y(worldY(e, b.time));
    if (y < 40 || y > h) return;
    for (const g of e.gate!) {
      const x = X(g.left),
        right = X(g.right),
        gw = right - x,
        gh = 67 * scale;
      const pos = g.op === '+' || g.op === '×';
      const color = !pos ? '#ef9a81' : g.op === '×' ? '#9cdaed' : '#badc8e';
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = 11;
      round(
        x,
        y - gh / 2,
        gw,
        gh,
        4,
        !pos ? '#5b322fe8' : g.op === '×' ? '#254856eF' : '#354b2aeF',
        color,
      );
      ctx.shadowBlur = 0;
      ctx.fillStyle = color;
      ctx.fillRect(x, y - gh / 2, 3, gh);
      ctx.fillRect(right - 3, y - gh / 2, 3, gh);
      const font = Math.max(
        20,
        Math.min(34 * scale, gw / (gateLabel(g).length * 0.65)),
      );
      label(gateLabel(g), (x + right) / 2, y + 6 * scale, font, color, '700');
      if (gw > 65)
        label(
          pos ? (g.op === '×' ? '倍增' : '招募') : '损耗',
          (x + right) / 2,
          y - 19 * scale,
          Math.max(12, 12 * scale),
          color,
        );
      ctx.restore();
    }
  }
  function entity(e: Entity) {
    const x = X(e.x),
      y = Y(worldY(e, b.time));
    if (y < -60 || y > h + 50) return;
    if (e.kind === 'gate') {
      gates(e);
      return;
    }
    if (e.kind === 'hazard') {
      const hw = e.width * w * 0.455;
      ctx.fillStyle = '#ab735027';
      ctx.fillRect(x - hw / 2, y - 18, hw, 37);
      ctx.strokeStyle = '#dbb280';
      ctx.lineWidth = 2;
      for (let i = 0; i < 6; i++) {
        const px = x - hw / 2 + (i * hw) / 5;
        ctx.beginPath();
        ctx.moveTo(px - 5, y + 7);
        ctx.lineTo(px, y - 9);
        ctx.lineTo(px + 5, y + 7);
        ctx.stroke();
      }
      label('荆棘', x, y - 28, 13, '#f0c296');
      return;
    }
    if (e.kind === 'chest') {
      const cw = 42 * scale,
        ch = 31 * scale;
      ctx.save();
      ctx.shadowColor = '#e8b14f';
      ctx.shadowBlur = 14;
      round(x - cw / 2, y - ch / 2, cw, ch, 5, '#805936', '#ebc877');
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#d4b674';
      ctx.fillRect(x - cw / 2, y - 2, cw, 4);
      ctx.fillRect(x - 13 * scale, y - ch / 2, 4 * scale, ch);
      ctx.fillRect(x + 9 * scale, y - ch / 2, 4 * scale, ch);
      round(x - 4, y - 6, 8, 11, 1, '#f9db8b');
      ctx.restore();
      hpBar(e, x, y - 29 * scale, 65 * scale);
      label(
        e.reward === 'weapon' ? '兵装秘匣' : '补给宝箱',
        x,
        y - 39 * scale,
        Math.max(14, 14 * scale),
        '#f4d896',
        '600',
      );
      label(`${Math.ceil(e.hp)}`, x, y + 37 * scale, 13, '#e4dab7');
      return;
    }
    if (e.boss) {
      soldier(
        x,
        y,
        e.name.includes('巫妖') ? '#9282ad' : '#9f7460',
        0,
        true,
        true,
      );
      ctx.strokeStyle = '#f1c581';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, 42 * scale, 0, Math.PI * 2);
      ctx.stroke();
      hpBar(e, x, y - 66 * scale, 148 * scale);
      label(
        e.name,
        x,
        y - 80 * scale,
        Math.max(17, 18 * scale),
        '#ffe0b6',
        '700',
      );
      label(
        `${Math.ceil(e.hp)} / ${Math.ceil(e.maxHp)}`,
        x,
        y + 55 * scale,
        14,
        '#ecc8a6',
      );
    } else {
      soldier(
        x,
        y,
        e.variant === 'archer'
          ? '#868574'
          : e.variant === 'guard'
            ? '#6d8588'
            : '#9b9988',
        e.id,
        false,
        true,
      );
      hpBar(e, x, y - 40 * scale, 72 * scale);
      label(
        e.name,
        x,
        y - 53 * scale,
        Math.max(14, 14 * scale),
        '#eee4c6',
        '600',
      );
      label(
        `${Math.ceil(e.hp)}${e.armor ? ' ◈' : ''}`,
        x,
        y + 40 * scale,
        13,
        '#e0d4b3',
      );
    }
    if (e.boss) {
      const act = Math.floor(b.player.floor / 4);
      if (b.player.node?.kind === 'boss' && act === 1) {
        for (let i = 0; i < 5; i++) {
          const angle = b.time * 0.8 + (i * Math.PI * 2) / 5;
          ctx.fillStyle = '#c5b0ff';
          ctx.beginPath();
          ctx.arc(
            x + Math.cos(angle) * 42 * scale,
            y + Math.sin(angle) * 24 * scale,
            4 * scale,
            0,
            Math.PI * 2,
          );
          ctx.fill();
        }
      }
      if (e.guardUntil > b.time) {
        ctx.strokeStyle = '#ffe3a4';
        ctx.lineWidth = 7 * scale;
        ctx.beginPath();
        ctx.ellipse(x, y + 12 * scale, 42 * scale, 23 * scale, 0, 0, Math.PI);
        ctx.stroke();
        label('举盾 · 侧翼破防', x, y + 77 * scale, 13, '#ffdda3', '700');
      } else if (e.hp < e.maxHp * 0.5)
        label('Ⅱ · 狂怒形态', x, y + 75 * scale, 12, '#efab88');
    }
    if (e.burnUntil > b.time) {
      ctx.fillStyle = '#ebaf6150';
      ctx.beginPath();
      ctx.arc(x, y, 22 * scale, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  b.entities
    .filter((e) => !e.done && e.start <= b.time + VIEW.previewSeconds)
    .sort((a, z) => worldY(a, b.time) - worldY(z, b.time))
    .forEach((e) => {
      ctx.save();
      if (e.start > b.time) ctx.globalAlpha = 0.62;
      entity(e);
      ctx.restore();
    });
  ctx.setLineDash([3, 10]);
  ctx.strokeStyle = '#c5d9b323';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(X(-0.94), Y(-0.1));
  ctx.lineTo(X(0.94), Y(-0.1));
  ctx.stroke();
  ctx.setLineDash([]);
  label('射程', X(0.85), Y(-0.1) - 9, 11, '#a8bdaa');
  for (const p of b.projectiles) {
    if (b.time < p.spawnAt - 0.4) continue;
    const pos = projectilePosition(p, b.time),
      x = X(pos.x),
      y = Y(pos.y);
    if (y > h + 25 || y < -25) continue;
    const color =
      p.kind === 'star'
        ? '#d1b5ff'
        : p.kind === 'ember'
          ? '#ffb47f'
          : '#e7d4a2';
    ctx.save();
    ctx.globalAlpha = p.resolved ? 0.4 : 1;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    if (b.time < p.spawnAt) {
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, 12 + (p.spawnAt - b.time) * 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      continue;
    }
    const previous = projectilePosition(p, b.time - 0.12);
    ctx.lineWidth = 3;
    ctx.globalAlpha *= 0.5;
    ctx.beginPath();
    ctx.moveTo(X(previous.x), Y(previous.y));
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.globalAlpha = p.resolved ? 0.35 : 1;
    const radius = Math.max(5, p.radius * w * 0.455);
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;
    if (p.kind === 'star') {
      ctx.translate(x, y);
      ctx.rotate(b.time * 2 + p.phase);
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4,
          r = i % 2 ? radius * 0.4 : radius;
        const px = Math.cos(a) * r,
          py = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
    } else if (p.kind === 'axe') {
      ctx.translate(x, y);
      ctx.rotate(b.time * 8);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-radius, 0);
      ctx.lineTo(radius, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(radius * 0.55, 0, radius * 0.72, -Math.PI / 2, Math.PI / 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  for (const threat of b.threats) {
    const left = X(threat.x - threat.width / 2),
      right = X(threat.x + threat.width / 2);
    const countdown = Math.max(0, threat.resolveAt - b.time);
    ctx.fillStyle = countdown < 0.35 ? '#ed714953' : '#d56c3f30';
    ctx.fillRect(left, 80, right - left, playerY + 30 - 80);
    ctx.strokeStyle = '#ffb28a';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 5]);
    ctx.strokeRect(left, 80, right - left, playerY + 30 - 80);
    ctx.setLineDash([]);
    label(
      `! ${countdown.toFixed(1)}s`,
      (left + right) / 2,
      playerY - 55,
      18,
      '#ffd0a6',
      '700',
    );
  }
  if (b.ritual) {
    const cast = b.ritual,
      t = (b.time - cast.startedAt) / (cast.resolveAt - cast.startedAt);
    ctx.strokeStyle = cast.interruptible ? '#d2b3ee' : '#ffc592';
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.2 + t * 0.5;
    ctx.beginPath();
    ctx.ellipse(
      playerX,
      playerY,
      Math.max(22, (1 - t) * w * 0.8),
      Math.max(10, (1 - t) * h * 0.5),
      0,
      0,
      Math.PI * 2,
    );
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  const count = Math.min(24, b.player.squad),
    cols = Math.min(6, Math.ceil(Math.sqrt(count))),
    rows = Math.ceil(count / cols);
  for (let i = count - 1; i >= 0; i--) {
    const row = Math.floor(i / cols),
      col = i % cols;
    soldier(
      playerX + (col - (cols - 1) / 2) * 14 * scale,
      playerY + 12 + (row - rows / 2) * 13 * scale,
      hero.color,
      i,
    );
  }
  soldier(playerX, playerY, hero.color, 99, true);
  ctx.strokeStyle = '#f3d49b';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(playerX, playerY, 18 * scale, Math.PI * 1.1, Math.PI * 1.9);
  ctx.stroke();
  if (b.shield > 0) {
    ctx.strokeStyle = '#dac17c99';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(
      playerX,
      playerY + 10,
      cols * 9 * scale,
      rows * 9 * scale + 10,
      0,
      0,
      Math.PI * 2,
    );
    ctx.stroke();
  }
  // The army count travels with the commander so growth is readable at a glance.
  label(
    formatNumber(b.player.squad),
    playerX,
    playerY - 35 * scale,
    32,
    '#fff0bd',
    '800',
  );
  if (b.pressure && b.pressure.flashUntil > b.time) {
    const pulse = 1 - (b.pressure.flashUntil - b.time) / 0.7;
    ctx.strokeStyle = ['#c0ce8a', '#c9aff0', '#ffb185'][
      Math.floor(b.player.floor / 4)
    ];
    ctx.globalAlpha = 1 - pulse;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.ellipse(
      playerX,
      playerY,
      30 + pulse * w,
      15 + pulse * h * 0.6,
      0,
      0,
      Math.PI * 2,
    );
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  for (const e of b.effects) {
    ctx.globalAlpha = Math.min(1, e.life * 3);
    const x = X(e.x),
      y = Y(e.y);
    if (e.type === 'text')
      label(
        e.text,
        x,
        y - (1.3 - e.life) * 16,
        e.text.length > 8 ? 13 : 19,
        e.color,
        '700',
      );
    else if (e.type === 'shot') {
      ctx.strokeStyle = e.color;
      ctx.lineWidth = b.player.classId === 'mage' ? 3 : 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(X(e.targetX!), Y(e.targetY!));
      ctx.stroke();
    } else
      for (let i = 0; i < 8; i++) {
        const radius = (0.7 - e.life) * 65,
          angle = (i * Math.PI) / 4;
        ctx.fillStyle = e.color;
        ctx.fillRect(
          x + Math.cos(angle) * radius,
          y + Math.sin(angle) * radius,
          3,
          3,
        );
      }
  }
  ctx.globalAlpha = 1;
  if (b.skillFlash > 0) {
    ctx.globalAlpha = b.skillFlash;
    ctx.strokeStyle = hero.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(playerX, playerY, (0.75 - b.skillFlash) * w, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  if (b.flash > 0) {
    ctx.fillStyle = `rgba(170,42,29,${b.flash})`;
    ctx.fillRect(0, 0, w, h);
  }
}
