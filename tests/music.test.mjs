import test from 'node:test';
import assert from 'node:assert/strict';
import {
  battleMusic,
  sceneMusic,
  MUSIC_TRACKS,
  MusicPlayer,
} from '../lib/music.ts';

const flush = () => new Promise((resolve) => setImmediate(resolve));
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
};

function fixture(options = {}) {
  const started = [],
    requested = [],
    operations = [];
  let created = 0;
  const ctx = {
    state: 'suspended',
    currentTime: 42,
    destination: {},
    async resume() {
      operations.push('resume');
      if (options.resume) await options.resume();
      if (!options.resumeWithoutRunning) this.state = 'running';
    },
    async suspend() {
      operations.push('suspend');
      if (options.suspend) await options.suspend();
      this.state = 'suspended';
    },
    createGain() {
      return {
        connect() {},
        disconnect() {
          this.disconnected = true;
        },
        gain: {
          value: 1,
          cancelScheduledValues() {},
          setValueAtTime(value) {
            this.value = value;
          },
          linearRampToValueAtTime(value) {
            this.value = value;
          },
        },
      };
    },
    async decodeAudioData(data) {
      if (options.decode) return options.decode(data);
      return {
        duration: options.duration ?? 83.52,
        byteLength: data.byteLength,
      };
    },
    createBufferSource() {
      return {
        loop: false,
        buffer: null,
        onended: null,
        stopAt: Infinity,
        connect(gain) {
          this.gain = gain;
        },
        disconnect() {
          this.disconnected = true;
        },
        start() {
          if (options.startFails) throw new Error('source unavailable');
          this.startedAt = ctx.currentTime;
          started.push(this);
        },
        stop(when = ctx.currentTime) {
          this.stopped = true;
          this.stopAt = when;
          if (when <= ctx.currentTime) this.onended?.();
        },
      };
    },
  };
  const player = new MusicPlayer(
    () => {
      created++;
      if (options.contextFails) throw new Error('context unavailable');
      return ctx;
    },
    async (url) => {
      requested.push(url);
      return options.fetch ? options.fetch(url) : new ArrayBuffer(8);
    },
  );
  const advance = (seconds, deliverEnded = true) => {
    if (ctx.state !== 'running') return;
    ctx.currentTime += seconds;
    if (deliverEnded)
      for (const source of started) {
        if (source.disconnected) continue;
        if (
          ctx.currentTime >= source.stopAt ||
          (!source.loop &&
            ctx.currentTime >= source.startedAt + source.buffer.duration)
        )
          source.onended?.();
      }
  };
  return {
    player,
    ctx,
    started,
    requested,
    operations,
    advance,
    created: () => created,
  };
}

async function startOnce(f, key = 'battle-101', muted = false) {
  f.player.setState('congratulations', false, muted, key);
  f.player.unlock();
  await flush();
}

test('normal, chapter, king and forbidden music remain distinct', () => {
  const battle = (kind, id, enchanted = false) => ({
    player: { node: { kind, enchanted } },
    entities: [{ encounterId: id }],
  });
  assert.equal(battleMusic(battle('battle', 'executioner')), 'normal');
  assert.equal(battleMusic(battle('elite', 'hexblade')), 'normal');
  for (const id of ['watcher', 'wyvern', 'lich', 'oracle'])
    assert.equal(battleMusic(battle('boss', id)), 'boss');
  for (const id of ['king', 'king-reborn'])
    assert.equal(battleMusic(battle('boss', id)), 'final');
  assert.equal(battleMusic(battle('elite', 'hexblade', true)), 'forbidden');
});

test('rooms 91–98, 99, 100 and 101 select their own scores and credits are silent', () => {
  const run = (floor, difficulty = 'endless') => ({ floor, difficulty });
  const battle = (floor, difficulty) => ({
    player: { ...run(floor, difficulty), node: { kind: 'boss' } },
    entities: [{ encounterId: 'king' }],
  });
  assert.equal(battleMusic(battle(89)), 'final');
  for (let floor = 90; floor <= 97; floor++)
    assert.equal(battleMusic(battle(floor)), 'stair-heaven');
  assert.equal(battleMusic(battle(98)), 'crown-fracture');
  assert.equal(battleMusic(battle(99)), 'dawn-judgment');
  assert.equal(battleMusic(battle(100)), 'congratulations');
  for (const floor of [90, 97, 98, 99, 100])
    assert.equal(sceneMusic('map', run(floor)), 'stair-heaven');
  assert.equal(sceneMusic('ascension', run(100)), 'stair-heaven');
  assert.equal(sceneMusic('victory', run(101)), null);
  assert.equal(sceneMusic('battle', run(90)), null);
  assert.equal(sceneMusic('setup', run(100)), 'menu');
  assert.equal(sceneMusic('defeat', run(95)), 'menu');
  assert.equal(battleMusic(battle(90, 'hard')), 'final');
  assert.equal(sceneMusic('map', run(89)), 'map');
  assert.equal(sceneMusic('event'), 'event');
  assert.equal(sceneMusic('shop'), 'shop');
  assert.equal(sceneMusic('victory'), 'menu');
});

test('looping BGM waits for gesture, pauses in place and reuses decoded buffers', async () => {
  const f = fixture();
  const { player, ctx, started, requested } = f;
  player.setState('normal', false, false);
  await flush();
  assert.equal(requested.length, 0);
  player.unlock();
  await flush();
  assert.equal(started.length, 1);
  assert.equal(started[0].loop, true);
  player.setState('normal', true, false);
  await flush();
  assert.equal(ctx.state, 'suspended');
  player.setState('normal', false, false);
  await flush();
  assert.equal(ctx.state, 'running');
  assert.equal(started.length, 1);
  player.setState('normal', false, true);
  await flush();
  assert.equal(ctx.state, 'suspended');
  player.setState('boss', false, false);
  await flush();
  assert.equal(started[0].stopped, true);
  assert.equal(started.length, 2);
  player.setState('normal', false, false);
  await flush();
  assert.equal(requested.length, 2);
  player.setState(null, true, false);
  await flush();
  assert.ok(started.every((source) => source.stopped && source.disconnected));
  assert.equal(ctx.state, 'suspended');
});

test('new loop scores use exact composed prelude boundaries without replay on pause', async () => {
  const { player, started, requested } = fixture();
  for (const [track, loopStart] of [
    ['stair-heaven', 8],
    ['crown-fracture', 0],
    ['dawn-judgment', 24],
  ]) {
    player.setState(track, false, false);
    player.unlock();
    await flush();
    const count = started.length;
    assert.equal(started.at(-1).loop, true);
    assert.equal(started.at(-1).loopStart, loopStart);
    assert.equal(MUSIC_TRACKS[track].loopStart, loopStart);
    player.setState(track, true, false);
    await flush();
    player.setState(track, false, false);
    await flush();
    assert.equal(started.length, count);
  }
  assert.deepEqual(requested, [
    '/audio/stair-heaven.mp3',
    '/audio/crown-fracture.mp3',
    '/audio/dawn-judgment.mp3',
  ]);
});

test('late downloads cannot replace the active encounter', async () => {
  const pending = new Map();
  const f = fixture({
    fetch: (url) => {
      const item = deferred();
      pending.set(url, item);
      return item.promise;
    },
  });
  f.player.setState('normal', false, false);
  f.player.unlock();
  await flush();
  f.player.setState('forbidden', false, false);
  pending.get('/audio/forbidden.mp3').resolve(new ArrayBuffer(3));
  await flush();
  pending.get('/audio/normal.mp3?v=1.0').resolve(new ArrayBuffer(8));
  await flush();
  assert.equal(f.started.length, 1);
  assert.equal(f.started[0].buffer.byteLength, 3);
});

test('one-shot position follows the audio clock and only onended confirms completion', async () => {
  const f = fixture({ duration: 83.4666667 });
  f.player.setState('congratulations', false, false, 'ending');
  assert.deepEqual(f.player.playback('ending'), {
    status: 'loading',
    position: 0,
    duration: 0,
  });
  assert.equal(f.requested.length, 0);
  f.player.unlock();
  await flush();
  assert.equal(f.started[0].loop, false);
  assert.equal(f.player.playback('ending').duration, 83.4666667);
  f.advance(12);
  assert.equal(f.player.playback('ending').position, 12);
  f.advance(72, false);
  assert.deepEqual(f.player.playback('ending'), {
    status: 'playing',
    position: 83.4666667,
    duration: 83.4666667,
  });
  f.started[0].onended();
  assert.deepEqual(f.player.playback('ending'), {
    status: 'ended',
    position: 83.4666667,
    duration: 83.4666667,
  });
  for (let frame = 0; frame < 120; frame++)
    f.player.setState('congratulations', false, false, 'ending');
  f.player.setState('congratulations', true, true, 'ending');
  f.player.setState('congratulations', false, false, 'ending');
  f.player.unlock();
  await flush();
  assert.equal(f.started.length, 1);
  assert.equal(f.requested.length, 1);
  assert.equal(f.player.playback('ending').status, 'ended');
});

test('one-shot mute preserves time, pause freezes it, and unmute uses the same source', async () => {
  const f = fixture();
  await startOnce(f);
  f.advance(10);
  f.player.setState('congratulations', false, true, 'battle-101');
  await flush();
  assert.equal(f.ctx.state, 'running');
  assert.equal(f.started[0].gain.gain.value, 0);
  f.advance(5);
  assert.equal(f.player.playback('battle-101').position, 15);
  f.player.setState('congratulations', true, true, 'battle-101');
  await flush();
  f.advance(300);
  assert.equal(f.player.playback('battle-101').position, 15);
  assert.equal(f.player.playback('battle-101').status, 'playing');
  f.player.setState('congratulations', false, false, 'battle-101');
  await flush();
  f.advance(2);
  assert.equal(f.player.playback('battle-101').position, 17);
  assert.equal(f.started[0].gain.gain.value, 1);
  assert.equal(f.started.length, 1);
});

test('a muted gesture unlocks silent scenes and later muted one-shots', async () => {
  const f = fixture();
  f.player.setState('menu', false, true);
  f.player.unlock();
  await flush();
  assert.equal(f.created(), 1);
  assert.ok(f.operations.includes('resume'));
  assert.equal(f.ctx.state, 'suspended');
  assert.equal(f.requested.length, 0);
  f.player.setState('congratulations', false, true, 'muted-ending');
  await flush();
  f.advance(20);
  assert.equal(f.player.playback('muted-ending').position, 20);
  assert.equal(f.started[0].gain.gain.value, 0);
  f.player.unlock(true);
  assert.equal(f.started[0].gain.gain.value, 1);
  assert.equal(f.player.playback('muted-ending').position, 20);
});

test('new one-shot object keys replay from zero while stale ended handlers cannot finish them', async () => {
  const f = fixture();
  const first = {},
    second = {};
  await startOnce(f, first);
  f.advance(25);
  const staleEnded = f.started[0].onended;
  f.player.setState('congratulations', false, false, second);
  await flush();
  assert.equal(f.started.length, 2);
  assert.equal(f.started[0].stopped, true);
  assert.equal(f.requested.length, 1);
  assert.equal(f.player.playback(first).status, 'idle');
  assert.equal(f.player.playback(second).position, 0);
  staleEnded();
  assert.equal(f.player.playback(second).status, 'playing');
  assert.equal(f.started[1].disconnected, undefined);
  f.advance(84);
  assert.equal(f.player.playback(second).status, 'ended');
  f.player.setState('congratulations', false, true, {});
  await flush();
  assert.equal(f.started.length, 3);
});

test('paused downloads prepare duration and only begin after resume', async () => {
  const pending = deferred();
  const f = fixture({ fetch: () => pending.promise });
  await startOnce(f);
  f.player.setState('congratulations', true, false, 'battle-101');
  pending.resolve(new ArrayBuffer(8));
  await flush();
  assert.equal(f.started.length, 0);
  assert.deepEqual(f.player.playback('battle-101'), {
    status: 'loading',
    position: 0,
    duration: 83.52,
  });
  f.player.setState('congratulations', false, true, 'battle-101');
  await flush();
  assert.equal(f.started.length, 1);
  assert.equal(f.started[0].gain.gain.value, 0);
  assert.equal(f.requested.length, 1);
});

test('a reused pending buffer starts only the latest key and never after exit', async () => {
  const pending = deferred();
  const f = fixture({ fetch: () => pending.promise });
  await startOnce(f, 'first');
  f.player.setState('congratulations', false, false, 'second');
  pending.resolve(new ArrayBuffer(8));
  await flush();
  assert.equal(f.started.length, 1);
  assert.equal(f.player.playback('first').status, 'idle');
  assert.equal(f.player.playback('second').status, 'playing');
  const oldEnded = f.started[0].onended;
  f.player.setState(null, true, false);
  oldEnded();
  await flush();
  assert.equal(f.player.playback('second').status, 'idle');
  assert.equal(f.started[0].disconnected, true);

  const late = deferred();
  const exited = fixture({ fetch: () => late.promise });
  await startOnce(exited, 'abandoned');
  exited.player.setState(null, true, false);
  late.resolve(new ArrayBuffer(8));
  await flush();
  assert.equal(exited.started.length, 0);
  assert.equal(exited.ctx.state, 'suspended');
});

test('fetch and decode failures remain terminal for a key but a new battle can retry', async () => {
  for (const failure of ['fetch', 'decode']) {
    let failing = true;
    const f = fixture({
      fetch: async () => {
        if (failing && failure === 'fetch') throw new Error('offline');
        return new ArrayBuffer(8);
      },
      decode: async () => {
        if (failing && failure === 'decode') throw new Error('invalid mp3');
        return { duration: 83.52 };
      },
    });
    await startOnce(f, 'failed');
    assert.equal(f.player.playback('failed').status, 'failed');
    for (let frame = 0; frame < 30; frame++) {
      f.player.setState(
        'congratulations',
        frame % 2 === 0,
        frame % 3 === 0,
        'failed',
      );
      f.player.unlock();
      await flush();
    }
    assert.equal(f.requested.length, 1);
    assert.equal(f.started.length, 0);
    failing = false;
    f.player.setState('congratulations', false, false, 'retry');
    await flush();
    assert.equal(f.requested.length, 2);
    assert.equal(f.player.playback('retry').status, 'playing');
  }
});

test('late rejection of an abandoned load does not fail the new music', async () => {
  const late = deferred();
  const f = fixture({
    fetch: (url) =>
      url.includes('congratulations')
        ? late.promise
        : Promise.resolve(new ArrayBuffer(8)),
  });
  await startOnce(f, 'abandoned');
  f.player.setState('stair-heaven', false, false);
  await flush();
  late.reject(new Error('late network failure'));
  await flush();
  assert.equal(f.started.length, 1);
  assert.equal(f.started[0].loop, true);
  assert.equal(f.started[0].stopped, undefined);
  assert.equal(f.player.playback('abandoned').status, 'idle');
});

test('resume resolving after pause settles suspended without losing prepared audio', async () => {
  const pendingResume = deferred();
  const f = fixture({ resume: () => pendingResume.promise });
  await startOnce(f);
  assert.equal(f.player.playback('battle-101').status, 'loading');
  assert.equal(f.player.playback('battle-101').position, 0);
  f.player.setState('congratulations', true, false, 'battle-101');
  pendingResume.resolve();
  await flush();
  assert.equal(f.ctx.state, 'suspended');
  f.advance(20);
  assert.equal(f.player.playback('battle-101').position, 0);
  f.player.setState('congratulations', false, false, 'battle-101');
  await flush();
  f.advance(5);
  assert.equal(f.player.playback('battle-101').position, 5);
  assert.equal(f.started.length, 1);
});

test('unavailable audio, invalid duration and early source endings cannot masquerade as completion', async () => {
  for (const options of [
    { contextFails: true },
    {
      resume: async () => {
        throw new Error('not allowed');
      },
    },
    { resumeWithoutRunning: true },
    { duration: 0 },
    { duration: NaN },
    { startFails: true },
  ]) {
    const f = fixture(options);
    await startOnce(f);
    assert.equal(f.player.playback('battle-101').status, 'failed');
    const requests = f.requested.length;
    for (let frame = 0; frame < 20; frame++)
      f.player.setState('congratulations', false, false, 'battle-101');
    await flush();
    assert.equal(f.requested.length, requests);
  }
  const f = fixture();
  await startOnce(f);
  f.advance(5);
  f.started[0].onended();
  assert.deepEqual(f.player.playback('battle-101'), {
    status: 'failed',
    position: 5,
    duration: 83.52,
  });
});

test('externally suspended or closed audio reports fallback-ready status', async () => {
  const f = fixture();
  await startOnce(f);
  f.advance(7);
  f.ctx.state = 'suspended';
  assert.equal(f.player.playback('battle-101').status, 'loading');
  assert.equal(f.player.playback('battle-101').position, 7);
  f.ctx.state = 'running';
  assert.equal(f.player.playback('battle-101').status, 'playing');
  f.ctx.state = 'closed';
  assert.deepEqual(f.player.playback('battle-101'), {
    status: 'failed',
    position: 7,
    duration: 83.52,
  });
});
