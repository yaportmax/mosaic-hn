import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSearchData } from '../../hooks/useSearchData.ts';
import { Screen } from '../../components/Screen.tsx';
import { ScreenHeader } from '../../components/Header.tsx';
import { ThemedText } from '../../components/ThemedText.tsx';
import { EmptyState, LoadingState } from '../../components/States.tsx';
import { Surface } from '../../components/Surface.tsx';
import { formatNumber, formatRelativeTime, hnItemUrl } from '../../core/format.ts';
import { useThemeRuntime } from '../../design/ThemeProvider.tsx';
import { openUrl } from '../../app/actions.ts';
import { useModuleEnabled, usePreferences } from '../../app/AppServices.tsx';

export function SearchScreen() {
  const [query, setQuery] = useState('');
  const data = useSearchData(query);
  const { theme } = useThemeRuntime();
  const preferences = usePreferences();
  const discoveryEnabled = useModuleEnabled('discovery');
  return <Screen edges={['top']}>
    <ScreenHeader title="Search" subtitle="Everything the app has archived locally" />
    <View style={[styles.search, { backgroundColor: theme.tokens.colors.surface, borderColor: theme.tokens.colors.border, borderRadius: theme.tokens.shape.radius }]}>
      <Ionicons name="search" size={20} color={theme.tokens.colors.mutedText} />
      <TextInput value={query} onChangeText={setQuery} placeholder="Stories, comments, people, domains…" placeholderTextColor={theme.tokens.colors.mutedText} autoCapitalize="none" autoCorrect={false} returnKeyType="search" style={[styles.input, { color: theme.tokens.colors.text }]} />
      {query ? <Pressable accessibilityRole="button" accessibilityLabel="Clear search" hitSlop={10} onPress={() => setQuery('')}><Ionicons name="close-circle" size={20} color={theme.tokens.colors.mutedText} /></Pressable> : null}
    </View>
    {query.trim() ? data.loading ? <LoadingState label="Searching your archive…" /> : data.results.length === 0 ? <EmptyState icon="search-outline" title="No local matches" body="Open more feeds and discussions to expand the private on-device index." /> : <ScrollView contentContainerStyle={styles.results} keyboardShouldPersistTaps="handled">
      {data.stories.length ? <><ThemedText variant="headline">Stories</ThemedText>{data.stories.map((story) => <Pressable key={story.id} accessibilityRole="button" accessibilityLabel={`Open story ${story.title}`} onPress={() => router.push({ pathname: '/story/[id]', params: { id: String(story.id) } })} style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })}><Surface style={styles.resultCard}><ThemedText variant="headline">{story.title}</ThemedText><View style={styles.meta}><ThemedText variant="caption" muted>{story.domain ?? 'news.ycombinator.com'}</ThemedText><ThemedText variant="caption" muted>{formatNumber(story.score, preferences.compactNumbers)} pts</ThemedText><ThemedText variant="caption" muted>{formatRelativeTime(story.time)}</ThemedText></View></Surface></Pressable>)}</> : null}
      {data.comments.length ? <><ThemedText variant="headline" style={{ marginTop: 10 }}>Comments</ThemedText>{data.comments.map((comment) => <Pressable key={comment.id} accessibilityRole="link" accessibilityLabel={`Open comment by ${comment.by}`} onPress={() => void openUrl(hnItemUrl(comment.id), preferences.openLinks)} style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })}><Surface style={styles.resultCard}><View style={styles.meta}><ThemedText variant="meta" accent>{comment.by}</ThemedText><ThemedText variant="caption" muted>{formatRelativeTime(comment.time)}</ThemedText></View><ThemedText numberOfLines={5}>{comment.text || '[deleted]'}</ThemedText></Surface></Pressable>)}</> : null}
    </ScrollView> : <ScrollView contentContainerStyle={styles.discovery}>
      <View style={styles.sectionHeading}><ThemedText variant="headline">Explore your archive</ThemedText><ThemedText variant="meta" muted>{data.domains.length} indexed domains</ThemedText></View>
      {data.domains.length ? <Surface style={styles.domainList}>{data.domains.slice(0, 8).map((entry, index) => <Pressable key={entry.domain} accessibilityRole="button" accessibilityLabel={`Open ${entry.domain}, ${entry.count} archived ${entry.count === 1 ? 'story' : 'stories'}`} disabled={!discoveryEnabled} onPress={discoveryEnabled ? () => router.push({ pathname: '/discovery/domain/[domain]', params: { domain: entry.domain } }) : undefined} style={({ pressed }) => [styles.domainRow, index > 0 && { borderTopColor: theme.tokens.colors.border, borderTopWidth: StyleSheet.hairlineWidth }, { opacity: !discoveryEnabled ? 0.45 : pressed ? 0.62 : 1 }]}><View style={styles.domainCopy}><ThemedText variant="body" numberOfLines={1} style={{ fontWeight: '700' }}>{entry.domain}</ThemedText><ThemedText variant="caption" muted>{entry.count} archived {entry.count === 1 ? 'story' : 'stories'}</ThemedText></View><Ionicons name="chevron-forward" size={17} color={theme.tokens.colors.mutedText} /></Pressable>)}</Surface> : <EmptyState icon="search-outline" title="Your archive is ready to grow" body="Open a feed while online, then return here to search stories, comments, authors, and domains privately." actionLabel="Browse stories" onAction={() => router.push('/')} />}
      <View style={styles.privacy}><Ionicons name="lock-closed" size={15} color={theme.tokens.colors.mutedText} /><ThemedText variant="meta" muted style={styles.privacyCopy}>Search runs on this device. Queries never leave Mosaic HN.</ThemedText></View>
    </ScrollView>}
  </Screen>;
}
const styles = StyleSheet.create({ search: { marginHorizontal: 14, marginBottom: 10, minHeight: 48, borderWidth: 1, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 9 }, input: { flex: 1, fontSize: 16, paddingVertical: 10 }, results: { gap: 10, padding: 14, paddingBottom: 100 }, resultCard: { padding: 14, gap: 8 }, meta: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, discovery: { flexGrow: 1, gap: 12, padding: 14, paddingBottom: 100 }, sectionHeading: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }, domainList: { paddingHorizontal: 14 }, domainRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 10 }, domainCopy: { flex: 1, gap: 1 }, privacy: { marginTop: 4, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 3 }, privacyCopy: { flex: 1 } });
