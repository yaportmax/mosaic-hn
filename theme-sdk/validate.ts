import type { ThemePackage, ThemeTokens, ThemeValidationIssue, ThemeValidationOptions } from './types.ts';

const layouts = {
  shell: new Set(['tabs', 'floating-tabs', 'sidebar']),
  feed: new Set(['compact', 'comfortable', 'cards', 'magazine']),
  story: new Set(['line', 'row', 'card', 'editorial']),
  comments: new Set(['threads', 'ledger', 'conversation']),
  navigation: new Set(['standard', 'floating', 'minimal']),
  metadata: new Set(['inline', 'stacked', 'footer'])
} as const;

const HEX = /^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/;
const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?$/;

function semverParts(value: string): [number, number, number] | null {
  const match = value.match(SEMVER);
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
}

function isVersionGreater(a: string, b: string): boolean {
  const left = semverParts(a);
  const right = semverParts(b);
  if (!left || !right) return false;
  for (let i = 0; i < 3; i += 1) {
    const l = left[i] ?? 0;
    const r = right[i] ?? 0;
    if (l !== r) return l > r;
  }
  return false;
}

function luminance(hex: string): number {
  const rgb = [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255).map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * (rgb[0] ?? 0) + 0.7152 * (rgb[1] ?? 0) + 0.0722 * (rgb[2] ?? 0);
}

export function contrastRatio(foreground: string, background: string): number {
  if (!HEX.test(foreground) || !HEX.test(background)) return 0;
  const a = luminance(foreground.slice(0, 7));
  const b = luminance(background.slice(0, 7));
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

function validateTokens(tokens: ThemeTokens, path: string, issues: ThemeValidationIssue[]): void {
  const requiredColors = ['background', 'surface', 'text', 'mutedText', 'accent', 'border', 'success', 'warning', 'danger'] as const;
  for (const key of requiredColors) {
    const value = tokens?.colors?.[key];
    if (!HEX.test(value ?? '')) issues.push({ path: `${path}.colors.${key}`, code: 'format', message: 'Color must be #RRGGBB or #RRGGBBAA' });
  }
  if (contrastRatio(tokens?.colors?.text ?? '', tokens?.colors?.background ?? '') < 4.5) issues.push({ path: `${path}.colors.text`, code: 'contrast', message: 'Primary text contrast must be at least 4.5:1' });
  if (contrastRatio(tokens?.colors?.mutedText ?? '', tokens?.colors?.background ?? '') < 3) issues.push({ path: `${path}.colors.mutedText`, code: 'contrast', message: 'Muted text contrast must be at least 3:1' });
  const ranges: Array<[number, number, number, string]> = [
    [tokens?.typography?.scale, 0.75, 1.75, 'typography.scale'],
    [tokens?.spacing?.unit, 2, 12, 'spacing.unit'],
    [tokens?.spacing?.density, 0.65, 1.5, 'spacing.density'],
    [tokens?.shape?.radius, 0, 40, 'shape.radius'],
    [tokens?.shape?.borderWidth, 0, 4, 'shape.borderWidth'],
    [tokens?.effects?.blur, 0, 100, 'effects.blur'],
    [tokens?.effects?.shadow, 0, 1, 'effects.shadow'],
    [tokens?.motion?.durationScale, 0, 2, 'motion.durationScale'],
    [tokens?.motion?.springDamping, 1, 40, 'motion.springDamping']
  ];
  for (const [value, minimum, maximum, key] of ranges) if (typeof value !== 'number' || !Number.isFinite(value) || value < minimum || value > maximum) issues.push({ path: `${path}.${key}`, code: 'range', message: `Must be between ${minimum} and ${maximum}` });
}

export function validateThemePackage(value: unknown, options: ThemeValidationOptions): ThemeValidationIssue[] {
  const issues: ThemeValidationIssue[] = [];
  if (!value || typeof value !== 'object') return [{ path: '', code: 'required', message: 'Theme must be an object' }];
  const theme = value as ThemePackage;
  const bytes = new TextEncoder().encode(JSON.stringify(theme)).byteLength;
  if (bytes > (options.maxSerializedBytes ?? 512_000)) issues.push({ path: '', code: 'size', message: 'Theme package exceeds the maximum size' });
  if (!/^[a-z0-9]+(?:[.-][a-z0-9]+)+$/.test(theme.manifest?.id ?? '')) issues.push({ path: 'manifest.id', code: 'format', message: 'Use a reverse-domain style lowercase identifier' });
  for (const key of ['name', 'author', 'license'] as const) if (!theme.manifest?.[key]?.trim()) issues.push({ path: `manifest.${key}`, code: 'required', message: `${key} is required` });
  if (!SEMVER.test(theme.manifest?.version ?? '')) issues.push({ path: 'manifest.version', code: 'format', message: 'Version must use semantic versioning' });
  if (!SEMVER.test(theme.manifest?.minAppVersion ?? '')) issues.push({ path: 'manifest.minAppVersion', code: 'format', message: 'Minimum app version must use semantic versioning' });
  else if (isVersionGreater(theme.manifest.minAppVersion, options.appVersion)) issues.push({ path: 'manifest.minAppVersion', code: 'compatibility', message: `Requires Mosaic HN ${theme.manifest.minAppVersion} or later` });
  if (!theme.tokens?.light) issues.push({ path: 'tokens.light', code: 'required', message: 'A light token set is required' });
  else validateTokens(theme.tokens.light, 'tokens.light', issues);
  for (const key of ['dark', 'highContrastLight', 'highContrastDark'] as const) if (theme.tokens?.[key]) validateTokens(theme.tokens[key] as ThemeTokens, `tokens.${key}`, issues);
  for (const [key, allowed] of Object.entries(layouts)) {
    const valueAtPath = (theme.layout as unknown as Record<string, unknown> | undefined)?.[key];
    if (!allowed.has(valueAtPath as never)) issues.push({ path: `layout.${key}`, code: 'enum', message: `Unsupported ${key} layout` });
  }
  return issues;
}
