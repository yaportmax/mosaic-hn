import { BUILTIN_MODULES } from './registry.ts';
import { MODULE_PLACEMENTS, type ModuleConfigurationV1, type ModuleDefinition, type ModulePlacement } from './types.ts';

const MAX_IMPORT_BYTES = 1_000_000;
const MAX_MODULE_RECORDS = 256;
const PLACEMENTS = new Set<ModulePlacement>(MODULE_PLACEMENTS);

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function orderedDefinitions(definitions: readonly ModuleDefinition[]): ModuleDefinition[] {
  return [...definitions].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
}

function uniqueKnownIds(value: unknown, known: ReadonlySet<string>): string[] {
  if (!Array.isArray(value)) return [];
  const result: string[] = [];
  for (const entry of value) if (typeof entry === 'string' && known.has(entry) && !result.includes(entry)) result.push(entry);
  return result;
}

function addDependencies(enabled: Set<string>, byId: ReadonlyMap<string, ModuleDefinition>): void {
  let changed = true;
  while (changed) {
    changed = false;
    for (const id of [...enabled]) {
      const definition = byId.get(id);
      if (!definition) continue;
      for (const dependency of definition.dependencies) if (!enabled.has(dependency)) { enabled.add(dependency); changed = true; }
    }
  }
}

function buildDefaultConfiguration(definitions: readonly ModuleDefinition[]): ModuleConfigurationV1 {
  const ordered = orderedDefinitions(definitions);
  const enabled = ordered.filter((definition) => definition.defaultEnabled || definition.required).map((definition) => definition.id);
  const placements: Record<string, ModulePlacement> = {};
  for (const definition of ordered) placements[definition.id] = definition.defaultPlacement;
  const tabOrder = ordered.filter((definition) => enabled.includes(definition.id) && definition.kind === 'navigation' && definition.defaultPlacement === 'tab').map((definition) => definition.id);
  const moreOrder = ordered.filter((definition) => enabled.includes(definition.id) && definition.kind === 'navigation' && definition.defaultPlacement === 'more').map((definition) => definition.id);
  const homeModuleId = tabOrder[0] ?? ordered.find((definition) => definition.kind === 'navigation' && enabled.includes(definition.id))?.id ?? 'feed';
  return { version: 1, enabled, placements, tabOrder, moreOrder, homeModuleId };
}

export const DEFAULT_MODULE_CONFIGURATION: ModuleConfigurationV1 = buildDefaultConfiguration(BUILTIN_MODULES);

export function normalizeModuleConfiguration(value: unknown, definitions: readonly ModuleDefinition[] = BUILTIN_MODULES): ModuleConfigurationV1 {
  const ordered = orderedDefinitions(definitions);
  const byId = new Map(ordered.map((definition) => [definition.id, definition]));
  const known = new Set(byId.keys());
  const source = asRecord(value);
  const defaults = buildDefaultConfiguration(ordered);

  const enabled = new Set<string>(source && Array.isArray(source.enabled) ? uniqueKnownIds(source.enabled, known) : defaults.enabled);
  for (const definition of ordered) if (definition.required) enabled.add(definition.id);
  addDependencies(enabled, byId);

  const rawPlacements = source ? asRecord(source.placements) : null;
  const placements: Record<string, ModulePlacement> = {};
  for (const definition of ordered) {
    const candidate = rawPlacements?.[definition.id];
    placements[definition.id] = typeof candidate === 'string' && PLACEMENTS.has(candidate as ModulePlacement) && definition.allowedPlacements.includes(candidate as ModulePlacement)
      ? candidate as ModulePlacement
      : definition.defaultPlacement;
  }

  const navigationEnabled = ordered.filter((definition) => definition.kind === 'navigation' && enabled.has(definition.id));
  const rawHome = source?.homeModuleId;
  let homeModuleId = typeof rawHome === 'string' && navigationEnabled.some((definition) => definition.id === rawHome)
    ? rawHome
    : navigationEnabled.find((definition) => definition.id === defaults.homeModuleId)?.id ?? navigationEnabled[0]?.id ?? 'feed';

  const tabCandidates = navigationEnabled.filter((definition) => placements[definition.id] === 'tab').map((definition) => definition.id);
  if (tabCandidates.length === 0) {
    const recovery = navigationEnabled.find((definition) => definition.id === homeModuleId && definition.allowedPlacements.includes('tab'))
      ?? navigationEnabled.find((definition) => definition.id === 'feed' && definition.allowedPlacements.includes('tab'))
      ?? navigationEnabled.find((definition) => definition.allowedPlacements.includes('tab'));
    if (recovery) placements[recovery.id] = 'tab';
  }

  const placedTabIds = new Set(navigationEnabled.filter((definition) => placements[definition.id] === 'tab').map((definition) => definition.id));
  const placedMoreIds = new Set(navigationEnabled.filter((definition) => placements[definition.id] === 'more').map((definition) => definition.id));
  const requestedTabs = uniqueKnownIds(source?.tabOrder, known).filter((id) => placedTabIds.has(id));
  const requestedMore = uniqueKnownIds(source?.moreOrder, known).filter((id) => placedMoreIds.has(id));
  const tabOrder = [...requestedTabs, ...ordered.map((definition) => definition.id).filter((id) => placedTabIds.has(id) && !requestedTabs.includes(id))];
  const moreOrder = [...requestedMore, ...ordered.map((definition) => definition.id).filter((id) => placedMoreIds.has(id) && !requestedMore.includes(id))];

  if (!enabled.has(homeModuleId) || byId.get(homeModuleId)?.kind !== 'navigation') homeModuleId = tabOrder[0] ?? moreOrder[0] ?? 'feed';

  return {
    version: 1,
    enabled: ordered.filter((definition) => enabled.has(definition.id)).map((definition) => definition.id),
    placements,
    tabOrder,
    moreOrder,
    homeModuleId
  };
}

export function setModuleEnabled(configuration: ModuleConfigurationV1, id: string, enabled: boolean, definitions: readonly ModuleDefinition[] = BUILTIN_MODULES): ModuleConfigurationV1 {
  const byId = new Map(definitions.map((definition) => [definition.id, definition]));
  const target = byId.get(id);
  if (!target || (target.required && !enabled)) return normalizeModuleConfiguration(configuration, definitions);
  const nextEnabled = new Set(configuration.enabled);
  if (enabled) {
    nextEnabled.add(id);
  } else {
    const remove = new Set<string>([id]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const definition of definitions) {
        if (!nextEnabled.has(definition.id) || remove.has(definition.id) || definition.required) continue;
        if (definition.dependencies.some((dependency) => remove.has(dependency))) { remove.add(definition.id); changed = true; }
      }
    }
    for (const removeId of remove) nextEnabled.delete(removeId);
  }
  return normalizeModuleConfiguration({ ...configuration, enabled: [...nextEnabled] }, definitions);
}

export function setModulePlacement(configuration: ModuleConfigurationV1, id: string, placement: ModulePlacement, definitions: readonly ModuleDefinition[] = BUILTIN_MODULES): ModuleConfigurationV1 {
  const definition = definitions.find((candidate) => candidate.id === id);
  if (!definition || definition.kind !== 'navigation' || !definition.allowedPlacements.includes(placement)) return normalizeModuleConfiguration(configuration, definitions);
  return normalizeModuleConfiguration({ ...configuration, placements: { ...configuration.placements, [id]: placement } }, definitions);
}

export function moveModule(configuration: ModuleConfigurationV1, id: string, direction: -1 | 1, definitions: readonly ModuleDefinition[] = BUILTIN_MODULES): ModuleConfigurationV1 {
  const placement = configuration.placements[id];
  const key = placement === 'tab' ? 'tabOrder' : placement === 'more' ? 'moreOrder' : null;
  if (!key) return normalizeModuleConfiguration(configuration, definitions);
  const order = [...configuration[key]];
  const index = order.indexOf(id);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= order.length) return normalizeModuleConfiguration(configuration, definitions);
  const other = order[target];
  if (!other) return normalizeModuleConfiguration(configuration, definitions);
  order[target] = id;
  order[index] = other;
  return normalizeModuleConfiguration({ ...configuration, [key]: order }, definitions);
}

export function setHomeModule(configuration: ModuleConfigurationV1, id: string, definitions: readonly ModuleDefinition[] = BUILTIN_MODULES): ModuleConfigurationV1 {
  return normalizeModuleConfiguration({ ...configuration, homeModuleId: id }, definitions);
}

export function exportModuleConfiguration(configuration: ModuleConfigurationV1): string {
  return JSON.stringify(normalizeModuleConfiguration(configuration), null, 2);
}

function assertStringArray(value: unknown, path: string): void {
  if (!Array.isArray(value)) throw new Error(`Invalid module configuration: ${path} must be an array`);
  if (value.length > MAX_MODULE_RECORDS) throw new Error(`Invalid module configuration: ${path} exceeds the ${MAX_MODULE_RECORDS} record limit`);
  if (value.some((entry) => typeof entry !== 'string')) throw new Error(`Invalid module configuration: ${path} must contain only module ids`);
}

export function importModuleConfiguration(text: string): ModuleConfigurationV1 {
  if (new TextEncoder().encode(text).byteLength > MAX_IMPORT_BYTES) throw new Error(`Invalid module configuration: exceeds the ${MAX_IMPORT_BYTES.toLocaleString()} byte limit`);
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { throw new Error('Invalid JSON'); }
  const source = asRecord(parsed);
  if (!source) throw new Error('Invalid module configuration: root must be an object');
  if (source.version !== 1) throw new Error(`Unsupported module configuration version: ${String(source.version)}`);
  assertStringArray(source.enabled, 'enabled');
  assertStringArray(source.tabOrder, 'tabOrder');
  assertStringArray(source.moreOrder, 'moreOrder');
  if (typeof source.homeModuleId !== 'string') throw new Error('Invalid module configuration: homeModuleId must be a module id');
  const placements = asRecord(source.placements);
  if (!placements) throw new Error('Invalid module configuration: placements must be an object');
  if (Object.keys(placements).length > MAX_MODULE_RECORDS) throw new Error(`Invalid module configuration: placements exceeds the ${MAX_MODULE_RECORDS} record limit`);
  for (const [id, placement] of Object.entries(placements)) {
    if (typeof placement !== 'string' || !PLACEMENTS.has(placement as ModulePlacement)) throw new Error(`Invalid module configuration: placements.${id} is not supported`);
  }
  return normalizeModuleConfiguration(source);
}
