import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSearchData } from '../../hooks/useSearchData.ts';
import { Screen } from '../../components/Screen.tsx';
import { ScreenHeader } from '../../components/Header.tsx';
import { ThemedText } from '../../components/ThemedText.tsx';
import { Chip } from '../../components/Chip.tsx';
import { EmptyState, LoadingState } from '../../components/States.tsx';
import { Surface } from '../../components/Surface.tsx';
import { formatNumber, formatRelativeTime, hnItemUrl } from '../../core/format.ts';
import { useThemeRuntime } from '../../design/ThemeProvider.tsx';
import { openUrl } from '../../app/actions.ts';
import { usePreferences } from '../../app/AppServices.tsx';

export function SearchScreen() {
  const [query, setQuery] = useState('');
  const data = useSearchData(query);
  const { theme } = useThemeRuntime();
  const preferences = usePreferences();
  return <Screen edges={['top']}>
    <ScreenHeader title="Search" subtitle="Everything the app has archived locally" />
    <View style={[styles.search, { backgroundColor: theme.tokens.colors.surface, borderColor: theme.tokens.colors.border, borderRadius: theme.tokens.shape.radius }]}>
      <Ionicons name="search" size={20} color={theme.tokens.colors.mutedText} />
      <TextInput value={query} onChangeText={setQuery} placeholder="Stories, comments, people, domains…" placeholderTextColor={theme.tokens.colors.mutedText} autoCapitalize="none" autoCorrect={false} returnKeyType="search" style={[styles.input, { color: theme.tokens.colors.text }]} />
      {query ? <Pressable accessibilityLabel="Clear search" onPress={() => setQuery('')}><Ionicons name="close-circle" size={20} color={theme.tokens.colors.mutedText} /></Pressable> : null}
    </View>
    {query.trim() ? data.loading ? <LoadingState label="Searching your archive…" /> : data.results.length === 0 ? <EmptyState icon="search-outline" title="No local matches" body="Open more feeds and discussions to expand the private on-device index." /> : <ScrollView contentContainerStyle={styles.results} keyboardShouldPersistTaps="handled">
      {data.stories.length ? <><ThemedText variant="headline">Stories</ThemedText>{data.stories.map((story) => <Pressable key={story.id} onPress={() => router.push({ pathname: '/story/[id]', params: { id: String(story.id) } })} style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })}><Surface style={styles.resultCard}><ThemedText variant="headline">{story.title}</ThemedText><View style={styles.meta}><ThemedText variant="caption" muted>{story.domain ?? 'news.ycombinator.com'}</ThemedText><ThemedText variant="caption" muted>{formatNumber(story.score, preferences.compactNumbers)} pts</ThemedText><ThemedText variant="caption" muted>{formatRelativeTime(story.time)}</ThemedText></View></Surface></Pressable>)}</> : null}
      {data.comments.length ? <><ThemedText variant="headline" style={{ marginTop: 10 }}>Comments</ThemedText>{data.comments.map((comment) => <Pressable key={comment.id} onPress={() => void openUrl(hnItemUrl(comment.id), preferences.openLinks)} style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })}><Surface style={styles.resultCard}><View style={styles.meta}><ThemedText variant="meta" accent>{comment.by}</ThemedText><ThemedText variant="caption" muted>{formatRelativeTime(comment.time)}</ThemedText></View><ThemedText numberOfLines={5}>{comment.text || '[deleted]'}</ThemedText></Surface></Pressable>)}</> : null}
    </ScrollView> : <ScrollView contentContainerStyle={styles.discovery}>
      <ThemedText variant="headline">Top domains in your archive</ThemedText>
      <View style={styles.chips}>{data.domains.map((entry) => <Chip key={entry.domain} label={`${entry.domain} · ${entry.count}`} onPress={() => router.push({ pathname: '/discovery/domain/[domain]', params: { domain: entry.domain } })} />)}</View>
      <Surface style={styles.tip}><ThemedText variant="headline">Private by design</ThemedText><ThemedText muted>Search is powered by SQLite FTS on your device. No search query leaves the app.</ThemedText></Surface>
    </ScrollView>}
  </Screen>;
}
const styles = StyleSheet.create({ search: { marginHorizontal: 14, marginBottom: 10, minHeight: 48, borderWidth: 1, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 9 }, input: { flex: 1, fontSize: 16, paddingVertical: 10 }, results: { gap: 10, padding: 14, paddingBottom: 100 }, resultCard: { padding: 14, gap: 8 }, meta: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, discovery: { gap: 14, padding: 14, paddingBottom: 100 }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, tip: { padding: 16, gap: 6, marginTop: 8 } });
