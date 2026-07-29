import { readFile, readdir, stat } from 'node:fs/promises';
import { dirname, extname, relative, resolve } from 'node:path';

const root = process.cwd();
const requiredFiles = [
  'app.config.ts',
  'eas.json',
  'eslint.config.cjs',
  'app/_layout.tsx',
  'app/index.tsx',
  'app/(tabs)/_layout.tsx',
  'app/(tabs)/index.tsx',
  'app/(tabs)/search.tsx',
  'app/(tabs)/library.tsx',
  'app/(tabs)/themes.tsx',
  'app/(tabs)/settings.tsx',
  'app/story/[id].tsx',
  'app/user/[id].tsx',
  'app/theme/[id].tsx',
  'app/theme/studio.tsx',
  'app/discovery/domain/[domain].tsx',
  'app/collection/[id].tsx',
  'app/rules.tsx',
  'app/presets.tsx',
  'app/command.tsx',
  'app/archive.tsx',
  'src/features/archive/ArchiveScreen.tsx',
  'theme-sdk/theme.schema.json',
  'themes/registry.json',
  'assets/icon.png',
  'assets/adaptive-icon.png',
  'assets/splash-icon.png',
  'docs/ARCHITECTURE.md',
  'docs/PRIVACY.md',
  'docs/PERFORMANCE.md',
  'docs/THEME_AUTHORING.md',
  'docs/RELEASE_CHECKLIST.md',
  'docs/VERIFICATION_REPORT.md',
  '.github/workflows/quality.yml',
  '.maestro/feed.yaml',
  '.maestro/theme.yaml',
  'README.md',
  'CONTRIBUTING.md',
  'SECURITY.md',
  'CODE_OF_CONDUCT.md',
  'LICENSE'
];

const failures = [];
for (const file of requiredFiles) {
  try {
    const info = await stat(resolve(root, file));
    if (!info.isFile() || info.size === 0) failures.push(`${file}: missing or empty`);
  } catch {
    failures.push(`${file}: missing`);
  }
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (['.git', 'node_modules', 'dist', 'coverage'].includes(entry.name)) continue;
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    else files.push(path);
  }
  return files;
}

const allFiles = await walk(root);
const textByFile = new Map();
for (const path of allFiles) {
  if (!/\.(?:ts|tsx|js|mjs|cjs|json|md|ya?ml)$/.test(path)) continue;
  const file = relative(root, path);
  const text = await readFile(path, 'utf8');
  textByFile.set(file, text);
  if (file !== 'scripts/verify-source.mjs' && /\b(?:TODO|TBD|FIXME)\b/.test(text) && !file.includes('docs/superpowers/')) failures.push(`${file}: contains unfinished marker`);
  if (/^(?:app|src|theme-sdk)\//.test(file) && /(?:from|require\()\s*['"](?:@sentry|sentry|segment|amplitude|mixpanel|openai|anthropic)/i.test(text)) failures.push(`${file}: contains a prohibited hosted-service dependency`);
  if (/^(?:app|src|theme-sdk)\//.test(file) && !file.endsWith('.test.ts') && /(?:@ts-ignore|@ts-nocheck|\bas any\b|:\s*any\b|<any>)/.test(text)) failures.push(`${file}: contains a type-safety escape hatch`);
}

const pkg = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
const dependencyNames = new Set(Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }));
if (pkg.license !== 'MIT') failures.push('package.json: license must be MIT');
if (pkg.main !== 'expo-router/entry') failures.push('package.json: Expo Router entry is missing');
if (pkg.type !== 'module') failures.push('package.json: module type must be explicit');
if (!pkg.scripts?.verify) failures.push('package.json: verify script is missing');
for (const name of dependencyNames) {
  if (/sentry|segment|amplitude|mixpanel|openai|anthropic/i.test(name)) failures.push(`package.json: prohibited dependency ${name}`);
  if (['react-dom', 'react-native-web'].includes(name)) failures.push(`package.json: mobile release must not include ${name}`);
}

function packageRoot(specifier) {
  if (specifier.startsWith('@')) return specifier.split('/').slice(0, 2).join('/');
  return specifier.split('/')[0];
}

async function relativeModuleExists(fromPath, specifier) {
  const base = resolve(dirname(fromPath), specifier);
  const candidates = extname(base)
    ? [base]
    : [base, `${base}.ts`, `${base}.tsx`, `${base}.js`, `${base}.mjs`, `${base}.cjs`, `${base}.json`, resolve(base, 'index.ts'), resolve(base, 'index.tsx'), resolve(base, 'index.js')];
  for (const candidate of candidates) {
    try { if ((await stat(candidate)).isFile()) return true; } catch { /* try next */ }
  }
  return false;
}

const importPatterns = [
  /\bimport\s+(?:type\s+)?(?:[^'"\n]+?\s+from\s+)?['"]([^'"]+)['"]/g,
  /\bimport\s*\(\s*['"]([^'"]+)['"]/g,
  /\brequire\s*\(\s*['"]([^'"]+)['"]/g
];
for (const [file, text] of textByFile) {
  if (!/\.(?:ts|tsx|js|mjs|cjs)$/.test(file)) continue;
  const absolute = resolve(root, file);
  const specifiers = new Set();
  for (const pattern of importPatterns) for (const match of text.matchAll(pattern)) if (match[1]) specifiers.add(match[1]);
  for (const specifier of specifiers) {
    if (specifier.startsWith('node:')) continue;
    if (specifier.startsWith('.')) {
      if (!await relativeModuleExists(absolute, specifier)) failures.push(`${file}: unresolved relative import ${specifier}`);
      continue;
    }
    const name = packageRoot(specifier);
    if (!dependencyNames.has(name)) failures.push(`${file}: imports undeclared package ${name}`);
  }
}

const appConfig = textByFile.get('app.config.ts') ?? '';
for (const required of ["platforms: ['ios', 'android']", "bundleIdentifier: 'com.maxyaport.mosaichn'", "package: 'com.maxyaport.mosaichn'", 'newArchEnabled: true']) {
  if (!appConfig.includes(required)) failures.push(`app.config.ts: missing ${required}`);
}
for (const prohibited of ['reactCompiler', 'UIFileSharingEnabled', 'LSSupportsOpeningDocumentsInPlace']) {
  if (appConfig.includes(prohibited)) failures.push(`app.config.ts: prohibited release setting ${prohibited}`);
}

const surface = textByFile.get('src/components/Surface.tsx') ?? '';
if (!surface.includes('isLiquidGlassAvailable()') || !surface.includes('isGlassEffectAPIAvailable()')) failures.push('src/components/Surface.tsx: native glass availability guards are incomplete');
const themeUsage = {
  shell: textByFile.get('src/components/MosaicTabBar.tsx') ?? '',
  navigation: textByFile.get('src/components/MosaicTabBar.tsx') ?? '',
  feed: textByFile.get('src/components/StoryCard.tsx') ?? '',
  metadata: textByFile.get('src/components/StoryCard.tsx') ?? '',
  comments: textByFile.get('src/components/CommentRow.tsx') ?? '',
  story: textByFile.get('src/features/story/StoryScreen.tsx') ?? ''
};
for (const [key, text] of Object.entries(themeUsage)) if (!text.includes(`layout.${key}`)) failures.push(`theme runtime: layout.${key} is declared but not rendered`);

const repository = textByFile.get('src/db/reader-repository.ts') ?? '';
for (const required of ['getMany<', 'MAX_STORY_SNAPSHOTS = 256', 'SNAPSHOT_MIN_INTERVAL_SECONDS = 30 * 60', 'MAX_FEED_ARCHIVE_DAYS = 365', 'listFeedArchive(', 'getArchivedFeed(']) {
  if (!repository.includes(required)) failures.push(`reader repository: missing performance/storage guard ${required}`);
}

const workflow = textByFile.get('.github/workflows/quality.yml') ?? '';
for (const required of ['npx tsc -p tsconfig.json --noEmit', 'npx expo-doctor', 'expo export --platform ios', 'expo export --platform android']) {
  if (!workflow.includes(required)) failures.push(`quality workflow: missing ${required}`);
}

for (const asset of ['assets/icon.png', 'assets/adaptive-icon.png', 'assets/splash-icon.png']) {
  try {
    const info = await stat(resolve(root, asset));
    if (info.size < 1_024) failures.push(`${asset}: release asset is unexpectedly small`);
  } catch { /* already reported */ }
}

if (failures.length) {
  console.error(`Source verification failed with ${failures.length} issue(s):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(`Source verification passed: ${requiredFiles.length} release files present; imports, mobile configuration, theme coverage, storage guards, and dependency policy are consistent.`);
