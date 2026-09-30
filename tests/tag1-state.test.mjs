import assert from 'node:assert/strict';
import test from 'node:test';
import { initialTourStep, canVisit, nextTourStep, tourSnapshot } from '../dist/tag1-state.js';

test('only the first reactor is accessible at the start of the visual tour', () => {
  const step = initialTourStep();
  assert.equal(canVisit(step, 1), true);
  for (let id = 2; id <= 6; id += 1) assert.equal(canVisit(step, id), false);
  assert.equal(tourSnapshot(step).reactors[1].visual, 'locked');
});

test('moving to the next view stages only visual scene state', () => {
  const step = nextTourStep(initialTourStep());
  assert.equal(step, 2);
  assert.equal(canVisit(step, 1), false);
  assert.equal(canVisit(step, 2), true);
  assert.deepEqual(tourSnapshot(step).charged, [true, false, false, false, false]);
});

test('the audit view is available only at the end of the tour', () => {
  let step = initialTourStep();
  for (let id = 1; id <= 5; id += 1) step = nextTourStep(step);
  assert.equal(step, 6);
  assert.equal(canVisit(step, 6), true);
  assert.equal(tourSnapshot(step).auditEligible, true);
  assert.equal(nextTourStep(step), 6);
});

test('invalid steps cannot create a fake scene state', () => {
  for (const step of [0, 7, 1.5, null]) {
    assert.throws(() => tourSnapshot(step), /Ungültige Station/);
    assert.equal(canVisit(step, 1), false);
  }
});
