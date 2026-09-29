import assert from 'node:assert/strict';
import test from 'node:test';
import { initialDemoState, canOpenCase, reactorSnapshot, submitDemoCase, applyDemoReview, auditEligible } from '../dist/tag1-state.js';

test('only the first reactor opens initially', () => {
  const state = initialDemoState();
  assert.equal(canOpenCase(state, 1), true);
  for (let id = 2; id <= 6; id += 1) assert.equal(canOpenCase(state, id), false);
  assert.equal(reactorSnapshot(state).reactors[1].visual, 'locked');
});

test('a qualified submission seals its reactor and opens the next one', () => {
  const state = submitDemoCase(initialDemoState(), 1, 'unklar', 'Neutrale Musterquelle geprüft.');
  assert.equal(state.statuses[0], 'pending');
  assert.equal(canOpenCase(state, 1), false);
  assert.equal(canOpenCase(state, 2), true);
  assert.deepEqual(reactorSnapshot(state).charged, [true, false, false, false, false]);
});

test('a participant cannot submit without a decision and a short source note', () => {
  assert.throws(() => submitDemoCase(initialDemoState(), 1, '', 'Text'), /Prüfentscheidung/);
  assert.throws(() => submitDemoCase(initialDemoState(), 1, 'plausibel', 'Text'), /acht Zeichen/);
});

test('revision reopens only the affected reactor and invalidates audit eligibility', () => {
  let state = initialDemoState();
  for (let id = 1; id <= 5; id += 1) {
    state = submitDemoCase(state, id, 'plausibel', `Musterbeleg für Reaktor ${id}.`);
  }
  assert.equal(auditEligible(state), true);
  assert.equal(canOpenCase(state, 6), true);
  state = applyDemoReview(state, 2, 'revision');
  assert.equal(canOpenCase(state, 2), true);
  assert.equal(canOpenCase(state, 1), false);
  assert.equal(canOpenCase(state, 6), false);
  state = submitDemoCase(state, 2, 'unklar', 'Überarbeitete Musterquelle geprüft.');
  assert.equal(canOpenCase(state, 6), true);
});

test('approval is an external review event, not a participant case action', () => {
  const submitted = submitDemoCase(initialDemoState(), 1, 'widerspruch', 'Mustervermerk mit Quelle.');
  const approved = applyDemoReview(submitted, 1, 'approved');
  assert.equal(approved.statuses[0], 'approved');
  assert.equal(canOpenCase(approved, 1), false);
  assert.throws(() => applyDemoReview(approved, 1, 'revision'), /Nur eine eingegangene/);
});
