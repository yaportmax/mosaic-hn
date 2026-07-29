import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { validateThemePackage } from '../theme-sdk/validate.ts';

const directory = resolve(process.cwd(), 'themes/builtin');
const files = (await readdir(directory)).filter((name) => name.endsWith('.json')).sort();
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
if (failed) process.exitCode = 1;
