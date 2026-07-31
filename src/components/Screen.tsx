import { StyleSheet, View, type ViewProps } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { useThemeRuntime } from '../design/ThemeProvider.tsx';

export function Screen({ children, style, edges = ['top'], ...props }: ViewProps & { edges?: Edge[] }) {
  const { theme } = useThemeRuntime();
  const glass = theme.tokens.effects.glass;
  return <SafeAreaView edges={edges} style={[{ flex: 1, backgroundColor: theme.tokens.colors.background }, style]} {...props}>
    {glass ? <View pointerEvents="none" style={ambientStyles.field}>
      <View style={[ambientStyles.orb, ambientStyles.orbTop, { backgroundColor: `${theme.tokens.colors.accent}2E` }]} />
      <View style={[ambientStyles.orb, ambientStyles.orbBottom, { backgroundColor: theme.sourceScheme === 'dark' ? '#42E8E029' : '#8CDFF044' }]} />
    </View> : null}
    {children}
  </SafeAreaView>;
}

export function ScreenBody({ children, style, ...props }: ViewProps) {
  return <View {...props} style={[{ flex: 1 }, style]}>{children}</View>;
}

const ambientStyles = {
  field: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' } as const,
  orb: { position: 'absolute', width: 280, height: 280, borderRadius: 140 } as const,
  orbTop: { top: -130, right: -110 } as const,
  orbBottom: { bottom: -160, left: -120 } as const
};
