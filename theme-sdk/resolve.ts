import type { ResolvedTheme, ThemeAccessibilityState, ThemePackage, ThemeTokens } from './types.ts';

const cloneTokens = (tokens: ThemeTokens): ThemeTokens => structuredClone(tokens);

export function resolveTheme(theme: ThemePackage, accessibility: ThemeAccessibilityState): ResolvedTheme {
  const scheme = accessibility.colorScheme;
  const highContrast = scheme === 'dark' ? theme.tokens.highContrastDark : theme.tokens.highContrastLight;
  const normal = scheme === 'dark' ? (theme.tokens.dark ?? theme.tokens.light) : theme.tokens.light;
  const tokens = cloneTokens(accessibility.highContrast && highContrast ? highContrast : normal);
  if (accessibility.reduceMotion) tokens.motion.durationScale = 0;
  if (accessibility.reduceTransparency) {
    tokens.effects.glass = false;
    tokens.effects.blur = 0;
  }
  if (accessibility.highContrast) {
    tokens.shape.borderWidth = Math.max(1, tokens.shape.borderWidth);
    tokens.effects.shadow = Math.min(tokens.effects.shadow, 0.35);
  }
  return { manifest: structuredClone(theme.manifest), layout: structuredClone(theme.layout), tokens, sourceScheme: scheme };
}
