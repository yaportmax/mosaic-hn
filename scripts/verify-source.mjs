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
  'app/(tabs)/archive.tsx',
  'app/(tabs)/presets.tsx',
  'app/(tabs)/rules.tsx',
  'app/(tabs)/themes.tsx',
  'app/(tabs)/settings.tsx',
  'app/(tabs)/modules.tsx',
  'app/(tabs)/more.tsx',
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
  'app/modules.tsx',
  'module-sdk/types.ts',
  'module-sdk/registry.ts',
  'module-sdk/configuration.ts',
  'module-sdk/configuration.test.ts',
  'src/modules/runtime.ts',
  'src/modules/runtime.test.ts',
  'src/modules/capabilities.ts',
  'src/modules/capabilities.test.ts',
  'src/state/modules.ts',
  'src/state/modules.test.ts',
  'src/features/modules/ModulesScreen.tsx',
  'src/components/MoreModulesScreen.tsx',
  'src/components/ModuleUnavailable.tsx',
  'src/features/archive/ArchiveScreen.tsx',
  'theme-sdk/theme.schema.json',
  'themes/registry.json',
  'assets/icon.png',
  'assets/adaptive-icon.png',
  'assets/splash-icon.png',
  'docs/ARCHITECTURE.md',
  'docs/MODULES.md',
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
  const file = relative(root, path).replaceAll('\\', '/');
  const text = await readFile(path, 'utf8');
  textByFile.set(file, text);
  if (file !== 'scripts/verify-source.mjs' && /\b(?:TODO|TBD|FIXME)\b/.test(text) && !file.includes('docs/superpowers/')) failures.push(`${file}: contains unfinished marker`);
  if (/^(?:app|src|theme-sdk|module-sdk)\//.test(file) && /(?:from|require\()\s*['"](?:@sentry|sentry|segment|amplitude|mixpanel|openai|anthropic)/i.test(text)) failures.push(`${file}: contains a prohibited hosted-service dependency`);
  if (/^(?:app|src|theme-sdk|module-sdk)\//.test(file) && !file.endsWith('.test.ts') && /(?:@ts-ignore|@ts-nocheck|\bas any\b|:\s*any\b|<any>)/.test(text)) failures.push(`${file}: contains a type-safety escape hatch`);
}

const pkg = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
const dependencyNames = new Set(Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }));
if (pkg.license !== 'MIT') failures.push('package.json: license must be MIT');
if (pkg.main !== 'expo-router/entry') failures.push('package.json: Expo Router entry is missing');
if (pkg.type !== 'module') failures.push('package.json: module type must be explicit');
if (!pkg.scripts?.verify) failures.push('package.json: verify script is missing');
for (const required of ['src/modules/*.test.ts', 'module-sdk/*.test.ts']) {
  if (!pkg.scripts?.test?.includes(required)) failures.push(`package.json: test script must include ${required}`);
}
for (const name of dependencyNames) {
  if (/sentry|segment|amplitude|mixpanel|openai|anthropic/i.test(name)) failures.push(`package.json: prohibited dependency ${name}`);
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
if (!["platforms: ['ios', 'android']", "platforms: ['ios', 'android', 'web']"].some((platforms) => appConfig.includes(platforms))) {
  failures.push("app.config.ts: missing required iOS and Android platforms");
}
for (const required of ["bundleIdentifier: 'com.maxyaport.mosaichn'", "package: 'com.maxyaport.mosaichn'", 'newArchEnabled: true']) {
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

const moduleRegistry = textByFile.get('module-sdk/registry.ts') ?? '';
const moduleConfiguration = textByFile.get('module-sdk/configuration.ts') ?? '';
const moduleManager = textByFile.get('src/features/modules/ModulesScreen.tsx') ?? '';
const moduleDocs = textByFile.get('docs/MODULES.md') ?? '';
const readme = textByFile.get('README.md') ?? '';

for (const required of [
  "id: 'feed'", "id: 'search'", "id: 'library'", "id: 'archive'", "id: 'algorithms'", "id: 'automation'",
  "id: 'themes'", "id: 'settings'", "id: 'modules'", "id: 'comments'", "id: 'discovery'"
]) if (!moduleRegistry.includes(required)) failures.push(`module registry: missing ${required}`);

const navigationRoutes = {
  feed: ['index', 'app/(tabs)/index.tsx'],
  search: ['search', 'app/(tabs)/search.tsx'],
  library: ['library', 'app/(tabs)/library.tsx'],
  archive: ['archive', 'app/(tabs)/archive.tsx'],
  algorithms: ['presets', 'app/(tabs)/presets.tsx'],
  automation: ['rules', 'app/(tabs)/rules.tsx'],
  themes: ['themes', 'app/(tabs)/themes.tsx'],
  settings: ['settings', 'app/(tabs)/settings.tsx'],
  modules: ['modules', 'app/(tabs)/modules.tsx']
};
for (const [id, [tabRoute, routeFile]] of Object.entries(navigationRoutes)) {
  const definitionPattern = new RegExp(`id: '${id}'[\\s\\S]*?tabRoute: '${tabRoute}'`);
  if (!definitionPattern.test(moduleRegistry)) failures.push(`module registry: ${id} is missing tabRoute ${tabRoute}`);
  if (!textByFile.has(routeFile)) failures.push(`module routing: missing ${routeFile}`);
}

const guardedRoutes = {
  'app/(tabs)/search.tsx': 'search',
  'app/(tabs)/library.tsx': 'library',
  'app/(tabs)/archive.tsx': 'archive',
  'app/(tabs)/presets.tsx': 'algorithms',
  'app/(tabs)/rules.tsx': 'automation',
  'app/(tabs)/themes.tsx': 'themes',
  'app/(tabs)/settings.tsx': 'settings',
  'app/archive.tsx': 'archive',
  'app/presets.tsx': 'algorithms',
  'app/rules.tsx': 'automation',
  'app/theme/[id].tsx': 'themes',
  'app/theme/studio.tsx': 'themes',
  'app/discovery/domain/[domain].tsx': 'discovery',
  'app/user/[id].tsx': 'discovery',
  'app/collection/[id].tsx': 'library'
};
for (const [file, id] of Object.entries(guardedRoutes)) {
  if (!(textByFile.get(file) ?? '').includes(`ModuleGate moduleId="${id}"`)) failures.push(`module routing: ${file} is not guarded by ${id}`);
}

for (const required of ['MAX_IMPORT_BYTES', 'MAX_MODULE_RECORDS', 'definition.required', 'addDependencies(', 'tabCandidates.length === 0', 'homeModuleId']) {
  if (!moduleConfiguration.includes(required)) failures.push(`module configuration: missing recovery/import guard ${required}`);
}
for (const required of ['setEnabled(', 'setPlacement(', 'move(', 'setHome(', 'exportModuleConfiguration(', 'importModuleConfiguration(']) {
  if (!moduleManager.includes(required)) failures.push(`module manager: missing control ${required}`);
}
for (const required of ['Disabling a module does not delete', 'Feed and Modules are required', 'cannot execute code']) {
  if (!moduleDocs.includes(required)) failures.push(`docs/MODULES.md: missing required contract text ${required}`);
}
if (!readme.includes('[Modules](docs/MODULES.md)') || !readme.includes('user-facing module system')) failures.push('README.md: module system is not prominent or linked');

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
console.log(`Source verification passed: ${requiredFiles.length} release files present; imports, mobile configuration, module routing/recovery, theme coverage, storage guards, and dependency policy are consistent.`);
