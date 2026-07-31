import type { ModuleDefinition } from './types.ts';

export const BUILTIN_MODULES: readonly ModuleDefinition[] = Object.freeze([
  {
    id: 'feed',
    name: 'Feed',
    shortName: 'Feed',
    description: 'Hacker News feeds, local ranking, refresh, and story navigation.',
    icon: 'newspaper-outline',
    activeIcon: 'newspaper',
    kind: 'navigation',
    required: true,
    defaultEnabled: true,
    defaultPlacement: 'tab',
    allowedPlacements: ['tab', 'more', 'hidden'],
    dependencies: [],
    order: 10,
    route: '/(tabs)',
    tabRoute: 'index',
    keywords: ['home', 'top', 'new', 'best', 'ask', 'show', 'jobs']
  },
  {
    id: 'search',
    name: 'Search',
    shortName: 'Search',
    description: 'Full-text search across stories, comments, authors, and domains saved locally.',
    icon: 'search-outline',
    activeIcon: 'search',
    kind: 'navigation',
    required: false,
    defaultEnabled: true,
    defaultPlacement: 'tab',
    allowedPlacements: ['tab', 'more', 'hidden'],
    dependencies: [],
    order: 20,
    route: '/(tabs)/search',
    tabRoute: 'search',
    keywords: ['find', 'local', 'archive', 'fts']
  },
  {
    id: 'library',
    name: 'Library',
    shortName: 'Library',
    description: 'Bookmarks, reading queue, saved comments, notes, tags, and collections.',
    icon: 'library-outline',
    activeIcon: 'library',
    kind: 'navigation',
    required: false,
    defaultEnabled: true,
    defaultPlacement: 'tab',
    allowedPlacements: ['tab', 'more', 'hidden'],
    dependencies: [],
    order: 30,
    route: '/(tabs)/library',
    tabRoute: 'library',
    keywords: ['saved', 'bookmarks', 'queue', 'notes', 'collections']
  },
  {
    id: 'archive',
    name: 'Time Travel',
    shortName: 'Archive',
    description: 'Locally observed daily feed snapshots and historical story positions.',
    icon: 'calendar-outline',
    activeIcon: 'calendar',
    kind: 'navigation',
    required: false,
    defaultEnabled: true,
    defaultPlacement: 'more',
    allowedPlacements: ['tab', 'more', 'hidden'],
    dependencies: ['feed'],
    order: 40,
    route: '/(tabs)/archive',
    tabRoute: 'archive',
    keywords: ['history', 'date', 'past', 'snapshot', 'time travel']
  },
  {
    id: 'algorithms',
    name: 'Feed Algorithms',
    shortName: 'Algorithms',
    description: 'Transparent local ranking presets and adjustable feed weights.',
    icon: 'options-outline',
    activeIcon: 'options',
    kind: 'navigation',
    required: false,
    defaultEnabled: true,
    defaultPlacement: 'more',
    allowedPlacements: ['tab', 'more', 'hidden'],
    dependencies: ['feed'],
    order: 50,
    route: '/(tabs)/presets',
    tabRoute: 'presets',
    keywords: ['ranking', 'custom feed', 'weights', 'preset']
  },
  {
    id: 'automation',
    name: 'Filters & Automation',
    shortName: 'Automation',
    description: 'Local rules that hide, boost, demote, save, queue, or tag matching stories.',
    icon: 'filter-outline',
    activeIcon: 'filter',
    kind: 'navigation',
    required: false,
    defaultEnabled: true,
    defaultPlacement: 'more',
    allowedPlacements: ['tab', 'more', 'hidden'],
    dependencies: ['feed'],
    order: 60,
    route: '/(tabs)/rules',
    tabRoute: 'rules',
    keywords: ['rules', 'block', 'mute', 'boost', 'tag']
  },
  {
    id: 'themes',
    name: 'Themes',
    shortName: 'Themes',
    description: 'Built-in visual systems, community themes, and the complete theme studio.',
    icon: 'color-palette-outline',
    activeIcon: 'color-palette',
    kind: 'navigation',
    required: false,
    defaultEnabled: true,
    defaultPlacement: 'tab',
    allowedPlacements: ['tab', 'more', 'hidden'],
    dependencies: [],
    order: 70,
    route: '/(tabs)/themes',
    tabRoute: 'themes',
    keywords: ['appearance', 'marketplace', 'skin', 'layout']
  },
  {
    id: 'settings',
    name: 'Settings',
    shortName: 'Settings',
    description: 'Reading, gestures, accessibility, data, and application preferences.',
    icon: 'settings-outline',
    activeIcon: 'settings',
    kind: 'navigation',
    required: false,
    defaultEnabled: true,
    defaultPlacement: 'tab',
    allowedPlacements: ['tab', 'more', 'hidden'],
    dependencies: [],
    order: 80,
    route: '/(tabs)/settings',
    tabRoute: 'settings',
    keywords: ['preferences', 'controls', 'accessibility', 'gestures']
  },
  {
    id: 'modules',
    name: 'Modules',
    shortName: 'Modules',
    description: 'Enable, disable, place, order, export, and import every app module.',
    icon: 'grid-outline',
    activeIcon: 'grid',
    kind: 'navigation',
    required: true,
    defaultEnabled: true,
    defaultPlacement: 'more',
    allowedPlacements: ['tab', 'more', 'hidden'],
    dependencies: [],
    order: 90,
    route: '/(tabs)/modules',
    tabRoute: 'modules',
    keywords: ['customize', 'features', 'components', 'setup', 'workspace']
  },
  {
    id: 'comments',
    name: 'Comments',
    shortName: 'Comments',
    description: 'Thread loading, collapse controls, new-comment markers, and discussion minimap.',
    icon: 'chatbubbles-outline',
    activeIcon: 'chatbubbles',
    kind: 'capability',
    required: false,
    defaultEnabled: true,
    defaultPlacement: 'hidden',
    allowedPlacements: ['hidden'],
    dependencies: ['feed'],
    order: 100,
    route: null,
    tabRoute: null,
    keywords: ['discussion', 'thread', 'replies', 'minimap']
  },
  {
    id: 'discovery',
    name: 'Discovery',
    shortName: 'Discovery',
    description: 'Domain pages, user profiles, related stories, and historical context links.',
    icon: 'compass-outline',
    activeIcon: 'compass',
    kind: 'capability',
    required: false,
    defaultEnabled: true,
    defaultPlacement: 'hidden',
    allowedPlacements: ['hidden'],
    dependencies: ['feed'],
    order: 110,
    route: null,
    tabRoute: null,
    keywords: ['domain', 'user', 'related', 'history', 'explore']
  }
]);

const ID_PATTERN = /^[a-z][a-z0-9-]{0,63}$/;

export function validateModuleRegistry(definitions: readonly ModuleDefinition[]): string[] {
  const failures: string[] = [];
  const ids = new Set<string>();
  const byId = new Map<string, ModuleDefinition>();
  for (const definition of definitions) {
    if (!ID_PATTERN.test(definition.id)) failures.push(`${definition.id}: invalid id`);
    if (ids.has(definition.id)) failures.push(`${definition.id}: duplicate id`);
    ids.add(definition.id);
    byId.set(definition.id, definition);
    if (!definition.name.trim() || !definition.shortName.trim() || !definition.description.trim()) failures.push(`${definition.id}: missing user-facing copy`);
    if (!definition.allowedPlacements.includes(definition.defaultPlacement)) failures.push(`${definition.id}: default placement is not allowed`);
    if (definition.required && !definition.defaultEnabled) failures.push(`${definition.id}: required modules must default to enabled`);
    if (definition.kind === 'navigation' && (!definition.route || !definition.tabRoute)) failures.push(`${definition.id}: navigation module requires route and tabRoute`);
    if (definition.kind === 'capability' && (definition.route || definition.tabRoute || definition.defaultPlacement !== 'hidden')) failures.push(`${definition.id}: capability modules cannot expose navigation routes`);
    if (definition.dependencies.includes(definition.id)) failures.push(`${definition.id}: cannot depend on itself`);
  }
  for (const definition of definitions) for (const dependency of definition.dependencies) if (!byId.has(dependency)) failures.push(`${definition.id}: unknown dependency ${dependency}`);

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (id: string): void => {
    if (visited.has(id)) return;
    if (visiting.has(id)) { failures.push(`${id}: dependency cycle`); return; }
    visiting.add(id);
    const definition = byId.get(id);
    if (definition) for (const dependency of definition.dependencies) visit(dependency);
    visiting.delete(id);
    visited.add(id);
  };
  for (const definition of definitions) visit(definition.id);
  return [...new Set(failures)];
}

export function moduleById(id: string, definitions: readonly ModuleDefinition[] = BUILTIN_MODULES): ModuleDefinition | undefined {
  return definitions.find((definition) => definition.id === id);
}
