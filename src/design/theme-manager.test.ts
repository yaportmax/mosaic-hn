import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryDatabaseAdapter } from '../db/memory-adapter.ts';
import { ThemeManager } from './theme-manager.ts';
import type { ThemePackage } from '../../theme-sdk/types.ts';

const theme = (id: string, name = 'Custom'): ThemePackage => ({
  manifest: { id, name, author: 'Tester', version: '1.0.0', minAppVersion: '1.0.0', license: 'MIT' },
  tokens: { light: {
    colors: { background: '#FFFFFF', surface: '#F5F5F5', text: '#111111', mutedText: '#555555', accent: '#0055CC', border: '#CCCCCC', success: '#087A3E', warning: '#8A5900', danger: '#B42318' },
    typography: { fontFamily: 'system', monoFamily: 'monospace', scale: 1, titleWeight: '700', bodyWeight: '400' },
    spacing: { unit: 4, density: 1 }, shape: { radius: 12, borderWidth: 1 }, effects: { glass: false, blur: 0, shadow: 0.1 }, motion: { durationScale: 1, springDamping: 18 }
  } },
  layout: { shell: 'tabs', feed: 'comfortable', story: 'row', comments: 'threads', navigation: 'standard', metadata: 'inline' }
});

test('theme manager merges built-ins and validated installed themes', async () => {
  const builtIn = theme('org.mosaichn.builtin', 'Built-in');
  const manager = new ThemeManager(new MemoryDatabaseAdapter(), [builtIn], '1.0.0');
  await manager.install(theme('com.example.custom'));
  assert.deepEqual((await manager.list()).map((item) => item.theme.manifest.id), ['org.mosaichn.builtin', 'com.example.custom']);
  assert.equal((await manager.get('com.example.custom')).manifest.name, 'Custom');
});

test('theme manager rejects invalid and built-in overrides atomically', async () => {
  const builtIn = theme('org.mosaichn.builtin', 'Built-in');
  const manager = new ThemeManager(new MemoryDatabaseAdapter(), [builtIn], '1.0.0');
  await assert.rejects(() => manager.install(theme('org.mosaichn.builtin', 'Override')), /built-in/);
  const invalid = theme('com.example.invalid');
  invalid.tokens.light.colors.text = '#FFFFFF';
  await assert.rejects(() => manager.install(invalid), /contrast/);
  assert.equal((await manager.list()).length, 1);
});

test('theme manager imports and removes community themes but not built-ins', async () => {
  const builtIn = theme('org.mosaichn.builtin', 'Built-in');
  const manager = new ThemeManager(new MemoryDatabaseAdapter(), [builtIn], '1.0.0');
  const imported = await manager.importJson(JSON.stringify(theme('com.example.imported')));
  assert.equal(imported.manifest.id, 'com.example.imported');
  assert.equal(await manager.remove('com.example.imported'), true);
  assert.equal(await manager.remove('org.mosaichn.builtin'), false);
});
