import test from 'node:test';
import assert from 'node:assert/strict';
import { gestureActionAppearance, resolveGestureActionForModules, swipeRevealActions } from './gesture-actions.ts';

test('swipeRevealActions maps revealed sides to the direction that exposes them', () => {
  assert.deepEqual(swipeRevealActions({ swipeLeft: 'save', swipeRight: 'open' }), { left: 'open', right: 'save' });
});

test('gestureActionAppearance describes every trusted action without executing code', () => {
  assert.equal(gestureActionAppearance('save').icon, 'bookmark');
  assert.equal(gestureActionAppearance('hide').tone, 'danger');
  assert.equal(gestureActionAppearance('none').label, 'No action');
});


test('resolveGestureActionForModules removes actions owned by disabled modules', () => {
  assert.equal(resolveGestureActionForModules('save', { library: false, automation: true }), 'none');
  assert.equal(resolveGestureActionForModules('queue', { library: false, automation: true }), 'none');
  assert.equal(resolveGestureActionForModules('hide', { library: true, automation: false }), 'none');
  assert.equal(resolveGestureActionForModules('open', { library: false, automation: false }), 'open');
  assert.equal(resolveGestureActionForModules('share', { library: false, automation: false }), 'share');
});
