import { Platform, Pressable, StyleSheet, View } from 'react-native';
import type { CommentRow } from '../core/models.ts';
import { useThemeRuntime } from '../design/ThemeProvider.tsx';

export function ThreadMinimap({ rows, onSelect }: { rows: readonly CommentRow[]; onSelect(index: number): void }) {
  const { theme } = useThemeRuntime();
  if (Platform.OS === 'web' || rows.length < 8) return null;
  const sampleRate = Math.max(1, Math.ceil(rows.length / 120));
  const sampled = rows.filter((_row, index) => index % sampleRate === 0);
  return <View pointerEvents="box-none" style={styles.container}>{sampled.map((row, sampleIndex) => <Pressable key={`${row.comment.id}-${sampleIndex}`} onPress={() => onSelect(sampleIndex * sampleRate)} hitSlop={3} style={[styles.bar, { marginLeft: Math.min(row.depth, 8) * 1.5, backgroundColor: row.isNew ? theme.tokens.colors.accent : row.isOp ? theme.tokens.colors.success : theme.tokens.colors.border }]} />)}</View>;
}
const styles = StyleSheet.create({ container: { position: 'absolute', right: 1, top: 74, bottom: 14, width: 14, justifyContent: 'center', gap: 1, opacity: 0.42 }, bar: { height: 2, minWidth: 3, borderRadius: 2 } });
