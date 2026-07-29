import test from 'node:test';
import assert from 'node:assert/strict';
import { createExternalStore } from './external-store.ts';

test('external store publishes immutable snapshots only when state changes', () => {
  const store = createExternalStore({ count: 0 });
  let calls = 0;
  const unsubscribe = store.subscribe(() => { calls += 1; });
  const first = store.getSnapshot();
  store.setState((state) => state);
  assert.equal(calls, 0);
  store.setState((state) => ({ ...state, count: 1 }));
  assert.equal(calls, 1);
  assert.notEqual(store.getSnapshot(), first);
  unsubscribe();
});
