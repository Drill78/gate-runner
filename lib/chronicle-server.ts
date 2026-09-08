// The public API keeps personal credentials and unfinished runs out of public queries.
import {
  magnitude,
  validMagnitude,
  projectMagnitude,
  ARMY_PROJECTION_LIMIT,
} from './army.ts';
const MODES = ['normal', 'hard', 'endless'];
const CLASSES = ['knight', 'ranger', 'mage'];
const UUID = /^[a-f0-9-]{36}$/i;
const origins = new Set([
  'https://gate-runner-seven.vercel.app',
  'https://ashen-gates-zhour.green-salnut.chatgpt.site',
  'http://127.0.0.1:5173',
  'http://localhost:5173',
]);
export interface ChronicleEnv {
  DB: D1Database;
}
type Traveller = { id: string; name: string; ascended?: number };
type Expedition = {
  id: string;
  traveller_id: string;
  mode: string;
  class_id: string;
  seed: number;
  started_at: number;
  status: string;
  checkpoint: number;
  ranked: number;
  start_room?: number;
  ruleset?: string;
};
const fail = (message: string, status = 400): never => {
  throw Object.assign(new Error(message), { status });
};
export function cleanName(value: unknown, max: number, fallback = ''): string {
  if (typeof value !== 'string') return fail('请写下可读的名字或称号。');
  const clean = value
    .normalize('NFKC')
    .replace(/[\p{Cc}\p{Cf}<>]/gu, '')
    .trim()
    .replace(/\s+/g, ' ');
  if (clean.length > max) return fail(`请将文字缩短至 ${max} 字以内。`);
  return clean || fallback;
}
async function hash(value: string) {
  return [
    ...new Uint8Array(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)),
    ),
  ]
    .map((n) => n.toString(16).padStart(2, '0'))
    .join('');
}
const numeric = (
  v: unknown,
  min: number,
  max: number,
  integer = false,
): v is number =>
  typeof v === 'number' &&
  Number.isFinite(v) &&
  v >= min &&
  v <= max &&
  (!integer || Number.isSafeInteger(v));
export function validateResult(
  data: Record<string, unknown>,
  run: Expedition,
  now: number,
) {
  const status = data.status;
  if (!['won', 'lost', 'retired'].includes(String(status)))
    fail('结算状态无效。');
  if (
    !numeric(
      data.depth,
      0,
      run.mode === 'endless'
        ? run.ruleset === 'ascension-v1'
          ? 100
          : 999999
        : 15,
      true,
    ) ||
    !numeric(data.duration, 0, 1e9) ||
    !numeric(data.peakSquad, 1, ARMY_PROJECTION_LIMIT) ||
    !numeric(data.gold, 0, Number.MAX_SAFE_INTEGER, true)
  )
    fail('战绩数值无效。');
  const peakMagnitude =
    data.peakMagnitude == null
      ? magnitude(Number(data.peakSquad))
      : validMagnitude(data.peakMagnitude)
        ? data.peakMagnitude
        : fail('军势印记无效。');
  if (
    Math.abs(projectMagnitude(peakMagnitude) / Number(data.peakSquad) - 1) >
    1e-12
  )
    fail('军势印记无效。');
  if (
    status === 'won' &&
    (data.depth !== (run.mode === 'endless' ? 100 : 15) ||
      Number(data.duration) < 20 ||
      (run.mode === 'endless' && run.ruleset !== 'ascension-v1'))
  )
    fail('尚未完成远征。');
  if (
    status === 'retired' &&
    (run.mode !== 'endless' || Number(data.depth) < 1)
  )
    fail('归途记录无效。');
  const ranked =
    run.ranked &&
    Number(data.duration) <= ((now - run.started_at) / 1000) * 1.2 + 5 &&
    Number(data.depth) <= run.checkpoint;
  const raw = data.details;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    fail('缺少远征档案。');
  const details = raw as Record<string, unknown>;
  const safe: Record<string, unknown> = {};
  safe.revivalsUsed = numeric(details.revivalsUsed, 0, 3, true)
    ? details.revivalsUsed
    : 0;
  safe.checkpointStart = (run.start_room || 1) > 1 ? run.start_room : 0;
  for (const key of [
    'weaponTier',
    'maxHp',
    'kills',
    'chests',
    'gates',
    'doubleBossWins',
    'flawlessBosses',
    'reforges',
    'keysOpened',
  ]) {
    if (
      !numeric(
        details[key],
        0,
        key === 'maxHp' ? 1e12 : Number.MAX_SAFE_INTEGER,
      )
    )
      fail('档案数值无效。');
    safe[key] = details[key];
  }
  for (const key of ['power', 'legion', 'dps']) {
    if (!numeric(details[key], 0, 1e220)) fail('构筑数值无效。');
    safe[key] = details[key];
  }
  if (
    !Array.isArray(details.allies) ||
    details.allies.length > 2 ||
    details.allies.some((id) => typeof id !== 'string' || id.length > 30)
  )
    fail('盟誓记录无效。');
  safe.allies = details.allies;
  if (
    !details.relics ||
    typeof details.relics !== 'object' ||
    Array.isArray(details.relics) ||
    Object.keys(details.relics).length > 60
  )
    fail('符文记录无效。');
  safe.relics = Object.fromEntries(
    Object.entries(details.relics as Record<string, unknown>).map(
      ([id, count]) => {
        if (
          !/^[a-z_]+$/.test(id) ||
          id.length > 32 ||
          !numeric(count, 1, 10, true)
        )
          fail('符文层数无效。');
        return [id, count];
      },
    ),
  );
  return {
    ranked: ranked ? 1 : 0,
    peakMagnitude,
    details: JSON.stringify(safe),
    title: cleanName(data.title ?? '', 24),
  };
}
export async function chronicleHandler(
  request: Request,
  env: ChronicleEnv,
): Promise<Response> {
  const url = new URL(request.url);
  const origin = request.headers.get('Origin');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    Vary: 'Origin',
  };
  if (origin && (origins.has(origin) || origin === url.origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Headers'] = 'Authorization, Content-Type';
    headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
  }
  const reply = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), { status, headers });
  if (request.method === 'OPTIONS')
    return new Response(null, { status: 204, headers });
  try {
    if (origin && !origins.has(origin) && origin !== url.origin)
      fail('此处无法写入史册。', 403);
    if (!env.DB) fail('史册尚未连上档案馆。', 503);
    const action = url.pathname.split('/').filter(Boolean).at(-1);
    if (request.method === 'GET' && action === 'health') {
      await env.DB.prepare('SELECT id FROM travellers LIMIT 1').all();
      return reply({ ready: true, version: '1.2.2' });
    }
    const page =
      Math.max(0, Math.min(10000, Number(url.searchParams.get('page')) || 0)) |
      0;
    if (request.method === 'GET' && action === 'board') {
      const mode = url.searchParams.get('mode') || 'normal';
      const classId = url.searchParams.get('class') || 'all';
      if (
        !MODES.includes(mode) ||
        (classId !== 'all' && !CLASSES.includes(classId))
      )
        fail('未知的远征谱系。');
      const metric =
        url.searchParams.get('sort') ||
        (mode === 'endless' ? 'depth' : 'duration');
      const orders: Record<string, string> = {
        duration: 'duration ASC, depth DESC',
        depth: 'depth DESC, duration ASC',
        army: 'peak_exponent DESC, peak_mantissa DESC, depth DESC',
        gold: 'gold DESC, depth DESC',
      };
      const order = orders[metric];
      if (!order) fail('未知的史册排序。');
      const route = url.searchParams.get('route') || '1';
      if (!['1', '46', '91', 'all'].includes(route)) fail('未知的启程篝火。');
      const routeClause =
        mode === 'endless' && route !== 'all'
          ? `AND e.start_room = ${Number(route)}`
          : '';
      const query = `WITH ranked_runs AS (SELECT e.id, p.name, e.title, e.mode, e.class_id, e.depth, e.duration, e.peak_squad, e.peak_mantissa, e.peak_exponent, e.gold, e.finished_at, e.details, e.seed, e.status, e.ranked, e.start_room, e.ruleset, EXISTS(SELECT 1 FROM expeditions a WHERE a.traveller_id=p.id AND a.mode='endless' AND a.status='won' AND a.depth=100 AND a.ruleset='ascension-v1') AS ascended, ROW_NUMBER() OVER (PARTITION BY e.traveller_id ORDER BY ${order}, e.finished_at ASC, e.id ASC) AS best FROM expeditions e JOIN travellers p ON p.id = e.traveller_id WHERE e.mode = ? AND e.ranked = 1 AND ${mode === 'endless' ? `e.ruleset = 'ascension-v1' AND e.status IN ('won','lost','retired') AND e.depth >= 5 ${metric === 'duration' ? "AND e.status = 'won'" : ''}` : "e.status = 'won'"} ${routeClause} ${classId === 'all' ? '' : 'AND e.class_id = ?'}) SELECT * FROM ranked_runs WHERE best = 1 ORDER BY ${order}, finished_at ASC, id ASC LIMIT 21 OFFSET ?`;
      const params =
        classId === 'all' ? [mode, page * 20] : [mode, classId, page * 20];
      const { results } = await env.DB.prepare(query)
        .bind(...params)
        .all();
      return reply({
        rows: results.slice(0, 20),
        more: results.length > 20,
        page,
      });
    }
    const token =
      request.headers.get('Authorization')?.replace(/^Bearer /, '') || '';
    if (!/^[a-f0-9]{64}$/.test(token)) fail('请先留下旅人之名。', 401);
    const tokenHash = await hash(token);
    let traveller = await env.DB.prepare(
      "SELECT p.id, p.name, EXISTS(SELECT 1 FROM expeditions a WHERE a.traveller_id=p.id AND a.mode='endless' AND a.status='won' AND a.depth=100 AND a.ruleset='ascension-v1') AS ascended FROM travellers p WHERE token_hash = ?",
    )
      .bind(tokenHash)
      .first<Traveller>();
    if (request.method === 'GET' && action === 'profile')
      return traveller ? reply(traveller) : fail('尚未登记旅人之名。', 404);
    if (request.method === 'GET' && action === 'history') {
      if (!traveller) fail('尚未登记旅人之名。', 401);
      const favoritesOnly = url.searchParams.get('favorite') === '1';
      const { results } = await env.DB.prepare(
        `SELECT e.id, p.name, e.title, e.mode, e.class_id, e.depth, e.duration, e.peak_squad, e.peak_mantissa, e.peak_exponent, e.gold, e.finished_at, e.details, e.seed, e.status, e.ranked, e.favorite, e.start_room, e.ruleset, EXISTS(SELECT 1 FROM expeditions a WHERE a.traveller_id=p.id AND a.mode='endless' AND a.status='won' AND a.depth=100 AND a.ruleset='ascension-v1') AS ascended FROM expeditions e JOIN travellers p ON p.id=e.traveller_id WHERE e.traveller_id = ? AND e.status != 'active' ${favoritesOnly ? 'AND e.favorite = 1' : ''} ORDER BY e.finished_at DESC, e.id ASC LIMIT 21 OFFSET ?`,
      )
        .bind(traveller!.id, page * 20)
        .all();
      return reply({
        rows: results.slice(0, 20),
        more: results.length > 20,
        page,
      });
    }
    if (request.method !== 'POST') fail('这条路不通。', 404);
    if (!request.headers.get('Content-Type')?.startsWith('application/json'))
      fail('档案格式无效。', 415);
    if (Number(request.headers.get('Content-Length')) > 16000)
      fail('档案过长。', 413);
    const reader = request.body?.getReader();
    const decoder = new TextDecoder();
    let text = '',
      bytes = 0;
    if (reader)
      while (true) {
        const part = await reader.read();
        if (part.done) break;
        bytes += part.value.byteLength;
        if (bytes > 16000) {
          await reader.cancel();
          fail('档案过长。', 413);
        }
        text += decoder.decode(part.value, { stream: true });
      }
    text += decoder.decode();
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(text);
    } catch {
      return fail('档案格式无效。');
    }
    if (!data || typeof data !== 'object' || Array.isArray(data))
      fail('档案格式无效。');
    const now = Date.now();
    const ipHash = await hash(
      request.headers.get('CF-Connecting-IP') || tokenHash,
    );
    const key = `${action === 'profile' && !traveller ? 'join' : 'write'}:${ipHash}`;
    const bucket = Math.floor(now / 3600000);
    const quota = await env.DB.prepare(
      'INSERT INTO chronicle_limits (key, bucket, count) VALUES (?, ?, 1) ON CONFLICT(key) DO UPDATE SET count = CASE WHEN bucket = excluded.bucket THEN count + 1 ELSE 1 END, bucket = excluded.bucket RETURNING count',
    )
      .bind(key, bucket)
      .first<{ count: number }>();
    if ((quota?.count || 0) > (key.startsWith('join:') ? 30 : 1500))
      fail('渡鸦正在休息，请稍后再来。', 429);
    if (action === 'profile') {
      const name = cleanName(data.name, 16, '无名旅人');
      const id = traveller?.id || crypto.randomUUID();
      await env.DB.prepare(
        'INSERT INTO travellers (id, token_hash, name, created_at) VALUES (?, ?, ?, ?) ON CONFLICT(token_hash) DO UPDATE SET name = excluded.name',
      )
        .bind(id, tokenHash, name, now)
        .run();
      traveller = await env.DB.prepare(
        "SELECT p.id, p.name, EXISTS(SELECT 1 FROM expeditions a WHERE a.traveller_id=p.id AND a.mode='endless' AND a.status='won' AND a.depth=100 AND a.ruleset='ascension-v1') AS ascended FROM travellers p WHERE token_hash = ?",
      )
        .bind(tokenHash)
        .first<Traveller>();
      return reply(traveller);
    }
    if (!traveller) fail('请先留下旅人之名。', 401);
    if (!UUID.test(String(data.id))) fail('远征印记无效。');
    if (action === 'start') {
      if (data.devMode === true) fail('演练不记入正式史册。');
      if (
        !MODES.includes(String(data.mode)) ||
        !CLASSES.includes(String(data.classId)) ||
        !numeric(data.seed, 0, 4294967295, true)
      )
        fail('启程档案无效。');
      const startRoom = data.startRoom ?? 1;
      if (
        typeof startRoom !== 'number' ||
        ![1, 46, 91].includes(startRoom) ||
        (startRoom !== 1 && data.mode !== 'endless')
      )
        fail('启程篝火无效。');
      if (Number(startRoom) > 1) {
        const earned = await env.DB.prepare(
          "SELECT MAX(checkpoint) AS depth FROM expeditions WHERE traveller_id=? AND mode='endless' AND ruleset='ascension-v1'",
        )
          .bind(traveller!.id)
          .first<{ depth: number }>();
        if ((earned?.depth || 0) < Number(startRoom) - 1)
          fail('这座篝火尚未点亮。', 403);
      }
      await env.DB.prepare(
        'INSERT INTO expeditions (id, traveller_id, mode, class_id, seed, started_at, ranked, start_room, checkpoint, ruleset) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING',
      )
        .bind(
          data.id,
          traveller!.id,
          data.mode,
          data.classId,
          data.seed,
          now,
          data.offline === true ? 0 : 1,
          startRoom,
          Number(startRoom) - 1,
          data.ruleset === 'ascension-v1' ? 'ascension-v1' : 'legacy',
        )
        .run();
    }
    const run = await env.DB.prepare(
      'SELECT id, traveller_id, mode, class_id, seed, started_at, status, checkpoint, ranked, start_room, ruleset FROM expeditions WHERE id = ? AND traveller_id = ?',
    )
      .bind(data.id, traveller!.id)
      .first<Expedition>();
    if (!run) fail('找不到属于你的这次远征。', 404);
    if (action === 'start')
      return reply({ id: run!.id, ranked: Boolean(run!.ranked) });
    if (action === 'checkpoint') {
      if (
        !numeric(
          data.depth,
          0,
          run!.mode === 'endless'
            ? run!.ruleset === 'ascension-v1'
              ? 100
              : 999999
            : 15,
          true,
        )
      )
        fail('关数无效。');
      if (Number(data.depth) > run!.checkpoint + 1)
        fail('远征足迹尚未连贯。', 409);
      await env.DB.prepare(
        "UPDATE expeditions SET checkpoint = MAX(checkpoint, ?) WHERE id = ? AND traveller_id = ? AND status = 'active'",
      )
        .bind(data.depth, data.id, traveller!.id)
        .run();
      return reply({ saved: true });
    }
    if (action === 'finish') {
      if (run!.status !== 'active')
        return reply({
          saved: true,
          duplicate: true,
          ranked: Boolean(run!.ranked),
        });
      const valid = validateResult(data, run!, now);
      await env.DB.prepare(
        "UPDATE expeditions SET status=?, title=?, depth=?, duration=?, peak_squad=?, peak_mantissa=?, peak_exponent=?, gold=?, details=?, ranked=?, finished_at=? WHERE id=? AND traveller_id=? AND status='active'",
      )
        .bind(
          data.status,
          valid.title,
          data.depth,
          data.duration,
          data.peakSquad,
          valid.peakMagnitude.mantissa,
          valid.peakMagnitude.exponent,
          data.gold,
          valid.details,
          valid.ranked,
          now,
          data.id,
          traveller!.id,
        )
        .run();
      return reply({ saved: true, ranked: Boolean(valid.ranked) });
    }
    if (action === 'favorite') {
      if (run!.status === 'active') fail('这次远征尚未结算，请稍后重试。', 409);
      if (typeof data.favorite !== 'boolean') fail('珍藏印记无效。');
      await env.DB.prepare(
        "UPDATE expeditions SET favorite=? WHERE id=? AND traveller_id=? AND status!='active'",
      )
        .bind(data.favorite ? 1 : 0, data.id, traveller!.id)
        .run();
      return reply({ saved: true, favorite: data.favorite });
    }
    if (action === 'title') {
      if (run!.status === 'active') fail('这次远征尚未结算，请稍后重试。', 409);
      await env.DB.prepare(
        "UPDATE expeditions SET title=? WHERE id=? AND traveller_id=? AND status!='active'",
      )
        .bind(cleanName(data.title ?? '', 24), data.id, traveller!.id)
        .run();
      return reply({ saved: true });
    }
    return fail('这条路不通。', 404);
  } catch (error) {
    const known = error as Error & { status?: number };
    return reply(
      {
        error: known.status
          ? known.message
          : '渡鸦暂时失去了方向，请稍后重试。',
      },
      known.status || 500,
    );
  }
}
