import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ThemePackage } from '../../theme-sdk/types.ts';
import { useThemeRuntime } from '../design/ThemeProvider.tsx';
import { Surface } from './Surface.tsx';
import { ThemedText } from './ThemedText.tsx';

export function ThemePreview({ themePackage, active = false, onPress, compact = false, scheme }: { themePackage: ThemePackage; active?: boolean; onPress?: () => void; compact?: boolean; scheme?: 'light' | 'dark' }) {
  const runtime = useThemeRuntime();
  const tokens = (scheme ?? runtime.theme.sourceScheme) === 'dark' ? (themePackage.tokens.dark ?? themePackage.tokens.light) : themePackage.tokens.light;
  const preview = <Surface style={[styles.shell, { padding: compact ? 10 : 14, backgroundColor: tokens.colors.background, borderColor: active ? tokens.colors.accent : tokens.colors.border, borderWidth: active ? 2 : 1, borderRadius: Math.max(12, tokens.shape.radius) }]}>
    <View style={styles.previewTop}><View><Text style={[styles.previewName, { color: tokens.colors.text }]}>{themePackage.manifest.name}</Text><Text style={[styles.previewMeta, { color: tokens.colors.mutedText }]}>{themePackage.layout.feed} · {themePackage.layout.comments}</Text></View>{active ? <Ionicons name="checkmark-circle" size={22} color={tokens.colors.accent} /> : null}</View>
    <View style={[styles.nav, { backgroundColor: tokens.colors.surface, borderColor: tokens.colors.border, borderRadius: Math.max(7, tokens.shape.radius * 0.6) }]}><View style={[styles.dot, { backgroundColor: tokens.colors.accent }]} /><View style={[styles.navLine, { backgroundColor: tokens.colors.text }]} /><View style={[styles.navLineSmall, { backgroundColor: tokens.colors.mutedText }]} /></View>
    {[0, 1, 2].map((row) => <View key={row} style={[styles.story, { backgroundColor: tokens.colors.surface, borderColor: tokens.colors.border, borderRadius: Math.max(7, tokens.shape.radius * 0.65), opacity: 1 - row * 0.08 }]}><View style={[styles.rank, { backgroundColor: `${tokens.colors.accent}24` }]} /><View style={styles.storyCopy}><View style={[styles.line, { backgroundColor: tokens.colors.text, width: row === 1 ? '72%' : '88%' }]} /><View style={[styles.metaLine, { backgroundColor: tokens.colors.mutedText, width: row === 2 ? '45%' : '58%' }]} /></View></View>)}
    {!compact ? <View style={styles.swatches}>{[tokens.colors.accent, tokens.colors.success, tokens.colors.warning, tokens.colors.danger].map((color, index) => <View key={`${color}-${index}`} style={[styles.swatch, { backgroundColor: color }]} />)}</View> : null}
  </Surface>;
  if (!onPress) return preview;
  return <Pressable accessibilityRole="button" accessibilityLabel={`${themePackage.manifest.name} theme`} onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>{preview}</Pressable>;
}
const styles = StyleSheet.create({ shell: { gap: 8 }, previewTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, previewName: { fontSize: 17, fontWeight: '800' }, previewMeta: { fontSize: 11, marginTop: 1 }, nav: { height: 27, borderWidth: 1, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 5 }, dot: { width: 7, height: 7, borderRadius: 4 }, navLine: { width: 34, height: 4, borderRadius: 4, opacity: 0.78 }, navLineSmall: { width: 22, height: 4, borderRadius: 4, opacity: 0.55 }, story: { minHeight: 40, borderWidth: 1, padding: 7, flexDirection: 'row', gap: 7 }, rank: { width: 22, borderRadius: 5 }, storyCopy: { flex: 1, gap: 7, justifyContent: 'center' }, line: { height: 5, borderRadius: 4, opacity: 0.78 }, metaLine: { height: 4, borderRadius: 4, opacity: 0.45 }, swatches: { flexDirection: 'row', gap: 5, justifyContent: 'flex-end' }, swatch: { width: 14, height: 14, borderRadius: 7 } });
