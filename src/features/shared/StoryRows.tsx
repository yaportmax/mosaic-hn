import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import type { Story } from '../../core/models.ts';
import { formatNumber, formatRelativeTime } from '../../core/format.ts';
import { Surface } from '../../components/Surface.tsx';
import { ThemedText } from '../../components/ThemedText.tsx';
import { usePreferences } from '../../app/AppServices.tsx';

export function StoryRows({ stories, empty }: { stories: readonly Story[]; empty?: ReactNode }) {
  const preferences = usePreferences();
  if (!stories.length) return empty ?? null;
  return <View style={styles.stack}>{stories.map((story) => <Pressable key={story.id} accessibilityRole="button" accessibilityLabel={story.title} onPress={() => router.push({ pathname: '/story/[id]', params: { id: String(story.id) } })} style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })}><Surface style={styles.row}><ThemedText variant="headline">{story.title}</ThemedText><View style={styles.meta}><ThemedText variant="caption" muted>{story.domain ?? 'news.ycombinator.com'}</ThemedText><ThemedText variant="caption" muted>{formatNumber(story.score, preferences.compactNumbers)} pts</ThemedText><ThemedText variant="caption" muted>{formatNumber(story.descendants, preferences.compactNumbers)} comments</ThemedText><ThemedText variant="caption" muted>{formatRelativeTime(story.time)}</ThemedText></View></Surface></Pressable>)}</View>;
}

const styles = StyleSheet.create({ stack: { gap: 9 }, row: { padding: 14, gap: 6 }, meta: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 } });
