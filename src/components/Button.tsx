import { ActivityIndicator, Pressable, StyleSheet, type PressableProps, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeRuntime } from '../design/ThemeProvider.tsx';
import { ThemedText } from './ThemedText.tsx';

export function Button({ label, icon, variant = 'primary', loading = false, style, disabled, ...props }: PressableProps & { label: string; icon?: string; variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; loading?: boolean }) {
  const { theme } = useThemeRuntime();
  const colors = theme.tokens.colors;
  const background = variant === 'primary' ? colors.accent : variant === 'danger' ? colors.danger : variant === 'secondary' ? colors.surface : 'transparent';
  const foreground = variant === 'primary' || variant === 'danger' ? '#FFFFFF' : colors.text;
  return <Pressable accessibilityRole="button" disabled={disabled || loading} {...props} style={({ pressed }) => [styles.button, { backgroundColor: background, borderColor: colors.border, borderRadius: Math.max(10, theme.tokens.shape.radius * 0.72), opacity: disabled ? 0.45 : pressed ? 0.72 : 1 }, variant === 'secondary' && { borderWidth: theme.tokens.shape.borderWidth }, style]}>
    {loading ? <ActivityIndicator color={foreground} /> : <View style={styles.content}>{icon ? <Ionicons name={icon as never} color={foreground} size={17} /> : null}<ThemedText variant="meta" style={{ color: foreground, fontWeight: '700' }}>{label}</ThemedText></View>}
  </Pressable>;
}

export function IconButton({ icon, label, size = 42, ...props }: Omit<PressableProps, 'children'> & { icon: string; label: string; size?: number }) {
  const { theme } = useThemeRuntime();
  return <Pressable accessibilityRole="button" accessibilityLabel={label} {...props} style={({ pressed }) => [{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.tokens.colors.surface, borderWidth: theme.tokens.shape.borderWidth, borderColor: theme.tokens.colors.border, opacity: pressed ? 0.68 : 1 }]}>
    <Ionicons name={icon as never} size={Math.round(size * 0.5)} color={theme.tokens.colors.text} />
  </Pressable>;
}

const styles = StyleSheet.create({ button: { minHeight: 42, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' }, content: { flexDirection: 'row', alignItems: 'center', gap: 8 } });
