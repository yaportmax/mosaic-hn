import type { ThemeValidationIssue, ThemeValidationOptions } from './types.ts';

const layouts = {
  shell: new Set(['tabs', 'floating-tabs', 'sidebar']),
  feed: new Set(['compact', 'comfortable', 'cards', 'magazine']),
  story: new Set(['line', 'row', 'card', 'editorial']),
  comments: new Set(['threads', 'ledger', 'conversation']),
  navigation: new Set(['standard', 'floating', 'minimal']),
  metadata: new Set(['inline', 'stacked', 'footer'])
} as const;

const FONT_FAMILIES = new Set(['system', 'rounded', 'humanist', 'serif', 'condensed', 'monospace']);
const FONT_WEIGHTS = new Set(['400', '500', '600', '700', '800']);
const HEX = /^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/;
const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?$/;
const THEME_ID = /^[a-z0-9]+(?:[.-][a-z0-9]+)+$/;
const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

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

interface Rgba { r: number; g: number; b: number; a: number }
function parseColor(hex: string): Rgba | null {
  if (!HEX.test(hex)) return null;
  return {
    r: Number.parseInt(hex.slice(1, 3), 16) / 255,
    g: Number.parseInt(hex.slice(3, 5), 16) / 255,
    b: Number.parseInt(hex.slice(5, 7), 16) / 255,
    a: hex.length === 9 ? Number.parseInt(hex.slice(7, 9), 16) / 255 : 1
  };
}

function composite(foreground: Rgba, background: Rgba): Rgba | null {
  if (background.a < 1) return null;
  return {
    r: foreground.r * foreground.a + background.r * (1 - foreground.a),
    g: foreground.g * foreground.a + background.g * (1 - foreground.a),
    b: foreground.b * foreground.a + background.b * (1 - foreground.a),
    a: 1
  };
}

function luminance(color: Rgba): number {
  const channel = (value: number): number => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  return 0.2126 * channel(color.r) + 0.7152 * channel(color.g) + 0.0722 * channel(color.b);
}

export function contrastRatio(foreground: string, background: string): number {
  const foregroundColor = parseColor(foreground);
  const backgroundColor = parseColor(background);
  if (!foregroundColor || !backgroundColor) return 0;
  const composited = composite(foregroundColor, backgroundColor);
  if (!composited) return 0;
  const a = luminance(composited);
  const b = luminance(backgroundColor);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

function addUnknownKeyIssues(record: Record<string, unknown>, allowed: ReadonlySet<string>, path: string, issues: ThemeValidationIssue[]): void {
  for (const key of Object.keys(record)) {
    if (!allowed.has(key)) issues.push({ path: path ? `${path}.${key}` : key, code: 'format', message: 'Unknown property' });
  }
}

function validateString(record: Record<string, unknown>, key: string, path: string, minimum: number, maximum: number, issues: ThemeValidationIssue[], required = true): string | undefined {
  const value = record[key];
  if (value === undefined && !required) return undefined;
  if (typeof value !== 'string' || value.trim().length < minimum) {
    issues.push({ path: `${path}.${key}`, code: 'required', message: `${key} is required` });
    return undefined;
  }
  if (value.length > maximum) issues.push({ path: `${path}.${key}`, code: 'range', message: `Must contain at most ${maximum} characters` });
  return value;
}

function validateRange(record: Record<string, unknown> | null, key: string, path: string, minimum: number, maximum: number, issues: ThemeValidationIssue[]): void {
  const value = record?.[key];
  if (typeof value !== 'number' || !Number.isFinite(value) || value < minimum || value > maximum) {
    issues.push({ path: `${path}.${key}`, code: 'range', message: `Must be between ${minimum} and ${maximum}` });
  }
}

function validateTokens(value: unknown, path: string, issues: ThemeValidationIssue[]): void {
  if (!isRecord(value)) {
    issues.push({ path, code: 'required', message: 'A token set is required' });
    return;
  }
  addUnknownKeyIssues(value, new Set(['colors', 'typography', 'spacing', 'shape', 'effects', 'motion']), path, issues);

  const colors = isRecord(value.colors) ? value.colors : null;
  if (!colors) issues.push({ path: `${path}.colors`, code: 'required', message: 'Colors are required' });
  else {
    addUnknownKeyIssues(colors, new Set(['background', 'surface', 'text', 'mutedText', 'accent', 'border', 'success', 'warning', 'danger', 'elevated', 'overlay']), `${path}.colors`, issues);
    const requiredColors = ['background', 'surface', 'text', 'mutedText', 'accent', 'border', 'success', 'warning', 'danger'] as const;
    for (const key of requiredColors) {
      if (typeof colors[key] !== 'string' || !HEX.test(colors[key])) issues.push({ path: `${path}.colors.${key}`, code: 'format', message: 'Color must be #RRGGBB or #RRGGBBAA' });
    }
    for (const key of ['elevated', 'overlay'] as const) {
      if (colors[key] !== undefined && (typeof colors[key] !== 'string' || !HEX.test(colors[key]))) issues.push({ path: `${path}.colors.${key}`, code: 'format', message: 'Color must be #RRGGBB or #RRGGBBAA' });
    }
    if (typeof colors.background === 'string' && parseColor(colors.background)?.a !== 1) issues.push({ path: `${path}.colors.background`, code: 'format', message: 'Background must be fully opaque for deterministic contrast' });
    if (contrastRatio(typeof colors.text === 'string' ? colors.text : '', typeof colors.background === 'string' ? colors.background : '') < 4.5) issues.push({ path: `${path}.colors.text`, code: 'contrast', message: 'Primary text contrast must be at least 4.5:1 after alpha compositing' });
    if (contrastRatio(typeof colors.mutedText === 'string' ? colors.mutedText : '', typeof colors.background === 'string' ? colors.background : '') < 3) issues.push({ path: `${path}.colors.mutedText`, code: 'contrast', message: 'Muted text contrast must be at least 3:1 after alpha compositing' });
  }

  const typography = isRecord(value.typography) ? value.typography : null;
  if (!typography) issues.push({ path: `${path}.typography`, code: 'required', message: 'Typography is required' });
  else {
    addUnknownKeyIssues(typography, new Set(['fontFamily', 'monoFamily', 'scale', 'titleWeight', 'bodyWeight']), `${path}.typography`, issues);
    if (typeof typography.fontFamily !== 'string' || !FONT_FAMILIES.has(typography.fontFamily)) issues.push({ path: `${path}.typography.fontFamily`, code: 'enum', message: 'Unsupported font family' });
    if (typography.monoFamily !== 'monospace') issues.push({ path: `${path}.typography.monoFamily`, code: 'enum', message: 'monoFamily must be monospace' });
    for (const key of ['titleWeight', 'bodyWeight'] as const) if (typeof typography[key] !== 'string' || !FONT_WEIGHTS.has(typography[key])) issues.push({ path: `${path}.typography.${key}`, code: 'enum', message: 'Unsupported font weight' });
    validateRange(typography, 'scale', `${path}.typography`, 0.75, 1.75, issues);
  }

  const spacing = isRecord(value.spacing) ? value.spacing : null;
  const shape = isRecord(value.shape) ? value.shape : null;
  const effects = isRecord(value.effects) ? value.effects : null;
  const motion = isRecord(value.motion) ? value.motion : null;
  if (!spacing) issues.push({ path: `${path}.spacing`, code: 'required', message: 'Spacing is required' });
  else {
    addUnknownKeyIssues(spacing, new Set(['unit', 'density']), `${path}.spacing`, issues);
    validateRange(spacing, 'unit', `${path}.spacing`, 2, 12, issues);
    validateRange(spacing, 'density', `${path}.spacing`, 0.65, 1.5, issues);
  }
  if (!shape) issues.push({ path: `${path}.shape`, code: 'required', message: 'Shape is required' });
  else {
    addUnknownKeyIssues(shape, new Set(['radius', 'borderWidth']), `${path}.shape`, issues);
    validateRange(shape, 'radius', `${path}.shape`, 0, 40, issues);
    validateRange(shape, 'borderWidth', `${path}.shape`, 0, 4, issues);
  }
  if (!effects) issues.push({ path: `${path}.effects`, code: 'required', message: 'Effects are required' });
  else {
    addUnknownKeyIssues(effects, new Set(['glass', 'blur', 'shadow']), `${path}.effects`, issues);
    if (typeof effects.glass !== 'boolean') issues.push({ path: `${path}.effects.glass`, code: 'format', message: 'glass must be a boolean' });
    validateRange(effects, 'blur', `${path}.effects`, 0, 100, issues);
    validateRange(effects, 'shadow', `${path}.effects`, 0, 1, issues);
  }
  if (!motion) issues.push({ path: `${path}.motion`, code: 'required', message: 'Motion is required' });
  else {
    addUnknownKeyIssues(motion, new Set(['durationScale', 'springDamping']), `${path}.motion`, issues);
    validateRange(motion, 'durationScale', `${path}.motion`, 0, 2, issues);
    validateRange(motion, 'springDamping', `${path}.motion`, 1, 40, issues);
  }
}

export function validateThemePackage(value: unknown, options: ThemeValidationOptions): ThemeValidationIssue[] {
  const issues: ThemeValidationIssue[] = [];
  if (!isRecord(value)) return [{ path: '', code: 'required', message: 'Theme must be an object' }];
  let serialized: string;
  try { serialized = JSON.stringify(value); }
  catch { return [{ path: '', code: 'format', message: 'Theme must be JSON serializable' }]; }
  if (new TextEncoder().encode(serialized).byteLength > (options.maxSerializedBytes ?? 512_000)) issues.push({ path: '', code: 'size', message: 'Theme package exceeds the maximum size' });
  addUnknownKeyIssues(value, new Set(['manifest', 'tokens', 'layout']), '', issues);

  const manifest = isRecord(value.manifest) ? value.manifest : null;
  if (!manifest) issues.push({ path: 'manifest', code: 'required', message: 'A manifest is required' });
  else {
    addUnknownKeyIssues(manifest, new Set(['id', 'name', 'author', 'version', 'minAppVersion', 'license', 'description', 'homepage', 'preview']), 'manifest', issues);
    const id = validateString(manifest, 'id', 'manifest', 1, 120, issues);
    if (id && !THEME_ID.test(id)) issues.push({ path: 'manifest.id', code: 'format', message: 'Use a reverse-domain style lowercase identifier' });
    validateString(manifest, 'name', 'manifest', 1, 60, issues);
    validateString(manifest, 'author', 'manifest', 1, 80, issues);
    validateString(manifest, 'license', 'manifest', 1, 40, issues);
    const version = validateString(manifest, 'version', 'manifest', 1, 40, issues);
    const minimum = validateString(manifest, 'minAppVersion', 'manifest', 1, 40, issues);
    const description = validateString(manifest, 'description', 'manifest', 0, 400, issues, false);
    if (description !== undefined && description.length > 400) { /* range issue already added */ }
    const homepage = validateString(manifest, 'homepage', 'manifest', 0, 500, issues, false);
    if (homepage) {
      try { const url = new URL(homepage); if (!['https:', 'http:'].includes(url.protocol)) throw new Error(); }
      catch { issues.push({ path: 'manifest.homepage', code: 'format', message: 'Homepage must be an HTTP(S) URL' }); }
    }
    validateString(manifest, 'preview', 'manifest', 0, 500, issues, false);
    if (version && !SEMVER.test(version)) issues.push({ path: 'manifest.version', code: 'format', message: 'Version must use semantic versioning' });
    if (minimum && !SEMVER.test(minimum)) issues.push({ path: 'manifest.minAppVersion', code: 'format', message: 'Minimum app version must use semantic versioning' });
    else if (minimum && isVersionGreater(minimum, options.appVersion)) issues.push({ path: 'manifest.minAppVersion', code: 'compatibility', message: `Requires Mosaic HN ${minimum} or later` });
  }

  const tokens = isRecord(value.tokens) ? value.tokens : null;
  if (!tokens) issues.push({ path: 'tokens', code: 'required', message: 'Theme tokens are required' });
  else {
    addUnknownKeyIssues(tokens, new Set(['light', 'dark', 'highContrastLight', 'highContrastDark']), 'tokens', issues);
    validateTokens(tokens.light, 'tokens.light', issues);
    for (const key of ['dark', 'highContrastLight', 'highContrastDark'] as const) if (tokens[key] !== undefined) validateTokens(tokens[key], `tokens.${key}`, issues);
  }

  const layout = isRecord(value.layout) ? value.layout : null;
  if (!layout) issues.push({ path: 'layout', code: 'required', message: 'Theme layout is required' });
  else {
    addUnknownKeyIssues(layout, new Set(Object.keys(layouts)), 'layout', issues);
    for (const [key, allowed] of Object.entries(layouts)) {
      if (!allowed.has(layout[key] as never)) issues.push({ path: `layout.${key}`, code: 'enum', message: `Unsupported ${key} layout` });
    }
  }
  return issues;
}
