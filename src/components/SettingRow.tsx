import { Pressable, StyleSheet, Switch, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeRuntime } from '../design/ThemeProvider.tsx';
import { ThemedText } from './ThemedText.tsx';

export function SettingRow({ icon, title, detail, value, onValueChange, onPress, destructive = false }: { icon?: string; title: string; detail?: string; value?: boolean; onValueChange?: (value: boolean) => void; onPress?: () => void; destructive?: boolean }) {
  const { theme } = useThemeRuntime();
  const content = <View style={[styles.row, { borderBottomColor: theme.tokens.colors.border }]}>
    {icon ? <View style={[styles.icon, { backgroundColor: `${theme.tokens.colors.accent}18` }]}><Ionicons name={icon as never} color={destructive ? theme.tokens.colors.danger : theme.tokens.colors.accent} size={19} /></View> : null}
    <View style={styles.copy}><ThemedText style={destructive ? { color: theme.tokens.colors.danger } : undefined}>{title}</ThemedText>{detail ? <ThemedText variant="meta" muted numberOfLines={2}>{detail}</ThemedText> : null}</View>
    {onValueChange ? <Switch value={Boolean(value)} onValueChange={onValueChange} trackColor={{ true: theme.tokens.colors.accent }} /> : onPress ? <Ionicons name="chevron-forward" size={18} color={theme.tokens.colors.mutedText} /> : null}
  </View>;
  if (!onPress) return content;
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })}>{content}</Pressable>;
}
const styles = StyleSheet.create({ row: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth }, icon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }, copy: { flex: 1, gap: 2 } });
