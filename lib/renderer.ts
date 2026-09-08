import { HEROES, gateLabel, effectiveGate } from './game.ts';
import { formatArmy } from './army.ts';
import {
  worldY,
  projectilePosition,
  type Battle,
  type Entity,
  kingPhase,
} from './combat.ts';
import { VIEW, screenX, screenY } from './view.ts';
import { ENCOUNTERS } from './bosses.ts';
import { actIndex } from './endless.ts';
import { drawAscensionBoss, drawHolyThreat } from './ascension-renderer.ts';

export interface BattleArt {
  reborn?: HTMLImageElement;
  ascendant?: HTMLImageElement;
  deity?: HTMLImageElement;
  angel?: HTMLImageElement;
}

// Orthographic world: linear coordinates and distance-independent object sizes.
export function drawBattle(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  b: Battle,
  reducedMotion = false,
  background?: HTMLImageElement,
  art?: BattleArt,
) {
  const hero = HEROES.find((v) => v.id === b.player.classId)!;
  const scale = Math.max(0.86, Math.min(1.18, w / 520));
  const X = (x: number) => screenX(x, w),
    Y = (y: number) => screenY(y, h);
  const playerY = Y(VIEW.playerY),
    playerX = X(b.x);
  const classId = b.player.classId;
  const attackColor =
    classId === 'knight'
      ? '#f4d58a'
      : classId === 'ranger'
        ? '#98efbd'
        : '#d2b3ff';
  const captions: { entity: Entity; x: number; y: number }[] = [];
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#202a28';
  ctx.fillRect(0, 0, w, h);
  if (background?.complete && background.naturalWidth > 0) {
    const factor = Math.max(
      w / background.naturalWidth,
      (h + 48) / background.naturalHeight,
    );
    const bw = background.naturalWidth * factor,
      bh = background.naturalHeight * factor;
    const drift = reducedMotion ? 0 : Math.sin(b.time * 0.07) * 18;
    ctx.drawImage(background, (w - bw) / 2, (h - bh) / 2 + drift, bw, bh);
  }
  if (b.player.node?.enchanted) {
    ctx.fillStyle = '#07031172';
    ctx.fillRect(0, 0, w, h);
  }
  const holyField = b.player.difficulty === 'endless' && b.player.floor >= 90;
  if (holyField) {
    ctx.save();
    const dawn = ctx.createRadialGradient(
      w * 0.5,
      h * 0.03,
      5,
      w * 0.5,
      h * 0.03,
      h * 0.85,
    );
    dawn.addColorStop(0, '#fff2ca35');
    dawn.addColorStop(0.6, '#eac9770c');
    dawn.addColorStop(1, '#fff2ca00');
    ctx.fillStyle = dawn;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#ffeaba';
    ctx.lineWidth = 1;
    for (let i = 0; i < 26; i++) {
      const phase = reducedMotion
        ? (i * 0.137) % 1
        : (b.time * 0.06 + i * 0.137) % 1;
      const side = i % 2 ? 1 : -1;
      const x =
        w * (side > 0 ? 0.91 : 0.09) + side * Math.sin(i * 7.4) * w * 0.06;
      const y = h * (1 - phase);
      ctx.globalAlpha = Math.sin(phase * Math.PI) * 0.55;
      ctx.beginPath();
      ctx.moveTo(x, y - 6);
      ctx.lineTo(x, y + 6);
      ctx.moveTo(x - 3, y);
      ctx.lineTo(x + 3, y);
      ctx.stroke();
    }
    ctx.restore();
  }
  const fog = ctx.createLinearGradient(0, 0, 0, h);
  fog.addColorStop(0, '#0a161a70');
  fog.addColorStop(0.15, '#0c1b1315');
  fog.addColorStop(0.75, '#10191400');
  fog.addColorStop(1, '#09120da0');
  ctx.fillStyle = fog;
  ctx.fillRect(0, 0, w, h);
  for (const zone of b.zones) {
    const left = X(zone.x - zone.width / 2),
      width = X(zone.width) - X(0);
    const active = b.time >= zone.startsAt;
    const color =
      zone.kind === 'ember'
        ? '#ff9265'
        : zone.kind === 'shadow'
          ? '#bd92f7'
          : zone.kind === 'web'
            ? '#b9dba7'
            : '#b4c787';
    ctx.save();
    ctx.fillStyle =
      zone.kind === 'shadow'
        ? active
          ? '#100b20b0'
          : '#30203935'
        : color + (active ? '35' : '16');
    ctx.fillRect(left, Y(-0.13), width, playerY + 32 - Y(-0.13));
    ctx.strokeStyle = color;
    ctx.lineWidth = active ? 2 : 1;
    ctx.setLineDash(active ? [] : [7, 7]);
    ctx.strokeRect(left, Y(-0.13), width, playerY + 32 - Y(-0.13));
    ctx.setLineDash([]);
    const pulse = reducedMotion ? 0 : Math.sin(b.time * 4 + zone.id) * 3;
    ctx.globalAlpha = active ? 0.8 : 0.5;
    for (let i = 0; i < 7; i++) {
      const y = playerY - i * 44 + pulse;
      ctx.beginPath();
      ctx.moveTo(left + 4, y + 8);
      ctx.lineTo(left + width / 2, y);
      ctx.lineTo(left + width - 4, y + 8);
      ctx.stroke();
    }
    ctx.restore();
  }
  const label = (
    text: string,
    x: number,
    y: number,
    size: number,
    color: string,
    weight = '500',
  ) => {
    ctx.font = `${weight} ${size}px 'Ashen Serif','Microsoft YaHei',serif`;
    const halfText = Math.min(w / 2 - 8, ctx.measureText(text).width / 2 + 4);
    x = Math.max(halfText + 4, Math.min(w - halfText - 4, x));
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
  // Short, deterministic strokes provide impact detail without particle state or blur.
  const sparks = (
    x: number,
    y: number,
    radius: number,
    color: string,
    rotation = 0,
    count = 6,
  ) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5 * scale;
    ctx.beginPath();
    const rays = reducedMotion ? Math.min(4, count) : count;
    for (let i = 0; i < rays; i++) {
      const angle = rotation + (i * Math.PI * 2) / rays;
      const inner = radius * 0.48;
      ctx.moveTo(x + Math.cos(angle) * inner, y + Math.sin(angle) * inner);
      ctx.lineTo(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius);
    }
    ctx.stroke();
  };
  const wings = (x: number, y: number, size: number, color = '#fff3df') => {
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = reducedMotion ? 0 : 10;
    const flutter = reducedMotion ? 0 : Math.sin(b.time * 4) * size * 0.08;
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.scale(side, 1);
      for (let i = 0; i < 6; i++) {
        ctx.globalAlpha = 0.88 - i * 0.08;
        ctx.beginPath();
        ctx.moveTo(size * 0.12, size * 0.1);
        ctx.quadraticCurveTo(
          size * (0.45 + i * 0.07),
          -size * (0.8 - i * 0.06) + flutter,
          size * (0.9 - i * 0.08),
          -size * (0.68 - i * 0.18) + flutter,
        );
        ctx.quadraticCurveTo(
          size * (0.7 - i * 0.08),
          size * 0.25,
          size * 0.12,
          size * 0.1,
        );
        ctx.fill();
      }
      ctx.restore();
    }
    ctx.restore();
  };
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
    ctx.strokeStyle = !enemy && leader ? attackColor : '#e0dcc0';
    ctx.lineWidth = 2 * s;
    ctx.beginPath();
    if (!enemy && leader && classId === 'ranger') {
      ctx.arc(x + 9 * s, y - 4 * s, 11 * s, -Math.PI / 2, Math.PI / 2);
      ctx.moveTo(x + 9 * s, y - 15 * s);
      ctx.lineTo(x + 9 * s, y + 7 * s);
    } else {
      ctx.moveTo(x + 10 * s, y + 2 * s);
      ctx.lineTo(x + 11 * s, y - 17 * s);
      if (!enemy && leader && classId === 'knight') {
        ctx.moveTo(x + 7 * s, y - 7 * s);
        ctx.lineTo(x + 14 * s, y - 7 * s);
      }
    }
    ctx.stroke();
    if (!enemy && leader && classId === 'mage') {
      ctx.fillStyle = '#ebdbff';
      ctx.beginPath();
      ctx.moveTo(x + 11 * s, y - 22 * s);
      ctx.lineTo(x + 15 * s, y - 17 * s);
      ctx.lineTo(x + 11 * s, y - 12 * s);
      ctx.lineTo(x + 7 * s, y - 17 * s);
      ctx.closePath();
      ctx.fill();
    }
    if ((enemy && leader) || (!enemy && classId === 'knight'))
      round(x - 14 * s, y - 7 * s, 7 * s, 12 * s, 2 * s, color, '#cdbb84');
  }
  function gates(e: Entity) {
    const y = Y(worldY(e, b.time));
    const gh = 67 * scale;
    if (y + gh / 2 < 0 || y - gh / 2 > h) return;
    for (const g of e.gate!) {
      const inscription = gateLabel(effectiveGate(b.player, g));
      const x = X(g.left),
        right = X(g.right),
        gw = right - x;
      const squared = g.op === '²';
      const pos = g.op === '+' || g.op === '×' || squared;
      const color = !pos
        ? e.trialStep
          ? '#ff8976'
          : '#ef9a81'
        : squared
          ? '#e6c0ff'
          : g.op === '×'
            ? '#9cdaed'
            : '#badc8e';
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = reducedMotion ? 0 : 6;
      round(
        x,
        y - gh / 2,
        gw,
        gh,
        4,
        !pos
          ? '#5b322fe8'
          : squared
            ? '#50395ceF'
            : g.op === '×'
              ? '#254856eF'
              : '#354b2aeF',
        color,
      );
      ctx.shadowBlur = 0;
      ctx.fillStyle = squared ? '#e8c989' : color;
      ctx.fillRect(x, y - gh / 2, 3, gh);
      ctx.fillRect(right - 3, y - gh / 2, 3, gh);
      const font = Math.max(
        12,
        Math.min(34 * scale, gw / (inscription.length * 0.65)),
      );
      label(
        inscription,
        (x + right) / 2,
        y + 6 * scale,
        font,
        squared ? '#ffdeb0' : color,
        '700',
      );
      if (!e.trialStep && (gw > 65 || squared || g.op === '√'))
        label(
          squared
            ? '平方'
            : g.op === '√'
              ? '开方'
              : pos
                ? g.op === '×'
                  ? '倍增'
                  : '招募'
                : '损耗',
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
      const hw = e.width * w * VIEW.horizontalScale;
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
      ctx.shadowBlur = reducedMotion ? 0 : 6;
      round(x - cw / 2, y - ch / 2, cw, ch, 5, '#805936', '#ebc877');
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#d4b674';
      ctx.fillRect(x - cw / 2, y - 2, cw, 4);
      ctx.fillRect(x - 13 * scale, y - ch / 2, 4 * scale, ch);
      ctx.fillRect(x + 9 * scale, y - ch / 2, 4 * scale, ch);
      round(x - 4, y - 6, 8, 11, 1, '#f9db8b');
      ctx.restore();
      captions.push({ entity: e, x, y });
      return;
    }
    if (e.guardianOf !== undefined) {
      const owner = b.entities.find((v) => v.id === e.guardianOf && !v.done);
      ctx.save();
      ctx.strokeStyle = '#c1a1ec';
      ctx.lineWidth = 1.5;
      if (owner) {
        ctx.globalAlpha = 0.38;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(
          (x + X(owner.x)) / 2,
          y - 42 * scale,
          X(owner.x),
          Y(worldY(owner, b.time)),
        );
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.shadowColor = '#bc8fe8';
      ctx.shadowBlur = reducedMotion ? 0 : 12;
      ctx.fillStyle = '#160c24';
      ctx.beginPath();
      ctx.ellipse(x, y, 15 * scale, 22 * scale, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      const flicker = reducedMotion ? 0 : Math.sin(b.time * 5 + e.id) * 3;
      ctx.fillStyle = '#d8bbff';
      ctx.beginPath();
      ctx.moveTo(x, y - (14 + flicker) * scale);
      ctx.bezierCurveTo(
        x + 19 * scale,
        y,
        x + 6 * scale,
        y + 13 * scale,
        x,
        y + 11 * scale,
      );
      ctx.bezierCurveTo(
        x - 13 * scale,
        y + 8 * scale,
        x - 7 * scale,
        y - 6 * scale,
        x,
        y - (14 + flicker) * scale,
      );
      ctx.fill();
      ctx.restore();
      captions.push({ entity: e, x, y });
      return;
    }
    if (e.boss) {
      const color =
        ENCOUNTERS.find((p) => p.id === e.encounterId)?.color || '#bb9270';
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(scale, scale);
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      if (e.mutation) {
        const pulse = reducedMotion ? 0 : Math.sin(b.time * 3 + e.id) * 4;
        ctx.strokeStyle =
          e.mutation === 'fusion'
            ? '#e5bded'
            : e.mutation === 'frenzied'
              ? '#d85f6d'
              : e.mutation === 'golden' || e.mutation === 'hollow'
                ? '#ffda79'
                : e.mutation === 'angelic'
                  ? e.angelBroken
                    ? '#f16769'
                    : '#fff8e5'
                  : '#7c5c9e';
        ctx.fillStyle =
          e.mutation === 'frenzied'
            ? '#61152955'
            : e.mutation === 'golden'
              ? '#dba23322'
              : e.mutation === 'angelic'
                ? '#f6edd516'
                : '#180d2b99';
        ctx.shadowColor = ctx.strokeStyle;
        ctx.shadowBlur = reducedMotion ? 0 : 9;
        ctx.lineWidth = 2;
        // Mutation glints hug the silhouette; no decorative collision-looking ring.
        for (const side of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(side * 31, 18);
          ctx.lineTo(side * (38 + pulse), -4);
          ctx.lineTo(side * 33, -33);
          ctx.stroke();
          if (e.mutation === 'fusion') {
            ctx.strokeStyle = '#e9ab68';
            ctx.beginPath();
            ctx.moveTo(side * 41, 4);
            ctx.lineTo(side * 47, -21);
            ctx.lineTo(side * 39, -41);
            ctx.stroke();
          }
        }
        if (e.mutation === 'ashen') {
          for (let i = 0; i < 9; i++) {
            const t = reducedMotion ? 0.45 : (b.time * 0.6 + i * 0.19) % 1;
            const px = Math.sin(i * 2.3) * 39;
            ctx.globalAlpha = (1 - t) * 0.8;
            ctx.fillStyle = '#090614';
            ctx.strokeStyle = '#8d65a0';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(px - 7, 16 - t * 55);
            ctx.quadraticCurveTo(px + 16, -5 - t * 65, px + 3, -32 - t * 60);
            ctx.quadraticCurveTo(px - 18, -5 - t * 45, px - 7, 16 - t * 55);
            ctx.fill();
            ctx.stroke();
          }
          ctx.globalAlpha = 1;
        }
        if (e.mutation === 'angelic' && !e.angelBroken) {
          wings(0, -3, 66, '#fff7df');
          ctx.strokeStyle = '#fff7dc';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.ellipse(0, -63, 21, 6, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        if ((e.invulnerableUntil || 0) > b.time) {
          ctx.strokeStyle = e.mutation === 'angelic' ? '#ffffff' : '#ffe29b';
          ctx.lineWidth = 3;
          // The shield silhouette denotes the active immunity state, not an area attack.
          ctx.fillStyle = e.mutation === 'angelic' ? '#ffffff15' : '#ffd26422';
          ctx.beginPath();
          ctx.moveTo(0, -66);
          ctx.lineTo(47, -47);
          ctx.lineTo(42, 13);
          ctx.lineTo(0, 43);
          ctx.lineTo(-42, 13);
          ctx.lineTo(-47, -47);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
        ctx.shadowBlur = 0;
      }
      if (
        ['king-reborn', 'king-ascendant', 'deity'].includes(e.encounterId || '')
      ) {
        drawAscensionBoss(ctx, e, b.time, reducedMotion, w, scale);
      } else if (e.encounterId === 'wyvern') {
        const flap = reducedMotion ? 0 : Math.sin(b.time * 3) * 5;
        for (const side of [-1, 1]) {
          ctx.save();
          ctx.scale(side, 1);
          ctx.fillStyle = '#294c58';
          ctx.strokeStyle = '#91c9d9';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(9, -12);
          ctx.lineTo(61, -35 + flap);
          ctx.lineTo(45, 10 + flap);
          ctx.lineTo(31, -1);
          ctx.lineTo(20, 21);
          ctx.lineTo(9, 8);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(12, -8);
          ctx.lineTo(58, -31 + flap);
          ctx.moveTo(12, -8);
          ctx.lineTo(44, 6 + flap);
          ctx.stroke();
          ctx.restore();
        }
        ctx.strokeStyle = '#7296a5';
        ctx.lineWidth = 9;
        ctx.beginPath();
        ctx.moveTo(0, -14);
        ctx.quadraticCurveTo(15, -45, -9, -52);
        ctx.stroke();
        ctx.fillStyle = '#7ba3ae';
        ctx.beginPath();
        ctx.ellipse(0, 0, 15, 27, 0, 0, Math.PI * 2);
        ctx.fill();
        round(-9, 13, 18, 22, 6, '#9fc3c9', '#e4e9c8');
        ctx.fillStyle = '#e0efff';
        ctx.fillRect(-7, 23, 4, 3);
        ctx.fillRect(3, 23, 4, 3);
      } else if (e.encounterId === 'broodmother') {
        ctx.strokeStyle = '#b088ab';
        ctx.lineWidth = 4;
        for (const side of [-1, 1])
          for (let i = 0; i < 4; i++) {
            const step = reducedMotion ? 0 : Math.sin(b.time * 4 + i) * 3;
            ctx.beginPath();
            ctx.moveTo(side * 13, -12 + i * 8);
            ctx.lineTo(side * (34 + (i % 2) * 8), -30 + i * 17 + step);
            ctx.lineTo(side * 49, -10 + i * 12 + step);
            ctx.stroke();
          }
        ctx.fillStyle = '#574565';
        ctx.beginPath();
        ctx.ellipse(0, -11, 25, 29, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#9b73a0';
        ctx.beginPath();
        ctx.ellipse(0, 13, 17, 17, 0, 0, Math.PI * 2);
        ctx.fill();
        for (const eye of [-9, -3, 3, 9]) {
          ctx.fillStyle = '#f5baea';
          ctx.beginPath();
          ctx.arc(eye, 22, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (e.encounterId === 'stonewarden') {
        round(-21, -23, 42, 48, 7, '#626b63', '#c8c4a0');
        round(-39, -17, 18, 38, 5, '#7a8176', '#c0b798');
        round(21, -17, 18, 38, 5, '#7a8176', '#c0b798');
        round(-13, -28, 26, 21, 4, '#92988a', '#d0ccb1');
        ctx.strokeStyle = '#caeabc';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-9, -3);
        ctx.lineTo(0, 9);
        ctx.lineTo(9, -3);
        ctx.moveTo(0, 9);
        ctx.lineTo(0, 20);
        ctx.stroke();
        ctx.fillStyle = '#dafac9';
        ctx.fillRect(-8, -20, 16, 3);
      } else {
        if (e.encounterId === 'oracle') {
          ctx.strokeStyle = '#d6b3ee';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.ellipse(
            0,
            -5,
            46,
            30,
            reducedMotion ? 0 : b.time * 0.25,
            0,
            Math.PI * 2,
          );
          ctx.stroke();
        }
        if (e.encounterId === 'hexblade') {
          ctx.strokeStyle = '#c193f5';
          ctx.lineWidth = 6;
          ctx.beginPath();
          ctx.moveTo(29, 20);
          ctx.lineTo(43, -31);
          ctx.stroke();
        }
        if (e.encounterId?.startsWith('king') || e.encounterId === 'deity') {
          const phase = kingPhase(e);
          const rotation = reducedMotion ? 0 : b.time * (0.16 + phase * 0.07);
          ctx.save();
          ctx.rotate(rotation);
          ctx.strokeStyle = phase === 3 ? '#fff0b2' : '#eba566';
          ctx.lineWidth = 2;
          ctx.shadowColor = '#ff8844';
          ctx.shadowBlur = reducedMotion ? 0 : 12;
          for (let i = 0; i < 9; i++) {
            const angle = (i * Math.PI * 2) / 9;
            const radius = 33 + phase * 3;
            const outer = radius + 12 + (phase === 3 ? 7 : 0);
            ctx.beginPath();
            ctx.moveTo(
              Math.cos(angle - 0.18) * radius,
              Math.sin(angle - 0.18) * radius,
            );
            ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
            ctx.lineTo(
              Math.cos(angle + 0.18) * radius,
              Math.sin(angle + 0.18) * radius,
            );
            ctx.stroke();
          }
          ctx.restore();
          round(-17, -29, 34, 13, 2, '#dfb86c', '#ffe8ad');
        }
        ctx.scale(1 / scale, 1 / scale);
        soldier(0, 0, color, 0, true, true);
      }
      ctx.restore();
    } else if (
      holyField &&
      art?.angel?.complete &&
      art.angel.naturalWidth > 0
    ) {
      const height = 70 * scale,
        width = (height * art.angel.naturalWidth) / art.angel.naturalHeight;
      ctx.drawImage(art.angel, x - width / 2, y - height / 2, width, height);
      captions.push({ entity: e, x, y });
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
      captions.push({ entity: e, x, y });
    }
    if (e.boss) {
      if ((e.mutationShield || 0) > 0) {
        round(x - 43 * scale, y + 42 * scale, 86 * scale, 5, 2, '#3a2b10');
        round(
          x - 43 * scale,
          y + 42 * scale,
          (86 * scale * e.mutationShield!) /
            Math.max(1, e.mutationShieldMax || 1),
          5,
          2,
          '#f5d580',
        );
      }
      if ((e.healingFlashUntil || 0) > b.time) {
        const tint = e.mutation === 'frenzied' ? '#ff7890' : '#fff5dc';
        ctx.save();
        ctx.strokeStyle = tint;
        ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) {
          const p = reducedMotion ? 0.5 : (b.time * 0.9 + i * 0.33) % 1;
          ctx.globalAlpha = 1 - p;
          const py = y + (22 - p * 60) * scale,
            px = x + (i - 1) * 24 * scale;
          ctx.beginPath();
          ctx.moveTo(px - 4, py);
          ctx.lineTo(px + 4, py);
          ctx.moveTo(px, py - 4);
          ctx.lineTo(px, py + 4);
          ctx.stroke();
        }
        ctx.restore();
      }
      if (e.angelBroken && e.mutation === 'angelic') {
        ctx.save();
        ctx.strokeStyle = '#ff676b';
        ctx.globalAlpha = reducedMotion
          ? 0.5
          : 0.3 + (Math.sin(b.time * 10) + 1) * 0.25;
        ctx.lineWidth = 4;
        for (const side of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(x + side * 19 * scale, y - 31 * scale);
          ctx.lineTo(x + side * 27 * scale, y - 7 * scale);
          ctx.lineTo(x + side * 17 * scale, y + 16 * scale);
          ctx.stroke();
        }
        ctx.restore();
      }
      const act = actIndex(b.player);
      if (b.player.node?.kind === 'boss' && act === 1) {
        for (let i = 0; i < 5; i++) {
          const angle =
            (reducedMotion ? 0 : b.time * 0.8) + (i * Math.PI * 2) / 5;
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
        label('侧翼破防', x, y + 55 * scale, 13, '#ffdda3', '700');
      }
    }
    if (e.burnUntil > b.time) {
      ctx.save();
      ctx.strokeStyle = '#efa16f';
      ctx.lineWidth = 2;
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(x + side * 14 * scale, y + 16 * scale);
        ctx.quadraticCurveTo(
          x + side * 25 * scale,
          y - 4 * scale,
          x + side * 12 * scale,
          y - 18 * scale,
        );
        ctx.stroke();
      }
      ctx.restore();
    }
  }
  // Skills sit behind combat silhouettes; only their short accents move.
  if (b.skillFlash > 0) {
    const progress = Math.max(0, Math.min(1, 1 - b.skillFlash / 0.7));
    const spread = reducedMotion ? 0.42 : progress;
    ctx.save();
    ctx.strokeStyle = attackColor;
    ctx.fillStyle = attackColor;
    ctx.globalAlpha = (1 - progress) * 0.75;
    ctx.lineWidth = 2 * scale;
    if (classId === 'knight') {
      // A shield crest signals protection rather than a damaging projectile.
      const cy = playerY - 67 * scale;
      ctx.beginPath();
      ctx.moveTo(playerX, cy - 18 * scale);
      ctx.lineTo(playerX + 17 * scale, cy - 11 * scale);
      ctx.lineTo(playerX + 13 * scale, cy + 8 * scale);
      ctx.lineTo(playerX, cy + 21 * scale);
      ctx.lineTo(playerX - 13 * scale, cy + 8 * scale);
      ctx.lineTo(playerX - 17 * scale, cy - 11 * scale);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(playerX, cy - 8 * scale);
      ctx.lineTo(playerX, cy + 10 * scale);
      ctx.moveTo(playerX - 7 * scale, cy - 1 * scale);
      ctx.lineTo(playerX + 7 * scale, cy - 1 * scale);
      ctx.stroke();
    } else if (classId === 'ranger') {
      const arrows = reducedMotion ? 5 : 9;
      for (let i = 0; i < arrows; i++) {
        const x = w * (0.12 + (i * 0.76) / (arrows - 1));
        const row = (i * 0.37) % 1;
        const y =
          Y(-0.1) + (playerY - Y(-0.1) - 50) * ((row + spread * 0.48) % 1);
        const length = (reducedMotion ? 18 : 32) * scale;
        ctx.beginPath();
        ctx.moveTo(x - length * 0.25, y - length);
        ctx.lineTo(x, y);
        ctx.lineTo(x - 6 * scale, y - 5 * scale);
        ctx.moveTo(x, y);
        ctx.lineTo(x + 3 * scale, y - 8 * scale);
        ctx.stroke();
      }
    } else {
      // Six sparks rise from the staff; the travelling fireballs carry the hit area.
      for (let i = 0; i < 6; i++) {
        const x = playerX + (i - 2.5) * 10 * scale;
        const y = playerY - (35 + spread * 25 + Math.abs(i - 2.5) * 5) * scale;
        sparks(x, y, 7 * scale, '#eadbff', Math.PI / 4, 4);
      }
    }
    ctx.restore();
  }
  if (b.pressure && b.pressure.flashUntil > b.time) {
    const pulse = Math.max(
      0,
      Math.min(1, 1 - (b.pressure.flashUntil - b.time) / 0.7),
    );
    const color = ['#c0ce8a', '#c9aff0', '#ffb185'][
      Math.min(2, actIndex(b.player))
    ];
    const spread = reducedMotion ? 0.18 : pulse;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.globalAlpha = (1 - pulse) * 0.65;
    ctx.lineWidth = (reducedMotion ? 2 : 3) * scale;
    // Broken ground rays distinguish an unavoidable pulse from an aim warning.
    const rays = reducedMotion ? 4 : 6;
    ctx.beginPath();
    for (let i = 0; i < rays; i++) {
      const angle = (i * Math.PI * 2) / rays + Math.PI / 6;
      const length = (35 + spread * 72) * scale;
      const cx = Math.cos(angle),
        sy = Math.sin(angle) * 0.55;
      ctx.moveTo(playerX + cx * 27 * scale, playerY + sy * 27 * scale);
      ctx.lineTo(
        playerX + cx * length * 0.7 + sy * 7,
        playerY + sy * length * 0.7,
      );
      ctx.lineTo(playerX + cx * length, playerY + sy * length);
    }
    ctx.stroke();
    ctx.restore();
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
  for (const bullet of b.bullets) {
    if (b.time < bullet.spawnAt) continue;
    const x = X(bullet.x),
      y = Y(bullet.y);
    if (y < -30 || y > h + 30 || x < -30 || x > w + 30) continue;
    const age = Math.max(0, b.time - bullet.spawnAt);
    const trailAge = Math.min(age, reducedMotion ? 0.025 : 0.085);
    const tailX = X(bullet.x - bullet.vx * trailAge);
    const tailY = Y(bullet.y - bullet.vy * trailAge);
    const dx = X(bullet.vx) - X(0),
      dy = Y(bullet.vy) - Y(0);
    const angle = Math.atan2(dy, dx);
    const radius = Math.max(3.5, bullet.radius * w * VIEW.horizontalScale);
    const color =
      bullet.kind === 'blade'
        ? '#f4d58a'
        : bullet.kind === 'arrow'
          ? '#98efbd'
          : bullet.kind === 'fireball'
            ? '#ffa663'
            : bullet.kind === 'shard'
              ? attackColor
              : '#d2b3ff';
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = color;
    ctx.globalAlpha = reducedMotion ? 0.3 : 0.48;
    ctx.lineWidth = Math.max(1.5, radius * 0.45);
    ctx.beginPath();
    ctx.moveTo(tailX, tailY);
    ctx.lineTo(x, y);
    ctx.stroke();
    if (bullet.pierceLeft > 0) {
      const offsetX = -Math.sin(angle) * radius * 0.55;
      const offsetY = Math.cos(angle) * radius * 0.55;
      ctx.globalAlpha = 0.3;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (const side of [-1, 1]) {
        ctx.moveTo(tailX + offsetX * side, tailY + offsetY * side);
        ctx.lineTo(x + offsetX * side, y + offsetY * side);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = bullet.critical ? '#fff7d8' : color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.2 * scale;
    if (bullet.kind === 'fireball') {
      ctx.shadowColor = '#ff783b';
      ctx.shadowBlur = reducedMotion ? 0 : radius * 2;
      ctx.beginPath();
      ctx.moveTo(-radius * 2.4, 0);
      ctx.quadraticCurveTo(-radius, -radius * 1.7, radius * 0.8, -radius * 0.5);
      ctx.quadraticCurveTo(radius * 1.5, 0, radius * 0.8, radius * 0.5);
      ctx.quadraticCurveTo(-radius, radius * 1.7, -radius * 2.4, 0);
      ctx.fill();
      ctx.fillStyle = '#fff1bf';
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.55, 0, Math.PI * 2);
      ctx.fill();
    } else if (bullet.kind === 'blade') {
      ctx.beginPath();
      ctx.moveTo(-radius * 0.5, -radius);
      ctx.quadraticCurveTo(radius * 1.55, 0, -radius * 0.5, radius);
      ctx.quadraticCurveTo(radius * 0.35, 0, -radius * 0.5, -radius);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-radius * 0.6, -radius * 0.65);
      ctx.lineTo(-radius * 0.9, radius * 0.65);
      ctx.stroke();
    } else if (bullet.kind === 'arrow') {
      ctx.beginPath();
      ctx.moveTo(-radius * 2.3, 0);
      ctx.lineTo(radius * 0.35, 0);
      ctx.moveTo(-radius * 1.7, 0);
      ctx.lineTo(-radius * 2.2, -radius * 0.45);
      ctx.moveTo(-radius * 1.7, 0);
      ctx.lineTo(-radius * 2.2, radius * 0.45);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(radius, 0);
      ctx.lineTo(-radius * 0.4, -radius * 0.65);
      ctx.lineTo(-radius * 0.13, 0);
      ctx.lineTo(-radius * 0.4, radius * 0.65);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(radius, 0);
      ctx.lineTo(0, -radius * (bullet.kind === 'shard' ? 0.5 : 0.8));
      ctx.lineTo(-radius, 0);
      ctx.lineTo(0, radius * (bullet.kind === 'shard' ? 0.5 : 0.8));
      ctx.closePath();
      ctx.fill();
      if (bullet.kind === 'bolt') {
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.arc(0, 0, radius, -Math.PI * 0.3, Math.PI * 0.3);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
  for (const p of b.projectiles) {
    if (b.time < p.spawnAt - 0.4) continue;
    const pos = projectilePosition(p, Math.min(b.time, p.impactAt)),
      x = X(pos.x),
      y = Y(pos.y);
    if (y > h + 25 || y < -25) continue;
    const owner = b.entities.find((e) => e.id === p.ownerId);
    const holy =
      owner?.encounterId === 'deity' ||
      owner?.encounterId === 'king-ascendant' ||
      owner?.mutation === 'angelic';
    const eclipse = owner?.ascendantForm === 'eclipse';
    const color = holy
      ? eclipse
        ? '#ffb0a1'
        : '#fff2bb'
      : p.kind === 'star'
        ? '#d1b5ff'
        : p.kind === 'ember'
          ? '#ffb47f'
          : '#e7d4a2';
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    if (b.time < p.spawnAt) {
      sparks(x, y, 9, color, p.phase, 4);
      ctx.restore();
      continue;
    }
    const radius = Math.max(5, p.radius * w * VIEW.horizontalScale);
    if (p.resolved) {
      const fade = Math.max(0, 1 - (b.time - p.impactAt) / 0.45);
      ctx.globalAlpha = fade * 0.55;
      // Every projectile lands here, including misses; this is a small ground impact.
      sparks(
        x,
        y,
        radius * (reducedMotion ? 1 : 1 + (1 - fade) * 1.6),
        color,
        p.phase,
        5,
      );
      ctx.restore();
      continue;
    }
    const segments = reducedMotion ? 1 : 3;
    const trailTime = reducedMotion ? 0.035 : 0.13;
    for (let i = segments; i > 0; i--) {
      const previous = projectilePosition(
        p,
        Math.max(p.spawnAt, b.time - (trailTime * i) / segments),
      );
      const next = projectilePosition(
        p,
        Math.max(p.spawnAt, b.time - (trailTime * (i - 1)) / segments),
      );
      ctx.globalAlpha = 0.14 + 0.13 * (segments - i);
      ctx.lineWidth =
        Math.max(1.5, radius * (p.kind === 'ember' ? 0.9 : 0.35)) *
        (1 - (i - 1) / (segments + 1));
      ctx.beginPath();
      ctx.moveTo(X(previous.x), Y(previous.y));
      ctx.lineTo(X(next.x), Y(next.y));
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.lineWidth = 1.3 * scale;
    ctx.strokeStyle = '#18221e';
    if (holy && p.kind === 'ember') {
      // Feather-shaped light has exactly the projectile radius; its faint trail is cosmetic.
      const previous = projectilePosition(
        p,
        Math.max(p.spawnAt, b.time - 0.03),
      );
      ctx.translate(x, y);
      ctx.rotate(Math.atan2(y - Y(previous.y), x - X(previous.x)));
      ctx.beginPath();
      ctx.moveTo(radius, 0);
      ctx.quadraticCurveTo(0, -radius, -radius, -radius * 0.2);
      ctx.lineTo(-radius * 0.4, 0);
      ctx.lineTo(-radius, radius * 0.2);
      ctx.quadraticCurveTo(0, radius, radius, 0);
      ctx.fillStyle = eclipse ? '#f4b2a2' : '#fff0c9';
      ctx.fill();
      ctx.strokeStyle = eclipse ? '#93474e' : '#a48651';
      ctx.stroke();
      ctx.strokeStyle = eclipse ? '#ffe2cf' : '#fffbe5';
      ctx.beginPath();
      ctx.moveTo(-radius * 0.65, 0);
      ctx.lineTo(radius * 0.7, 0);
      ctx.stroke();
    } else if (p.kind === 'star') {
      ctx.translate(x, y);
      ctx.rotate((reducedMotion ? 0 : b.time * 2) + p.phase);
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
      ctx.stroke();
      ctx.fillStyle = '#f4eaff';
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.24, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.kind === 'axe') {
      ctx.translate(x, y);
      ctx.rotate(reducedMotion ? p.phase : b.time * 8);
      ctx.strokeStyle = '#473d2c';
      ctx.lineWidth = 4 * scale;
      ctx.beginPath();
      ctx.moveTo(-radius, 0);
      ctx.lineTo(radius, 0);
      ctx.stroke();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5 * scale;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(radius * 0.2, -radius * 0.3);
      ctx.quadraticCurveTo(
        radius * 0.6,
        -radius * 0.85,
        radius,
        -radius * 0.75,
      );
      ctx.quadraticCurveTo(radius * 0.52, 0, radius, radius * 0.75);
      ctx.quadraticCurveTo(
        radius * 0.6,
        radius * 0.85,
        radius * 0.2,
        radius * 0.3,
      );
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#fff1c9';
      ctx.lineWidth = 1 * scale;
      ctx.stroke();
    } else {
      ctx.fillStyle = holy ? '#eec978' : '#e27642';
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ffcf8f';
      ctx.beginPath();
      ctx.arc(x, y, radius * 0.66, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff2ca';
      ctx.beginPath();
      ctx.arc(x, y - radius * 0.16, radius * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  for (const threat of b.threats) {
    const left = X(threat.x - threat.width / 2),
      right = X(threat.x + threat.width / 2);
    const countdown = Math.max(0, threat.resolveAt - b.time);
    const owner = b.entities.find((e) => e.id === threat.ownerId);
    const holy =
      owner?.encounterId === 'deity' ||
      owner?.encounterId === 'king-ascendant' ||
      owner?.mutation === 'angelic';
    const eclipse = owner?.ascendantForm === 'eclipse';
    ctx.fillStyle = holy
      ? eclipse
        ? countdown < 0.35
          ? '#e15f6d55'
          : '#a44c6827'
        : countdown < 0.35
          ? '#ffd98555'
          : '#dfb65727'
      : countdown < 0.35
        ? '#ed714953'
        : '#d56c3f30';
    ctx.fillRect(left, 80, right - left, playerY + 30 - 80);
    ctx.strokeStyle = holy ? (eclipse ? '#ffc3b1' : '#ffe9af') : '#ffb28a';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 5]);
    ctx.strokeRect(left, 80, right - left, playerY + 30 - 80);
    ctx.setLineDash([]);
    if (holy) {
      drawHolyThreat(
        ctx,
        threat.name,
        left,
        right,
        80,
        playerY + 30,
        countdown,
        reducedMotion,
        owner?.ascendantForm === 'eclipse',
      );
    }
    label(
      `${threat.name} · ${countdown.toFixed(1)}s`,
      (left + right) / 2,
      playerY - 55,
      13,
      '#ffd0a6',
      '700',
    );
    if (threat.name === '陨火葬城') {
      const fall = reducedMotion ? 0.5 : Math.max(0, 1 - countdown / 2.1);
      const mx = (left + right) / 2;
      const my = Y(-0.25) + (playerY - Y(-0.25) - 90) * fall;
      ctx.save();
      ctx.strokeStyle = '#ffc072';
      ctx.lineWidth = 9 * scale;
      ctx.lineCap = 'round';
      ctx.globalAlpha = 0.65;
      ctx.beginPath();
      ctx.moveTo(mx - 20 * scale, my - 60 * scale);
      ctx.lineTo(mx, my);
      ctx.stroke();
      ctx.fillStyle = '#fff0b9';
      ctx.beginPath();
      ctx.arc(mx, my, 8 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
  if (b.ritual) {
    const cast = b.ritual,
      t = Math.max(
        0,
        Math.min(
          1,
          (b.time - cast.startedAt) / (cast.resolveAt - cast.startedAt),
        ),
      );
    const fieldLeft = X(-1),
      fieldRight = X(1);
    const safeLeft = Math.max(fieldLeft, X(cast.safeX - cast.safeWidth / 2)),
      safeRight = Math.min(fieldRight, X(cast.safeX + cast.safeWidth / 2));
    const zoneTop = 80,
      zoneBottom = playerY + 42 * scale;
    const inSafe = Math.abs(b.x - cast.safeX) <= cast.safeWidth / 2;
    ctx.save();
    // Split the danger fill so the safe corridor never receives its red tint.
    ctx.fillStyle = '#c4453930';
    ctx.fillRect(
      fieldLeft,
      zoneTop,
      safeLeft - fieldLeft,
      zoneBottom - zoneTop,
    );
    ctx.fillRect(
      safeRight,
      zoneTop,
      fieldRight - safeRight,
      zoneBottom - zoneTop,
    );
    ctx.fillStyle = '#47bc7845';
    ctx.fillRect(safeLeft, zoneTop, safeRight - safeLeft, zoneBottom - zoneTop);
    ctx.strokeStyle = '#a8f8bc';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 5]);
    ctx.beginPath();
    for (const x of [safeLeft, safeRight]) {
      ctx.moveTo(x, zoneTop);
      ctx.lineTo(x, zoneBottom);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    label(
      '安全通道',
      (safeLeft + safeRight) / 2,
      playerY - 61 * scale,
      14,
      '#d4ffe1',
      '700',
    );
    label(
      cast.interruptible ? '集火打断 / 移入绿区' : '圣约不可打断 · 移入绿区',
      w / 2,
      playerY - 104 * scale,
      14,
      '#e5f4d7',
      '700',
    );
    // A small countdown rail sits above the instructions, not around the player.
    const timerWidth = Math.min(w * 0.55, 220);
    ctx.fillStyle = '#141b20d9';
    ctx.fillRect((w - timerWidth) / 2, playerY - 124 * scale, timerWidth, 4);
    ctx.fillStyle = inSafe ? '#a8f8bc' : '#ffc592';
    ctx.fillRect(
      (w - timerWidth) / 2,
      playerY - 124 * scale,
      timerWidth * t,
      4,
    );
    ctx.restore();
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
    // Protection is indicated above the commander rather than as a false ground zone.
    ctx.strokeStyle = '#dac17c99';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const sy = playerY - 63 * scale;
    ctx.moveTo(playerX, sy - 11 * scale);
    ctx.lineTo(playerX + 11 * scale, sy - 6 * scale);
    ctx.lineTo(playerX + 8 * scale, sy + 6 * scale);
    ctx.lineTo(playerX, sy + 12 * scale);
    ctx.lineTo(playerX - 8 * scale, sy + 6 * scale);
    ctx.lineTo(playerX - 11 * scale, sy - 6 * scale);
    ctx.closePath();
    ctx.stroke();
  }
  let impactCount = 0;
  let burstCount = 0;
  for (const e of b.effects) {
    if (e.type === 'text' || e.type === 'shot') continue;
    const x = X(e.x),
      y = Y(e.y);
    if (e.type === 'impact') {
      if (++impactCount > (reducedMotion ? 12 : 24)) continue;
      const progress = Math.max(0, Math.min(1, 1 - e.life / 0.26));
      const radius = (reducedMotion ? 9 : 6 + progress * 13) * scale;
      ctx.save();
      ctx.globalAlpha = (1 - progress) * 0.85;
      ctx.strokeStyle = e.color;
      ctx.lineWidth = 2 * scale;
      if (classId === 'knight') {
        ctx.beginPath();
        ctx.moveTo(x - radius * 0.7, y + radius);
        ctx.lineTo(x + radius * 0.7, y - radius);
        ctx.moveTo(x - radius * 0.65, y - radius * 0.45);
        ctx.lineTo(x + radius * 0.65, y + radius * 0.45);
        ctx.stroke();
        sparks(x, y, radius * 0.7, '#ffedc1', Math.PI / 4, 4);
      } else if (classId === 'ranger') {
        sparks(x, y, radius, e.color, Math.PI / 6);
        ctx.fillStyle = '#e8fff1';
        ctx.fillRect(x - 1.5 * scale, y - 1.5 * scale, 3 * scale, 3 * scale);
      } else {
        ctx.beginPath();
        for (let i = 0; i < (reducedMotion ? 3 : 4); i++) {
          const angle = (i * Math.PI) / 2 + Math.PI / 4;
          const dx = Math.cos(angle),
            dy = Math.sin(angle);
          ctx.moveTo(x + dx * radius * 0.25, y + dy * radius * 0.25);
          ctx.lineTo(
            x + dx * radius * 0.55 - dy * 3 * scale,
            y + dy * radius * 0.55 + dx * 3 * scale,
          );
          ctx.lineTo(x + dx * radius, y + dy * radius);
        }
        ctx.stroke();
        sparks(x, y, radius * 0.35, '#eee2ff', 0, 4);
      }
      ctx.restore();
    } else if (e.type === 'burst') {
      if (++burstCount > (reducedMotion ? 8 : 16)) continue;
      const progress = Math.max(0, Math.min(1, 1 - e.life / 0.65));
      const radius = (reducedMotion ? 14 : 8 + progress * 28) * scale;
      ctx.save();
      ctx.globalAlpha = (1 - progress) * 0.8;
      sparks(x, y, radius, e.color, Math.PI / 8, 8);
      ctx.restore();
    }
  }
  ctx.globalAlpha = 1;
  if (b.flash > 0) {
    const fade = Math.min(1, b.flash / 0.3);
    ctx.fillStyle = `rgba(170,42,29,${reducedMotion ? b.flash * 0.4 : b.flash})`;
    ctx.fillRect(0, 0, w, h);
    ctx.save();
    ctx.globalAlpha = fade * 0.8;
    sparks(
      playerX,
      playerY,
      (reducedMotion ? 30 : 24 + (1 - fade) * 20) * scale,
      b.message.startsWith('护盾吸收') ? '#ffe3a0' : '#ffb59c',
      Math.PI / 4,
      4,
    );
    ctx.restore();
  }
  // Combat captions remain above decorative effects. Boss HP belongs to the UI.
  for (const { entity: e, x, y } of captions) {
    ctx.save();
    if (e.start > b.time) ctx.globalAlpha = 0.62;
    if (e.kind === 'chest') {
      hpBar(e, x, y - 29 * scale, 65 * scale);
      label(
        e.blessing
          ? '黎明礼匣'
          : e.reward === 'weapon'
            ? '兵装秘匣'
            : '补给宝箱',
        x,
        y - 39 * scale,
        Math.max(14, 14 * scale),
        '#f4d896',
        '600',
      );
      label(`${Math.ceil(e.hp)}`, x, y + 37 * scale, 13, '#e4dab7');
    } else {
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
    ctx.restore();
  }
  for (const e of b.effects) {
    if (e.type !== 'text') continue;
    ctx.globalAlpha = Math.min(1, e.life * 3);
    label(
      e.text,
      X(e.x),
      Y(e.y) - (reducedMotion ? 10 : (1.3 - e.life) * 16),
      e.text.length > 8 ? 13 : 19,
      e.color,
      '700',
    );
  }
  ctx.globalAlpha = 1;
  // The army count travels with the commander and is never dimmed by hit flashes.
  const armyLabel = formatArmy(b.player);
  const armyFont = Math.min(32, 360 / Math.max(10, armyLabel.length));
  label(armyLabel, playerX, playerY - 35 * scale, armyFont, '#fff0bd', '800');
  if (b.transition?.kind === 'shatter') {
    const t = 1 - b.transition.remaining / b.transition.duration;
    ctx.save();
    ctx.fillStyle = `rgba(218,231,246,${reducedMotion ? 0.14 : Math.max(0, 0.4 - t * 0.33)})`;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#faffff';
    ctx.lineWidth = 2;
    ctx.globalAlpha = 1 - t * 0.7;
    const cx = w * 0.5,
      cy = h * 0.34;
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 6 + 0.15,
        length = Math.max(w, h) * (reducedMotion ? 0.5 : 0.2 + t * 0.75);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(
        cx + Math.cos(a) * length * 0.35,
        cy + Math.sin(a) * length * 0.35,
      );
      ctx.lineTo(
        cx + Math.cos(a + 0.09) * length * 0.6,
        cy + Math.sin(a + 0.09) * length * 0.6,
      );
      ctx.lineTo(cx + Math.cos(a) * length, cy + Math.sin(a) * length);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    label('圣翼崩解', cx, h * 0.46, 32 * scale, '#fff5e4', '800');
    label('神性褪去 · 凡躯再现', cx, h * 0.46 + 30, 14, '#e7c3c6');
    ctx.restore();
  }
}
