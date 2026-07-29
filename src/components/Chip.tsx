import { Pressable, StyleSheet, type PressableProps } from 'react-native';
import { useThemeRuntime } from '../design/ThemeProvider.tsx';
import { ThemedText } from './ThemedText.tsx';

export function Chip({ label, selected = false, compact = false, ...props }: PressableProps & { label: string; selected?: boolean; compact?: boolean }) {
  const { theme } = useThemeRuntime();
  return <Pressable accessibilityRole="button" accessibilityState={{ selected }} {...props} style={({ pressed }) => [styles.chip, { paddingHorizontal: compact ? 10 : 13, minHeight: compact ? 30 : 36, borderRadius: 999, backgroundColor: selected ? theme.tokens.colors.accent : theme.tokens.colors.surface, borderColor: selected ? theme.tokens.colors.accent : theme.tokens.colors.border, borderWidth: theme.tokens.shape.borderWidth, opacity: pressed ? 0.7 : 1 }]}>
    <ThemedText variant="meta" style={selected ? { color: '#FFFFFF', fontWeight: '700' } : { fontWeight: '600' }}>{label}</ThemedText>
  </Pressable>;
}
const styles = StyleSheet.create({ chip: { alignItems: 'center', justifyContent: 'center' } });
