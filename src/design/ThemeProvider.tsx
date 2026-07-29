import { AccessibilityInfo, Appearance, useColorScheme } from 'react-native';
import * as SystemUI from 'expo-system-ui';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { ResolvedTheme, ThemePackage } from '../../theme-sdk/types.ts';
import { resolveTheme } from '../../theme-sdk/resolve.ts';
import { getBuiltinTheme } from './builtins.ts';
import { DEFAULT_THEME_ID } from './constants.ts';
import { useAppServices, usePreferences } from '../app/AppServices.tsx';

interface ThemeRuntimeValue {
  package: ThemePackage;
  theme: ResolvedTheme;
  selectTheme(id: string): Promise<void>;
}

const ThemeRuntimeContext = createContext<ThemeRuntimeValue | null>(null);

async function queryAccessibility(): Promise<{ reduceMotion: boolean; reduceTransparency: boolean }> {
  const accessibility = AccessibilityInfo as typeof AccessibilityInfo & { isReduceTransparencyEnabled?: () => Promise<boolean> };
  const [reduceMotion, reduceTransparency] = await Promise.all([
    AccessibilityInfo.isReduceMotionEnabled().catch(() => false),
    accessibility.isReduceTransparencyEnabled?.().catch(() => false) ?? Promise.resolve(false)
  ]);
  return { reduceMotion, reduceTransparency };
}

export function ThemeRuntimeProvider({ children }: { children: ReactNode }) {
  const { themes, preferences: controller } = useAppServices();
  const preferences = usePreferences();
  const systemScheme = useColorScheme() ?? Appearance.getColorScheme() ?? 'light';
  const [themePackage, setThemePackage] = useState<ThemePackage>(() => getBuiltinTheme(preferences.activeThemeId));
  const [systemAccessibility, setSystemAccessibility] = useState({ reduceMotion: false, reduceTransparency: false });

  useEffect(() => {
    let active = true;
    void themes.get(preferences.activeThemeId).then((next) => { if (active) setThemePackage(next); }).catch(() => {
      if (active) setThemePackage(getBuiltinTheme(DEFAULT_THEME_ID));
    });
    return () => { active = false; };
  }, [themes, preferences.activeThemeId]);

  useEffect(() => {
    let active = true;
    void queryAccessibility().then((value) => { if (active) setSystemAccessibility(value); });
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', (reduceMotion) => setSystemAccessibility((state) => ({ ...state, reduceMotion })));
    const accessibility = AccessibilityInfo as typeof AccessibilityInfo & { addEventListener: (name: string, handler: (value: boolean) => void) => { remove(): void } };
    const transparency = accessibility.addEventListener?.('reduceTransparencyChanged', (reduceTransparency) => setSystemAccessibility((state) => ({ ...state, reduceTransparency })));
    return () => { active = false; motion.remove(); transparency?.remove?.(); };
  }, []);

  const resolved = useMemo(() => resolveTheme(themePackage, {
    colorScheme: preferences.colorMode === 'system' ? systemScheme : preferences.colorMode,
    highContrast: preferences.highContrast,
    reduceMotion: preferences.reduceMotion === 'on' || (preferences.reduceMotion === 'system' && systemAccessibility.reduceMotion),
    reduceTransparency: preferences.reduceTransparency === 'on' || (preferences.reduceTransparency === 'system' && systemAccessibility.reduceTransparency)
  }), [themePackage, preferences.colorMode, preferences.highContrast, preferences.reduceMotion, preferences.reduceTransparency, systemScheme, systemAccessibility]);

  useEffect(() => { void SystemUI.setBackgroundColorAsync(resolved.tokens.colors.background).catch(() => undefined); }, [resolved.tokens.colors.background]);

  const value = useMemo<ThemeRuntimeValue>(() => ({
    package: themePackage,
    theme: resolved,
    async selectTheme(id: string) { await controller.update({ activeThemeId: id }); }
  }), [themePackage, resolved, controller]);

  return <ThemeRuntimeContext.Provider value={value}>{children}</ThemeRuntimeContext.Provider>;
}

export function useThemeRuntime(): ThemeRuntimeValue {
  const value = useContext(ThemeRuntimeContext);
  if (!value) throw new Error('ThemeRuntimeProvider is missing');
  return value;
}
