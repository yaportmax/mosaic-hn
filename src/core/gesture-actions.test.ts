import test from 'node:test';
import assert from 'node:assert/strict';
import { gestureActionAppearance, swipeRevealActions } from './gesture-actions.ts';

test('swipeRevealActions maps revealed sides to the direction that exposes them', () => {
  assert.deepEqual(swipeRevealActions({ swipeLeft: 'save', swipeRight: 'open' }), { left: 'open', right: 'save' });
});

test('gestureActionAppearance describes every trusted action without executing code', () => {
  assert.equal(gestureActionAppearance('save').icon, 'bookmark');
  assert.equal(gestureActionAppearance('hide').tone, 'danger');
  assert.equal(gestureActionAppearance('none').label, 'No action');
});
