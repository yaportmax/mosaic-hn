import { Platform, StyleSheet, View, type ViewProps } from 'react-native';
import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import { useThemeRuntime } from '../design/ThemeProvider.tsx';

export function Surface({ children, style, interactive = false, elevated = false, ...props }: ViewProps & { interactive?: boolean; elevated?: boolean }) {
  const { theme } = useThemeRuntime();
  const tokens = theme.tokens;
  const shared = [
    styles.base,
    {
      backgroundColor: tokens.colors.surface,
      borderColor: tokens.colors.border,
      borderRadius: tokens.shape.radius,
      borderWidth: tokens.shape.borderWidth,
      boxShadow: elevated && tokens.effects.shadow > 0 ? `0px 8px 24px rgba(0,0,0,${tokens.effects.shadow})` : undefined
    },
    style
  ];
  const useGlass = Platform.OS === 'ios' && tokens.effects.glass && isLiquidGlassAvailable() && isGlassEffectAPIAvailable();
  if (useGlass) return <GlassView {...props} isInteractive={interactive} glassEffectStyle="regular" tintColor={tokens.colors.surface} style={shared}>{children}</GlassView>;
  return <View {...props} style={shared}>{children}</View>;
}

const styles = StyleSheet.create({ base: { overflow: 'hidden' } });
