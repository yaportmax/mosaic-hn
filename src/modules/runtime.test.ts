import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_MODULE_CONFIGURATION, setModuleEnabled, setModulePlacement } from '../../module-sdk/configuration.ts';
import { getHomeModule, getMoreModules, getTabModules, moduleForTabRoute } from './runtime.ts';

test('runtime resolves configured tab and More modules in user order', () => {
  const tabs = getTabModules(DEFAULT_MODULE_CONFIGURATION);
  const more = getMoreModules(DEFAULT_MODULE_CONFIGURATION);
  assert.deepEqual(tabs.map((module) => module.id), ['feed', 'search', 'library', 'themes', 'settings']);
  assert.deepEqual(more.map((module) => module.id), ['archive', 'algorithms', 'automation', 'modules']);
});

test('runtime removes disabled modules and follows placement changes', () => {
  let configuration = setModuleEnabled(DEFAULT_MODULE_CONFIGURATION, 'search', false);
  configuration = setModulePlacement(configuration, 'archive', 'tab');
  assert.deepEqual(getTabModules(configuration).map((module) => module.id), ['feed', 'library', 'themes', 'settings', 'archive']);
  assert.equal(getMoreModules(configuration).some((module) => module.id === 'archive'), false);
});

test('runtime resolves home and tab route metadata from the registry', () => {
  assert.equal(getHomeModule(DEFAULT_MODULE_CONFIGURATION).id, 'feed');
  assert.equal(moduleForTabRoute('presets')?.id, 'algorithms');
  assert.equal(moduleForTabRoute('missing'), undefined);
});
