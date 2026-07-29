import test from 'node:test';
import assert from 'node:assert/strict';
import { validateThemePackage } from './validate.ts';
import { resolveTheme } from './resolve.ts';
import type { ThemePackage } from './types.ts';

const theme: ThemePackage = {
  manifest: { id: 'org.example.clean', name: 'Clean', author: 'Example', version: '1.0.0', minAppVersion: '1.0.0', license: 'MIT' },
  tokens: { light: { colors: { background: '#FFFFFF', surface: '#F5F5F5', text: '#111111', mutedText: '#555555', accent: '#D14B00', border: '#CCCCCC', success: '#137333', warning: '#8A5300', danger: '#B3261E' }, typography: { fontFamily: 'system', monoFamily: 'monospace', scale: 1, titleWeight: '700', bodyWeight: '400' }, spacing: { unit: 4, density: 1 }, shape: { radius: 12, borderWidth: 1 }, effects: { glass: false, blur: 0, shadow: 0 }, motion: { durationScale: 1, springDamping: 18 } } },
  layout: { shell: 'tabs', feed: 'comfortable', story: 'row', comments: 'threads', navigation: 'standard', metadata: 'inline' }
};

test('validateThemePackage accepts a complete safe theme', () => {
  assert.deepEqual(validateThemePackage(theme, { appVersion: '1.0.0' }), []);
});

test('validateThemePackage rejects unknown layouts and low text contrast', () => {
  const bad = structuredClone(theme) as any;
  bad.layout.feed = 'arbitrary-code';
  bad.tokens.light.colors.text = '#FAFAFA';
  const issues = validateThemePackage(bad, { appVersion: '1.0.0' });
  assert.ok(issues.some((issue) => issue.path === 'layout.feed'));
  assert.ok(issues.some((issue) => issue.code === 'contrast'));
});

test('resolveTheme applies dark fallback and accessibility overrides', () => {
  const resolved = resolveTheme(theme, { colorScheme: 'dark', reduceMotion: true, reduceTransparency: true, highContrast: true });
  assert.equal(resolved.tokens.motion.durationScale, 0);
  assert.equal(resolved.tokens.effects.glass, false);
  assert.ok(resolved.tokens.shape.borderWidth >= 1);
});

test('validateThemePackage rejects unsupported typography and non-boolean effects', () => {
  const bad = structuredClone(theme) as unknown as Record<string, unknown>;
  const light = ((bad.tokens as Record<string, unknown>).light as Record<string, unknown>);
  const typography = light.typography as Record<string, unknown>;
  typography.fontFamily = 'comic-sans';
  typography.titleWeight = '900';
  (light.effects as Record<string, unknown>).glass = 'yes';
  const issues = validateThemePackage(bad, { appVersion: '1.0.0' });
  assert.ok(issues.some((issue) => issue.path === 'tokens.light.typography.fontFamily'));
  assert.ok(issues.some((issue) => issue.path === 'tokens.light.typography.titleWeight'));
  assert.ok(issues.some((issue) => issue.path === 'tokens.light.effects.glass'));
});

test('validateThemePackage composites alpha before checking text contrast', () => {
  const bad = structuredClone(theme) as unknown as Record<string, unknown>;
  const light = ((bad.tokens as Record<string, unknown>).light as Record<string, unknown>);
  (light.colors as Record<string, unknown>).text = '#00000000';
  const issues = validateThemePackage(bad, { appVersion: '1.0.0' });
  assert.ok(issues.some((issue) => issue.path === 'tokens.light.colors.text' && issue.code === 'contrast'));
});

test('validateThemePackage enforces bounded metadata and optional color formats', () => {
  const bad = structuredClone(theme) as unknown as Record<string, unknown>;
  const manifest = bad.manifest as Record<string, unknown>;
  manifest.name = 'x'.repeat(61);
  manifest.description = 'x'.repeat(401);
  const light = ((bad.tokens as Record<string, unknown>).light as Record<string, unknown>);
  (light.colors as Record<string, unknown>).elevated = 'transparent';
  const issues = validateThemePackage(bad, { appVersion: '1.0.0' });
  assert.ok(issues.some((issue) => issue.path === 'manifest.name' && issue.code === 'range'));
  assert.ok(issues.some((issue) => issue.path === 'manifest.description' && issue.code === 'range'));
  assert.ok(issues.some((issue) => issue.path === 'tokens.light.colors.elevated' && issue.code === 'format'));
});
