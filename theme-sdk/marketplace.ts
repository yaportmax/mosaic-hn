import type { ThemePackage, ThemeRegistry, ThemeRegistryEntry } from './types.ts';
import { validateThemePackage } from './validate.ts';

const THEME_ID = /^[a-z0-9]+(?:[.-][a-z0-9]+)+$/;
const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?$/;
const SHA256 = /^[0-9a-f]{64}$/i;

export type MarketplaceFetcher = (url: string) => Promise<Response>;
export type Sha256 = (value: string) => Promise<string>;

function requireHttps(value: string, label: string): URL {
  let url: URL;
  try { url = new URL(value); } catch { throw new Error(`${label} is not a valid URL`); }
  if (url.protocol !== 'https:') throw new Error(`${label} must use HTTPS`);
  return url;
}

function isEntry(value: unknown): value is ThemeRegistryEntry {
  if (!value || typeof value !== 'object') return false;
  const entry = value as Record<string, unknown>;
  if (!['id', 'version', 'name', 'author', 'downloadUrl', 'sha256', 'minAppVersion'].every((key) => typeof entry[key] === 'string' && Boolean((entry[key] as string).trim()))) return false;
  return THEME_ID.test(entry.id as string)
    && SEMVER.test(entry.version as string)
    && SEMVER.test(entry.minAppVersion as string)
    && SHA256.test(entry.sha256 as string);
}

export class ThemeMarketplaceClient {
  private readonly fetcher: MarketplaceFetcher;
  private readonly sha256: Sha256;
  private readonly appVersion: string;
  private readonly maxBytes: number;

  constructor(fetcher: MarketplaceFetcher, sha256: Sha256, appVersion: string, maxBytes = 512_000) {
    this.fetcher = fetcher;
    this.sha256 = sha256;
    this.appVersion = appVersion;
    this.maxBytes = maxBytes;
  }

  async loadRegistry(urlValue: string): Promise<ThemeRegistry> {
    const url = requireHttps(urlValue, 'Theme registry URL');
    const response = await this.fetcher(url.toString());
    if (!response.ok) throw new Error(`Theme registry request failed (${response.status})`);
    const text = await response.text();
    if (new TextEncoder().encode(text).byteLength > this.maxBytes) throw new Error('Theme registry exceeds the maximum size');
    let value: unknown;
    try { value = JSON.parse(text); } catch { throw new Error('Theme registry is not valid JSON'); }
    const registry = value as Partial<ThemeRegistry>;
    if (registry.version !== 1 || !Array.isArray(registry.themes) || registry.themes.length > 1_000 || !registry.themes.every(isEntry)) throw new Error('Theme registry has an unsupported schema or hash');
    const identities = new Set<string>();
    for (const entry of registry.themes) {
      const identity = `${entry.id}@${entry.version}`;
      if (identities.has(identity)) throw new Error(`Theme registry contains duplicate package identity ${identity}`);
      identities.add(identity);
      const packageUrl = new URL(entry.downloadUrl, url);
      requireHttps(packageUrl.toString(), 'Theme package URL');
      if (entry.previewUrl) requireHttps(new URL(entry.previewUrl, url).toString(), 'Theme preview URL');
    }
    return { version: 1, updatedAt: typeof registry.updatedAt === 'string' ? registry.updatedAt : '', themes: registry.themes.map((entry) => ({ ...entry, sha256: entry.sha256.toLowerCase() })) };
  }

  async download(entry: ThemeRegistryEntry, registryUrlValue: string): Promise<ThemePackage> {
    const registryUrl = requireHttps(registryUrlValue, 'Theme registry URL');
    const resolved = new URL(entry.downloadUrl, registryUrl);
    requireHttps(resolved.toString(), 'Theme package URL');
    const response = await this.fetcher(resolved.toString());
    if (!response.ok) throw new Error(`Theme package request failed (${response.status})`);
    const text = await response.text();
    if (new TextEncoder().encode(text).byteLength > this.maxBytes) throw new Error('Theme package exceeds the maximum size');
    const digest = (await this.sha256(text)).toLowerCase();
    if (digest !== entry.sha256.toLowerCase()) throw new Error('Theme package hash does not match the marketplace registry');
    let value: unknown;
    try { value = JSON.parse(text); } catch { throw new Error('Theme package is not valid JSON'); }
    const issues = validateThemePackage(value, { appVersion: this.appVersion, maxSerializedBytes: this.maxBytes });
    if (issues.length > 0) throw new Error(`Theme package validation failed: ${issues[0]?.path ?? 'theme'} ${issues[0]?.message ?? ''}`.trim());
    const theme = value as ThemePackage;
    if (theme.manifest.id !== entry.id || theme.manifest.version !== entry.version) throw new Error('Theme package identity does not match the marketplace registry');
    if (theme.manifest.name !== entry.name || theme.manifest.author !== entry.author || theme.manifest.minAppVersion !== entry.minAppVersion) throw new Error('Theme package metadata does not match the marketplace registry');
    return structuredClone(theme);
  }
}
