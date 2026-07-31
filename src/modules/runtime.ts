import { BUILTIN_MODULES } from '../../module-sdk/registry.ts';
import type { ModuleConfigurationV1, ModuleDefinition, ModulePlacement } from '../../module-sdk/types.ts';

const BY_ID = new Map(BUILTIN_MODULES.map((definition) => [definition.id, definition]));

function orderedModules(configuration: ModuleConfigurationV1, order: readonly string[], placement: ModulePlacement): ModuleDefinition[] {
  return order
    .map((id) => BY_ID.get(id))
    .filter((definition): definition is ModuleDefinition => Boolean(definition))
    .filter((definition) => configuration.enabled.includes(definition.id) && configuration.placements[definition.id] === placement);
}

export function getTabModules(configuration: ModuleConfigurationV1): ModuleDefinition[] {
  return orderedModules(configuration, configuration.tabOrder, 'tab');
}

export function getMoreModules(configuration: ModuleConfigurationV1): ModuleDefinition[] {
  return orderedModules(configuration, configuration.moreOrder, 'more');
}

export function getHomeModule(configuration: ModuleConfigurationV1): ModuleDefinition {
  const configured = BY_ID.get(configuration.homeModuleId);
  if (configured?.kind === 'navigation' && configuration.enabled.includes(configured.id)) return configured;
  const fallback = getTabModules(configuration)[0]
    ?? getMoreModules(configuration)[0]
    ?? BUILTIN_MODULES.find((definition) => definition.id === 'feed');
  if (!fallback) throw new Error('Mosaic HN requires at least one navigation module');
  return fallback;
}

export function moduleForTabRoute(tabRoute: string): ModuleDefinition | undefined {
  return BUILTIN_MODULES.find((definition) => definition.tabRoute === tabRoute);
}

export function moduleForId(id: string): ModuleDefinition | undefined {
  return BY_ID.get(id);
}

export function isModuleEnabled(configuration: ModuleConfigurationV1, id: string): boolean {
  return configuration.enabled.includes(id);
}

export function enabledDependents(configuration: ModuleConfigurationV1, id: string): ModuleDefinition[] {
  const result: ModuleDefinition[] = [];
  const dependsOn = (definition: ModuleDefinition, target: string, visited: Set<string>): boolean => {
    if (visited.has(definition.id)) return false;
    visited.add(definition.id);
    if (definition.dependencies.includes(target)) return true;
    return definition.dependencies.some((dependency) => {
      const dependencyDefinition = BY_ID.get(dependency);
      return dependencyDefinition ? dependsOn(dependencyDefinition, target, visited) : false;
    });
  };
  for (const definition of BUILTIN_MODULES) {
    if (definition.id !== id && configuration.enabled.includes(definition.id) && dependsOn(definition, id, new Set<string>())) result.push(definition);
  }
  return result;
}
