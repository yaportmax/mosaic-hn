import { StyleSheet, View } from 'react-native';
import type { StorySnapshot } from '../core/models.ts';
import { formatNumber, formatRelativeTime } from '../core/format.ts';
import { useThemeRuntime } from '../design/ThemeProvider.tsx';
import { usePreferences } from '../app/AppServices.tsx';
import { ThemedText } from './ThemedText.tsx';

export function TimelineChart({ snapshots }: { snapshots: readonly StorySnapshot[] }) {
  const { theme } = useThemeRuntime();
  const preferences = usePreferences();
  if (snapshots.length < 2) return <ThemedText variant="meta" muted>Timeline begins after this story is observed more than once.</ThemedText>;
  const maxScore = Math.max(...snapshots.map((snapshot) => snapshot.score), 1);
  const recent = snapshots.slice(-24);
  return <View style={styles.wrapper}><View style={styles.chart}>{recent.map((snapshot) => <View key={`${snapshot.capturedAt}-${snapshot.rank}`} accessible accessibilityLabel={`${snapshot.score} points, ${snapshot.descendants} comments, rank ${snapshot.rank}, ${formatRelativeTime(snapshot.capturedAt)} ago`} style={[styles.bar, { height: 12 + (snapshot.score / maxScore) * 54, backgroundColor: theme.tokens.colors.accent, opacity: 0.35 + (snapshot.score / maxScore) * 0.65 }]} />)}</View><View style={styles.labels}><ThemedText variant="caption" muted>{formatNumber(recent[0]?.score ?? 0, preferences.compactNumbers)} pts</ThemedText><ThemedText variant="caption" muted>{formatNumber(recent.at(-1)?.score ?? 0, preferences.compactNumbers)} pts now</ThemedText></View></View>;
}
const styles = StyleSheet.create({ wrapper: { gap: 6 }, chart: { height: 72, flexDirection: 'row', alignItems: 'flex-end', gap: 3 }, bar: { flex: 1, minWidth: 3, borderRadius: 3 }, labels: { flexDirection: 'row', justifyContent: 'space-between' } });
