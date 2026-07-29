import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_MODULE_CONFIGURATION,
  exportModuleConfiguration,
  importModuleConfiguration,
  normalizeModuleConfiguration,
  setModuleEnabled,
  setModulePlacement
} from './configuration.ts';
import { BUILTIN_MODULES, validateModuleRegistry } from './registry.ts';

test('built-in module registry is valid and exposes required recovery modules', () => {
  assert.deepEqual(validateModuleRegistry(BUILTIN_MODULES), []);
  const byId = new Map(BUILTIN_MODULES.map((module) => [module.id, module]));
  assert.equal(byId.get('feed')?.required, true);
  assert.equal(byId.get('modules')?.required, true);
  assert.equal(byId.get('comments')?.kind, 'capability');
});

test('normalization restores required modules and dependency closure', () => {
  const normalized = normalizeModuleConfiguration({
    version: 1,
    enabled: ['archive', 'unknown'],
    placements: { archive: 'more', unknown: 'tab' },
    tabOrder: [],
    moreOrder: ['archive'],
    homeModuleId: 'unknown'
  });

  assert.deepEqual(normalized.enabled, ['feed', 'archive', 'modules']);
  assert.equal(normalized.placements.feed, 'tab');
  assert.deepEqual(normalized.tabOrder, ['feed']);
  assert.deepEqual(normalized.moreOrder, ['archive', 'modules']);
  assert.equal(normalized.homeModuleId, 'feed');
  assert.equal('unknown' in normalized.placements, false);
});

test('normalization repairs duplicate order and appends missing placed modules', () => {
  const normalized = normalizeModuleConfiguration({
    ...DEFAULT_MODULE_CONFIGURATION,
    placements: { ...DEFAULT_MODULE_CONFIGURATION.placements, library: 'tab', settings: 'tab', search: 'more' },
    tabOrder: ['settings', 'settings', 'unknown'],
    moreOrder: ['search', 'archive', 'search']
  });

  assert.deepEqual(normalized.tabOrder, ['settings', 'feed', 'library', 'themes']);
  assert.deepEqual(normalized.moreOrder, ['search', 'archive', 'algorithms', 'automation', 'modules']);
});

test('disabling a dependency cascades to enabled dependents while required modules remain enabled', () => {
  const withoutFeed = setModuleEnabled(DEFAULT_MODULE_CONFIGURATION, 'feed', false);
  assert.equal(withoutFeed.enabled.includes('feed'), true);
  assert.equal(withoutFeed.enabled.includes('archive'), true);

  const withoutComments = setModuleEnabled(DEFAULT_MODULE_CONFIGURATION, 'comments', false);
  assert.equal(withoutComments.enabled.includes('comments'), false);
  assert.equal(withoutComments.enabled.includes('feed'), true);
});

test('placing every navigation module away from tabs preserves one visible recovery tab', () => {
  let configuration = DEFAULT_MODULE_CONFIGURATION;
  for (const id of configuration.tabOrder) configuration = setModulePlacement(configuration, id, 'hidden');
  assert.deepEqual(configuration.tabOrder, ['feed']);
  assert.equal(configuration.placements.feed, 'tab');
});

test('module configuration JSON round trips and rejects malformed or oversized input', () => {
  const text = exportModuleConfiguration(DEFAULT_MODULE_CONFIGURATION);
  assert.deepEqual(importModuleConfiguration(text), DEFAULT_MODULE_CONFIGURATION);
  assert.throws(() => importModuleConfiguration('{"version":99}'), /Unsupported module configuration version/);
  assert.throws(() => importModuleConfiguration('{not-json'), /Invalid JSON/);
  assert.throws(() => importModuleConfiguration(' '.repeat(1_000_001)), /byte limit/);
});
