import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { CommentRow as CommentRowModel } from '../core/models.ts';
import { formatRelativeTime } from '../core/format.ts';
import { useThemeRuntime } from '../design/ThemeProvider.tsx';
import { useModuleEnabled } from '../app/AppServices.tsx';
import { Surface } from './Surface.tsx';
import { ThemedText } from './ThemedText.tsx';

function CommentRowComponent({ row, onToggle, onSave }: { row: CommentRowModel; onToggle(): void; onSave(): void }) {
  const { theme } = useThemeRuntime();
  const discoveryEnabled = useModuleEnabled('discovery');
  const libraryEnabled = useModuleEnabled('library');
  const layout = theme.layout.comments;
  const indent = Math.min(row.depth, 10) * (layout === 'ledger' ? 10 : 14);
  const content = <View style={[styles.content, { paddingLeft: 12 + indent, paddingRight: 12, paddingVertical: layout === 'ledger' ? 9 : 12 }]}>
    {row.depth > 0 && layout !== 'conversation' ? <View style={[styles.threadLine, { left: Math.max(5, 6 + indent - 8), backgroundColor: row.isNew ? theme.tokens.colors.accent : theme.tokens.colors.border }]} /> : null}
    <View style={styles.header}>
      {discoveryEnabled ? <Pressable accessibilityRole="link" onPress={() => router.push({ pathname: '/user/[id]', params: { id: row.comment.by } })}><ThemedText variant="meta" accent={row.isOp} style={{ fontWeight: row.isOp ? '800' : '600' }}>{row.comment.by || '[deleted]'}</ThemedText></Pressable> : <ThemedText variant="meta" accent={row.isOp} style={{ fontWeight: row.isOp ? '800' : '600' }}>{row.comment.by || '[deleted]'}</ThemedText>}
      {row.isOp ? <ThemedText variant="caption" accent>OP</ThemedText> : null}
      {row.isNew ? <ThemedText variant="caption" style={{ color: theme.tokens.colors.success, fontWeight: '800' }}>NEW</ThemedText> : null}
      <ThemedText variant="caption" muted>{formatRelativeTime(row.comment.time)}</ThemedText>
      <View style={styles.spacer} />
      {libraryEnabled ? <Pressable accessibilityRole="button" accessibilityLabel={row.isSaved ? 'Unsave comment' : 'Save comment'} hitSlop={10} onPress={onSave}><Ionicons name={row.isSaved ? 'bookmark' : 'bookmark-outline'} size={17} color={row.isSaved ? theme.tokens.colors.accent : theme.tokens.colors.mutedText} /></Pressable> : null}
    </View>
    <Pressable accessibilityRole="button" accessibilityLabel={`Comment by ${row.comment.by}`} accessibilityHint={row.hasChildren ? 'Collapses or expands this thread' : undefined} onPress={row.hasChildren ? onToggle : undefined} style={({ pressed }) => ({ opacity: pressed ? 0.68 : 1 })}>
      <ThemedText style={[styles.body, (row.comment.deleted || row.comment.dead) && { fontStyle: 'italic', color: theme.tokens.colors.mutedText }]}>{row.comment.text || (row.comment.deleted ? '[deleted]' : '[unavailable]')}</ThemedText>
      {row.hasChildren ? <View style={styles.footer}><Ionicons name={row.isCollapsed ? 'chevron-forward-circle' : 'chevron-down-circle'} size={16} color={theme.tokens.colors.mutedText} /><ThemedText variant="caption" muted>{row.isCollapsed ? `${Math.max(0, row.subtreeSize - 1)} hidden` : `${Math.max(0, row.subtreeSize - 1)} replies`}</ThemedText>{row.missingChildCount > 0 ? <ThemedText variant="caption" muted>· {row.missingChildCount} loading</ThemedText> : null}</View> : null}
    </Pressable>
  </View>;
  if (layout === 'conversation') return <View style={{ paddingHorizontal: 10, paddingVertical: 4, paddingLeft: 10 + Math.min(row.depth, 4) * 10 }}><Surface style={{ backgroundColor: row.isOp ? `${theme.tokens.colors.accent}12` : theme.tokens.colors.surface }}>{content}</Surface></View>;
  return <View style={{ borderBottomWidth: layout === 'ledger' ? StyleSheet.hairlineWidth : 0, borderBottomColor: theme.tokens.colors.border }}>{content}</View>;
}

export const CommentRowView = memo(CommentRowComponent, (a, b) => a.row.comment.id === b.row.comment.id && a.row.isCollapsed === b.row.isCollapsed && a.row.isSaved === b.row.isSaved && a.row.isNew === b.row.isNew && a.row.subtreeSize === b.row.subtreeSize);
const styles = StyleSheet.create({ content: { position: 'relative' }, threadLine: { position: 'absolute', top: 0, bottom: 0, width: 2, borderRadius: 2 }, header: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 6 }, spacer: { flex: 1 }, body: { flexShrink: 1 }, footer: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 } });
