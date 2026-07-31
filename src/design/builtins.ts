import mosaic from '../../themes/builtin/mosaic.json';
import liquid from '../../themes/builtin/liquid.json';
import classic from '../../themes/builtin/classic.json';
import paper from '../../themes/builtin/paper.json';
import terminal from '../../themes/builtin/terminal.json';
import neon from '../../themes/builtin/neon.json';
import registry from '../../themes/registry.json';
import type { ThemePackage, ThemeRegistry } from '../../theme-sdk/types.ts';

export const BUILTIN_THEMES: ThemePackage[] = [mosaic, liquid, classic, paper, terminal, neon] as ThemePackage[];
export const BUILTIN_THEME_MAP = new Map(BUILTIN_THEMES.map((theme) => [theme.manifest.id, theme]));
export const BUILTIN_REGISTRY = registry as ThemeRegistry;
export { DEFAULT_THEME_ID } from './constants.ts';
import { DEFAULT_THEME_ID } from './constants.ts';

export function getBuiltinTheme(id: string): ThemePackage {
  return BUILTIN_THEME_MAP.get(id) ?? BUILTIN_THEME_MAP.get(DEFAULT_THEME_ID)!;
}
