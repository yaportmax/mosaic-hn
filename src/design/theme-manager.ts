import type { DatabaseAdapter } from '../db/types.ts';
import type { ThemePackage, ThemeValidationIssue } from '../../theme-sdk/types.ts';
import { validateThemePackage } from '../../theme-sdk/validate.ts';

interface InstalledThemeRecord {
  theme: ThemePackage;
  installedAt: number;
}

export interface ManagedTheme {
  theme: ThemePackage;
  source: 'builtin' | 'installed';
  installedAt?: number;
}

export class ThemeInstallError extends Error {
  readonly issues: ThemeValidationIssue[];
  constructor(message: string, issues: ThemeValidationIssue[] = []) {
    super(message);
    this.name = 'ThemeInstallError';
    this.issues = issues;
  }
}

const cloneTheme = (theme: ThemePackage): ThemePackage => structuredClone(theme);

export class ThemeManager {
  private readonly db: DatabaseAdapter;
  private readonly builtins: ThemePackage[];
  private readonly builtInIds: Set<string>;
  private readonly appVersion: string;
  private readonly now: () => number;

  constructor(db: DatabaseAdapter, builtins: readonly ThemePackage[], appVersion: string, now: () => number = () => Math.floor(Date.now() / 1000)) {
    this.db = db;
    this.builtins = builtins.map(cloneTheme);
    this.builtInIds = new Set(this.builtins.map((theme) => theme.manifest.id));
    this.appVersion = appVersion;
    this.now = now;
  }

  async list(): Promise<ManagedTheme[]> {
    const installed = (await this.db.scan<InstalledThemeRecord>('themes')).map((record) => record.value);
    return [
      ...this.builtins.map((theme) => ({ theme: cloneTheme(theme), source: 'builtin' as const })),
      ...installed
        .filter((record) => !this.builtInIds.has(record.theme.manifest.id))
        .sort((a, b) => a.theme.manifest.name.localeCompare(b.theme.manifest.name))
        .map((record) => ({ theme: cloneTheme(record.theme), source: 'installed' as const, installedAt: record.installedAt }))
    ];
  }

  async get(id: string): Promise<ThemePackage> {
    const builtin = this.builtins.find((theme) => theme.manifest.id === id);
    if (builtin) return cloneTheme(builtin);
    const record = await this.db.get<InstalledThemeRecord>('themes', id);
    if (!record) throw new ThemeInstallError(`Theme “${id}” is not installed`);
    return cloneTheme(record.theme);
  }

  async install(theme: ThemePackage): Promise<ThemePackage> {
    if (this.builtInIds.has(theme.manifest?.id)) throw new ThemeInstallError('A built-in theme cannot be overridden');
    const issues = validateThemePackage(theme, { appVersion: this.appVersion });
    if (issues.length > 0) {
      const summary = issues.slice(0, 3).map((issue) => `${issue.path || 'theme'}: ${issue.message}`).join('; ');
      throw new ThemeInstallError(`Theme validation failed: ${summary}`, issues);
    }
    const stored = cloneTheme(theme);
    await this.db.set<InstalledThemeRecord>('themes', stored.manifest.id, { theme: stored, installedAt: this.now() });
    return cloneTheme(stored);
  }

  async importJson(json: string): Promise<ThemePackage> {
    if (new TextEncoder().encode(json).byteLength > 512_000) throw new ThemeInstallError('Theme package exceeds the 512 KB limit');
    let parsed: unknown;
    try { parsed = JSON.parse(json); }
    catch { throw new ThemeInstallError('Theme file is not valid JSON'); }
    return this.install(parsed as ThemePackage);
  }

  async remove(id: string): Promise<boolean> {
    if (this.builtInIds.has(id)) return false;
    const existing = await this.db.get<InstalledThemeRecord>('themes', id);
    if (!existing) return false;
    await this.db.delete('themes', id);
    return true;
  }

  async exportJson(id: string): Promise<string> {
    return `${JSON.stringify(await this.get(id), null, 2)}\n`;
  }
}
