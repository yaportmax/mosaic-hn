import test from 'node:test';
import assert from 'node:assert/strict';
import { ThemeMarketplaceClient } from './marketplace.ts';
import type { ThemePackage } from './types.ts';

const theme: ThemePackage = {
  manifest: { id: 'com.example.market', name: 'Market', author: 'Tester', version: '1.0.0', minAppVersion: '1.0.0', license: 'MIT' },
  tokens: { light: { colors: { background: '#FFFFFF', surface: '#F5F5F5', text: '#111111', mutedText: '#555555', accent: '#0055CC', border: '#CCCCCC', success: '#087A3E', warning: '#8A5900', danger: '#B42318' }, typography: { fontFamily: 'system', monoFamily: 'monospace', scale: 1, titleWeight: '700', bodyWeight: '400' }, spacing: { unit: 4, density: 1 }, shape: { radius: 12, borderWidth: 1 }, effects: { glass: false, blur: 0, shadow: 0.1 }, motion: { durationScale: 1, springDamping: 18 } } },
  layout: { shell: 'tabs', feed: 'comfortable', story: 'row', comments: 'threads', navigation: 'standard', metadata: 'inline' }
};
const body = JSON.stringify(theme);
const digest = 'a'.repeat(64);
const registryEntry = { id: theme.manifest.id, version: '1.0.0', name: 'Market', author: 'Tester', downloadUrl: './market.json', sha256: digest, minAppVersion: '1.0.0' };
const registry = JSON.stringify({ version: 1, updatedAt: '2026-07-29T00:00:00Z', themes: [registryEntry] });

test('marketplace resolves relative package URLs and validates the declared digest', async () => {
  const requested: string[] = [];
  const fetcher = async (url: string) => {
    requested.push(url);
    return new Response(url.endsWith('registry.json') ? registry : body, { status: 200 });
  };
  const client = new ThemeMarketplaceClient(fetcher, async (value) => value === body ? digest : 'b'.repeat(64), '1.0.0');
  const loaded = await client.loadRegistry('https://example.com/themes/registry.json');
  const downloaded = await client.download(loaded.themes[0]!, 'https://example.com/themes/registry.json');
  assert.equal(downloaded.manifest.id, theme.manifest.id);
  assert.deepEqual(requested, ['https://example.com/themes/registry.json', 'https://example.com/themes/market.json']);
});

test('marketplace rejects insecure registries and package hash mismatches', async () => {
  const client = new ThemeMarketplaceClient(async () => new Response(registry, { status: 200 }), async () => 'wrong', '1.0.0');
  await assert.rejects(() => client.loadRegistry('http://example.com/registry.json'), /HTTPS/);
  const loaded = await client.loadRegistry('https://example.com/registry.json');
  await assert.rejects(() => client.download(loaded.themes[0]!, 'https://example.com/registry.json'), /hash/);
});


test('marketplace rejects malformed hashes and duplicate package identities', async () => {
  const malformed = JSON.stringify({ version: 1, updatedAt: '', themes: [{ ...registryEntry, sha256: 'not-a-sha256' }] });
  const duplicates = JSON.stringify({ version: 1, updatedAt: '', themes: [registryEntry, { ...registryEntry }] });
  const malformedClient = new ThemeMarketplaceClient(async () => new Response(malformed, { status: 200 }), async () => digest, '1.0.0');
  const duplicateClient = new ThemeMarketplaceClient(async () => new Response(duplicates, { status: 200 }), async () => digest, '1.0.0');
  await assert.rejects(() => malformedClient.loadRegistry('https://example.com/registry.json'), /schema|hash/i);
  await assert.rejects(() => duplicateClient.loadRegistry('https://example.com/registry.json'), /duplicate/i);
});

test('marketplace rejects registry metadata that does not match the downloaded package', async () => {
  const misleading = { ...registryEntry, name: 'Misleading name' };
  const client = new ThemeMarketplaceClient(async (url) => new Response(url.endsWith('registry.json') ? JSON.stringify({ version: 1, updatedAt: '', themes: [misleading] }) : body, { status: 200 }), async () => digest, '1.0.0');
  const loaded = await client.loadRegistry('https://example.com/registry.json');
  await assert.rejects(() => client.download(loaded.themes[0]!, 'https://example.com/registry.json'), /metadata/i);
});
