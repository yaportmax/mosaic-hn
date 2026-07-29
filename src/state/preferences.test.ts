import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryDatabaseAdapter } from '../db/memory-adapter.ts';
import { DEFAULT_PREFERENCES, PreferencesController } from './preferences.ts';

test('preferences load defaults, persist updates, and normalize unsafe values', async () => {
  const db = new MemoryDatabaseAdapter();
  const first = new PreferencesController(db);
  await first.load();
  assert.equal(first.getSnapshot().activeThemeId, DEFAULT_PREFERENCES.activeThemeId);
  await first.update({ feedLimit: 9999, commentMaxDepth: -2, colorMode: 'dark' });
  assert.equal(first.getSnapshot().feedLimit, 500);
  assert.equal(first.getSnapshot().commentMaxDepth, null);
  const second = new PreferencesController(db);
  await second.load();
  assert.equal(second.getSnapshot().colorMode, 'dark');
  assert.equal(second.getSnapshot().feedLimit, 500);
});

test('preferences update gestures and reset to defaults', async () => {
  const controller = new PreferencesController(new MemoryDatabaseAdapter());
  await controller.update({ gestures: { ...DEFAULT_PREFERENCES.gestures, swipeLeft: 'queue' } });
  assert.equal(controller.getSnapshot().gestures.swipeLeft, 'queue');
  await controller.reset();
  assert.deepEqual(controller.getSnapshot(), DEFAULT_PREFERENCES);
});
