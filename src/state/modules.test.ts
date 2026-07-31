import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryDatabaseAdapter } from '../db/memory-adapter.ts';
import { DEFAULT_MODULE_CONFIGURATION } from '../../module-sdk/configuration.ts';
import { ModuleConfigurationController } from './modules.ts';

test('module controller loads defaults and persists enablement changes', async () => {
  const db = new MemoryDatabaseAdapter();
  const first = new ModuleConfigurationController(db);
  await first.load();
  assert.deepEqual(first.getSnapshot(), DEFAULT_MODULE_CONFIGURATION);

  await first.setEnabled('comments', false);
  assert.equal(first.getSnapshot().enabled.includes('comments'), false);

  const second = new ModuleConfigurationController(db);
  await second.load();
  assert.equal(second.getSnapshot().enabled.includes('comments'), false);
});

test('module controller persists placement, order, and home changes atomically', async () => {
  const controller = new ModuleConfigurationController(new MemoryDatabaseAdapter());
  await controller.load();
  await controller.setPlacement('archive', 'tab');
  await controller.move('archive', -1);
  await controller.setHome('archive');

  const snapshot = controller.getSnapshot();
  assert.equal(snapshot.placements.archive, 'tab');
  assert.equal(snapshot.tabOrder.includes('archive'), true);
  assert.equal(snapshot.homeModuleId, 'archive');
});

test('module controller replaces imported setups and reset restores defaults', async () => {
  const controller = new ModuleConfigurationController(new MemoryDatabaseAdapter());
  await controller.load();
  await controller.replace({ ...DEFAULT_MODULE_CONFIGURATION, enabled: ['feed', 'modules'], homeModuleId: 'feed' });
  assert.deepEqual(controller.getSnapshot().enabled, ['feed', 'modules']);
  await controller.reset();
  assert.deepEqual(controller.getSnapshot(), DEFAULT_MODULE_CONFIGURATION);
});
