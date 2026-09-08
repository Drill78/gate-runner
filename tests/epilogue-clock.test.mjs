import test from 'node:test';
import assert from 'node:assert/strict';
import { EpilogueClock } from '../lib/epilogue-clock.ts';
import { EPILOGUE_DURATION_SECONDS } from '../lib/epilogue.ts';

const playback = (status, position = 0, duration = 83.4666667) => ({
  status,
  position,
  duration,
});
test('the recording owns time and reaching its duration alone cannot end the game', () => {
  const clock = new EpilogueClock();
  clock.advance(playback('loading'), 3, false);
  assert.equal(clock.position, 0);
  clock.advance(playback('playing', 48), 0.2, false);
  assert.equal(clock.position, 48);
  clock.advance(playback('playing', 83.4666667), 0.2, false);
  assert.equal(clock.ended, false);
  clock.advance(playback('ended', 83.4666667), 0.01, false);
  assert.equal(clock.ended, true);
  assert.equal(clock.fallback, false);
});
test('pause freezes loading timeout and the silent fallback; late recordings cannot restart it', () => {
  const clock = new EpilogueClock();
  clock.advance(playback('loading'), 120, true);
  assert.equal(clock.fallback, false);
  clock.advance(playback('loading'), 12, false);
  assert.equal(clock.fallback, true);
  assert.equal(clock.position, 0);
  clock.advance(playback('playing', 2), 50, false);
  assert.equal(clock.position, 50);
  clock.advance(playback('ended', 83), 120, true);
  assert.equal(clock.position, 50);
  clock.advance(playback('ended', 83), 10, false);
  assert.equal(clock.ended, false);
  clock.advance(playback('idle'), 24, false);
  assert.equal(clock.position, EPILOGUE_DURATION_SECONDS);
  assert.equal(clock.ended, true);
});
test('failure after partial playback preserves already played time; a new curtain call starts fresh', () => {
  const clock = new EpilogueClock();
  clock.advance(playback('playing', 20), 0.1, false);
  clock.advance(playback('failed'), 0.1, false);
  assert.equal(clock.fallback, true);
  assert.equal(clock.position, 20);
  clock.advance(playback('idle'), 40, false);
  assert.equal(clock.position, 60);
  assert.equal(new EpilogueClock().position, 0);
});
