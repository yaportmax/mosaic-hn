import { readdir, readFile } from 'node:fs/promises';
import { isAbsolute, relative, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { validateThemePackage } from '../theme-sdk/validate.ts';

const themesRoot = resolve(process.cwd(), 'themes');
const directory = resolve(themesRoot, 'builtin');
const files = (await readdir(directory)).filter((name: string) => name.endsWith('.json')).sort();
let failed = false;
for (const file of files) {
  const value = JSON.parse(await readFile(resolve(directory, file), 'utf8')) as unknown;
  const issues = validateThemePackage(value, { appVersion: '1.0.0' });
  if (issues.length === 0) console.log(`✓ ${file}`);
  else {
    failed = true;
    console.error(`✗ ${file}`);
    for (const issue of issues) console.error(`  ${issue.path || '<root>'}: ${issue.message}`);
  }
}
if (files.length !== 6) {
  failed = true;
  console.error(`Expected 6 built-in themes; found ${files.length}`);
}


const registry = JSON.parse(await readFile(resolve(themesRoot, 'registry.json'), 'utf8')) as {
  version?: unknown;
  themes?: Array<{ id?: unknown; version?: unknown; name?: unknown; author?: unknown; downloadUrl?: unknown; sha256?: unknown; minAppVersion?: unknown }>;
};
if (registry.version !== 1 || !Array.isArray(registry.themes) || registry.themes.length !== files.length) {
  failed = true;
  console.error('Theme registry must contain exactly the six built-in packages');
} else {
  for (const entry of registry.themes) {
    try {
      if (typeof entry.downloadUrl !== 'string' || !entry.downloadUrl.startsWith('./builtin/')) throw new Error('downloadUrl must be a bundled relative path');
      const filePath = resolve(themesRoot, entry.downloadUrl.replace(/^\.\//, ''));
      const relativePath = relative(directory, filePath);
      if (!relativePath || relativePath.startsWith('..') || isAbsolute(relativePath)) throw new Error('downloadUrl escapes the built-in theme directory');
      const contents = await readFile(filePath, 'utf8');
      const theme = JSON.parse(contents) as { manifest?: { id?: unknown; version?: unknown; name?: unknown; author?: unknown; minAppVersion?: unknown } };
      const digest = createHash('sha256').update(contents).digest('hex');
      if (digest !== entry.sha256) throw new Error('SHA-256 does not match the package file');
      for (const key of ['id', 'version', 'name', 'author', 'minAppVersion'] as const) {
        if (entry[key] !== theme.manifest?.[key]) throw new Error(`${key} does not match the package manifest`);
      }
      console.log(`✓ registry ${String(entry.id)}`);
    } catch (reason) {
      failed = true;
      console.error(`✗ registry ${String(entry.id ?? '<unknown>')}: ${reason instanceof Error ? reason.message : 'invalid entry'}`);
    }
  }
}

if (failed) process.exitCode = 1;
