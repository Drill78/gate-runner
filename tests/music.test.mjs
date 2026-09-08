import test from 'node:test';
import assert from 'node:assert/strict';
import {
  battleMusic,
  sceneMusic,
  MUSIC_TRACKS,
  MusicPlayer,
} from '../lib/music.ts';

const flush = () => new Promise((resolve) => setImmediate(resolve));
function fixture() {
  const started = [];
  const requested = [];
  const ctx = {
    state: 'suspended',
    currentTime: 42,
    destination: {},
    async resume() {
      this.state = 'running';
    },
    async suspend() {
      this.state = 'suspended';
    },
    createGain() {
      return {
        connect() {},
        gain: {
          value: 1,
          cancelScheduledValues() {},
          setValueAtTime() {},
          linearRampToValueAtTime() {},
        },
      };
    },
    async decodeAudioData(data) {
      return data;
    },
    createBufferSource() {
      return {
        connect() {},
        start() {
          started.push(this);
        },
        stop() {
          this.stopped = true;
        },
      };
    },
  };
  const player = new MusicPlayer(
    () => ctx,
    async (url) => {
      requested.push(url);
      return new ArrayBuffer(8);
    },
  );
  return { ctx, player, started, requested };
}

test('encounter music selects separate forbidden score and escalates chapter/final scores', () => {
  const battle = (kind, id, enchanted = false) => ({
    player: { node: { kind, enchanted } },
    entities: [{ encounterId: id }],
  });
  assert.equal(battleMusic(battle('battle', 'executioner')), 'normal');
  assert.equal(battleMusic(battle('elite', 'hexblade')), 'normal');
  for (const id of ['watcher', 'wyvern', 'lich', 'oracle'])
    assert.equal(battleMusic(battle('boss', id)), 'boss');
  assert.equal(battleMusic(battle('boss', 'king')), 'final');
  assert.equal(battleMusic(battle('elite', 'hexblade', true)), 'forbidden');
});

test('music waits for gesture, loops, pauses in place and reuses decoded buffers', async () => {
  const { player, ctx, started, requested } = fixture();
  player.setState('normal', false, false);
  await flush();
  assert.equal(requested.length, 0);
  player.unlock();
  await flush();
  assert.equal(started.length, 1);
  assert.equal(started[0].loop, true);
  player.setState('normal', true, false);
  assert.equal(ctx.state, 'suspended');
  player.setState('normal', false, false);
  assert.equal(ctx.state, 'running');
  assert.equal(started.length, 1);
  player.setState('normal', false, true);
  assert.equal(ctx.state, 'suspended');
  player.setState('boss', false, false);
  await flush();
  assert.equal(started[0].stopped, true);
  assert.equal(started.length, 2);
  player.setState('normal', false, false);
  await flush();
  assert.equal(requested.length, 2);
  player.setState(null, true, false);
  assert.equal(started[2].stopped, true);
  assert.equal(ctx.state, 'suspended');
});

test('late downloaded music cannot replace the active encounter', async () => {
  const { ctx, started } = fixture();
  const pending = {};
  const player = new MusicPlayer(
    () => ctx,
    (url) =>
      new Promise((resolve) => {
        pending[url] = resolve;
      }),
  );
  player.setState('normal', false, false);
  player.unlock();
  await flush();
  player.setState('forbidden', false, false);
  pending['/audio/forbidden.mp3'](new ArrayBuffer(3));
  await flush();
  pending['/audio/normal.mp3?v=1.0'](new ArrayBuffer(8));
  await flush();
  assert.equal(started.length, 1);
  assert.equal(started[0].buffer.byteLength, 3);
});

test('Ascension score begins at room 91 and continues through its map and ending', () => {
  const run = (floor, difficulty = 'endless') => ({ floor, difficulty });
  const battle = (floor, difficulty) => ({
    player: { ...run(floor, difficulty), node: { kind: 'boss' } },
    entities: [{ encounterId: 'king' }],
  });
  assert.equal(battleMusic(battle(89)), 'final');
  for (const floor of [90, 98, 99, 100]) {
    assert.equal(battleMusic(battle(floor)), 'ascension');
    assert.equal(sceneMusic('map', run(floor)), 'ascension');
  }
  assert.equal(sceneMusic('victory', run(100)), 'ascension');
  assert.equal(sceneMusic('battle', run(90)), null);
  assert.equal(sceneMusic('setup', run(100)), 'menu');
  assert.equal(sceneMusic('defeat', run(95)), 'menu');
  assert.equal(battleMusic(battle(90, 'hard')), 'final');
  assert.equal(sceneMusic('map', run(89)), 'map');
  assert.equal(sceneMusic('event'), 'event');
  assert.equal(sceneMusic('shop'), 'shop');
  assert.equal(sceneMusic('victory'), 'menu');
});

test('Ascension prelude plays once and its body resumes across map and battle', async () => {
  const { player, started, requested } = fixture();
  player.setState('ascension', false, false);
  player.unlock();
  await flush();
  assert.equal(started.length, 1);
  assert.equal(started[0].loop, true);
  assert.equal(started[0].loopStart, 15);
  assert.equal(MUSIC_TRACKS.ascension.loopStart, 15);
  assert.deepEqual(requested, ['/audio/ascension.mp3?v=1.2']);
  player.setState('ascension', true, false);
  player.setState('ascension', false, false);
  await flush();
  assert.equal(started.length, 1);
});
