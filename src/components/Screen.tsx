import { View, type ViewProps } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { useThemeRuntime } from '../design/ThemeProvider.tsx';

export function Screen({ children, style, edges = ['top'], ...props }: ViewProps & { edges?: Edge[] }) {
  const { theme } = useThemeRuntime();
  return <SafeAreaView edges={edges} style={[{ flex: 1, backgroundColor: theme.tokens.colors.background }, style]} {...props}>{children}</SafeAreaView>;
}

export function ScreenBody({ children, style, ...props }: ViewProps) {
  return <View {...props} style={[{ flex: 1 }, style]}>{children}</View>;
}
