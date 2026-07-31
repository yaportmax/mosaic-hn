import { Platform, StyleSheet, View, type ViewProps, type ViewStyle } from 'react-native';
import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import { useThemeRuntime } from '../design/ThemeProvider.tsx';

export function Surface({ children, style, interactive = false, elevated = false, ...props }: ViewProps & { interactive?: boolean; elevated?: boolean }) {
  const { theme } = useThemeRuntime();
  const tokens = theme.tokens;
  const webGlass = Platform.OS === 'web' && tokens.effects.glass ? {
    backdropFilter: `blur(${tokens.effects.blur}px) saturate(180%)`,
    WebkitBackdropFilter: `blur(${tokens.effects.blur}px) saturate(180%)`
  } as ViewStyle : null;
  const shared = [
    styles.base,
    {
      backgroundColor: tokens.colors.surface,
      borderColor: tokens.colors.border,
      borderRadius: tokens.shape.radius,
      borderWidth: tokens.shape.borderWidth,
      boxShadow: elevated && tokens.effects.shadow > 0 ? `0px 8px 24px rgba(0,0,0,${tokens.effects.shadow})` : undefined
    },
    webGlass,
    style
  ];
  const useGlass = Platform.OS === 'ios' && tokens.effects.glass && isLiquidGlassAvailable() && isGlassEffectAPIAvailable();
  if (useGlass) return <GlassView {...props} isInteractive={interactive} glassEffectStyle="regular" colorScheme={theme.sourceScheme} tintColor={tokens.colors.surface} style={[
    styles.base,
    {
      backgroundColor: 'transparent',
      borderRadius: tokens.shape.radius
    },
    style
  ]}>{children}</GlassView>;
  return <View {...props} style={shared}>
    {tokens.effects.glass ? <><View pointerEvents="none" style={styles.glassHighlight} /><View pointerEvents="none" style={[styles.glassGlow, { backgroundColor: `${tokens.colors.accent}1F` }]} /></> : null}
    {children}
  </View>;
}

const styles = StyleSheet.create({
  base: { overflow: 'hidden' },
  glassHighlight: { position: 'absolute', top: 0, left: 18, right: 18, height: 1, backgroundColor: 'rgba(255,255,255,0.62)' },
  glassGlow: { position: 'absolute', width: 120, height: 72, borderRadius: 60, top: -48, right: -24, opacity: 0.72 }
});
