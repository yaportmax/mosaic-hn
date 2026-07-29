export const MODULE_PLACEMENTS = ['tab', 'more', 'hidden'] as const;
export type ModulePlacement = (typeof MODULE_PLACEMENTS)[number];
export type ModuleKind = 'navigation' | 'capability';

export interface ModuleDefinition {
  id: string;
  name: string;
  shortName: string;
  description: string;
  icon: string;
  activeIcon: string;
  kind: ModuleKind;
  required: boolean;
  defaultEnabled: boolean;
  defaultPlacement: ModulePlacement;
  allowedPlacements: readonly ModulePlacement[];
  dependencies: readonly string[];
  order: number;
  route: string | null;
  tabRoute: string | null;
  keywords: readonly string[];
}

export interface ModuleConfigurationV1 {
  version: 1;
  enabled: string[];
  placements: Record<string, ModulePlacement>;
  tabOrder: string[];
  moreOrder: string[];
  homeModuleId: string;
}
