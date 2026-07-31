import { useCallback, useMemo, useState } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import type { FeedKind } from '../../core/models.ts';
import { FEED_KINDS } from '../../core/models.ts';
import { FEED_LABELS, formatTimeAgo } from '../../core/format.ts';
import { useFeedData } from '../../hooks/useFeedData.ts';
import { useAppServices, useModuleEnabled, usePreferences } from '../../app/AppServices.tsx';
import { performStoryAction } from '../../app/actions.ts';
import type { GestureAction } from '../../state/preferences.ts';
import { resolveGestureActionForModules } from '../../core/gesture-actions.ts';
import { Screen } from '../../components/Screen.tsx';
import { ScreenHeader, HorizontalControls } from '../../components/Header.tsx';
import { Chip } from '../../components/Chip.tsx';
import { StoryCard } from '../../components/StoryCard.tsx';
import { EmptyState, ErrorState, LoadingState, OfflineBanner } from '../../components/States.tsx';
import { ThemedText } from '../../components/ThemedText.tsx';
import { IconButton } from '../../components/Button.tsx';
import { useThemeRuntime } from '../../design/ThemeProvider.tsx';

export function FeedScreen() {
  const preferences = usePreferences();
  const { database } = useAppServices();
  const algorithmsEnabled = useModuleEnabled('algorithms');
  const automationEnabled = useModuleEnabled('automation');
  const libraryEnabled = useModuleEnabled('library');
  const { theme } = useThemeRuntime();
  const [feed, setFeed] = useState<FeedKind>(preferences.defaultFeed);
  const data = useFeedData(feed);

  const openStory = useCallback((id: number) => router.push({ pathname: '/story/[id]', params: { id: String(id) } }), []);
  const action = useCallback(async (storyId: number, gesture: GestureAction) => {
    const story = data.items.find((item) => item.story.id === storyId)?.story;
    const resolved = resolveGestureActionForModules(gesture, { library: libraryEnabled, automation: automationEnabled });
    if (!story || resolved === 'none') return;
    await performStoryAction(resolved, story, database.repository, preferences, theme.tokens.motion.durationScale === 0);
    await data.reloadFromCache();
  }, [automationEnabled, data, database.repository, libraryEnabled, preferences, theme.tokens.motion.durationScale]);

  const separator = useCallback(() => <View style={{ height: theme.layout.feed === 'cards' || theme.layout.feed === 'magazine' ? 10 : StyleSheet.hairlineWidth, backgroundColor: theme.layout.feed === 'cards' || theme.layout.feed === 'magazine' ? 'transparent' : theme.tokens.colors.border }} />, [theme]);
  const subtitle = useMemo(() => {
    const mode = algorithmsEnabled ? data.preset.name : 'Official HN order';
    if (!data.lastUpdated) return algorithmsEnabled ? `${mode} local ranking` : mode;
    return `${mode} · updated ${formatTimeAgo(data.lastUpdated)}${automationEnabled && data.hiddenCount ? ` · ${data.hiddenCount} hidden` : ''}`;
  }, [algorithmsEnabled, automationEnabled, data.hiddenCount, data.lastUpdated, data.preset.name]);

  return <Screen edges={['top']}>
    <ScreenHeader title="Mosaic HN" subtitle={subtitle} large={false} actions={algorithmsEnabled ? <IconButton icon="options-outline" label="Feed presets" onPress={() => router.push('/presets')} /> : undefined} />
    <HorizontalControls>{FEED_KINDS.map((kind) => <Chip key={kind} label={FEED_LABELS[kind]} compact selected={feed === kind} onPress={() => setFeed(kind)} />)}</HorizontalControls>
    {data.offline ? <OfflineBanner /> : null}
    {data.loading && data.items.length === 0 ? <LoadingState label={`Loading ${FEED_LABELS[feed]} stories…`} /> : data.error && data.items.length === 0 ? <ErrorState message={data.error} onRetry={() => void data.refresh()} /> : data.items.length === 0 ? <EmptyState icon="newspaper-outline" title="Nothing here yet" body={data.offline ? 'Open this feed once while online to archive it locally.' : 'Hacker News returned no stories for this feed.'} actionLabel="Refresh" onAction={() => void data.refresh()} /> : <FlashList
      data={data.items}
      keyExtractor={(item) => String(item.story.id)}
      renderItem={({ item, index }) => <StoryCard item={item} index={index} onOpenStory={openStory} onAction={action} bookmarked={data.bookmarkedIds.has(item.story.id)} queued={data.queuedIds.has(item.story.id)} />}
      ItemSeparatorComponent={separator}
      contentContainerStyle={{ paddingHorizontal: theme.layout.feed === 'cards' || theme.layout.feed === 'magazine' ? 10 : 0, paddingBottom: theme.tokens.effects.glass ? 116 : 90 }}
      refreshControl={<RefreshControl refreshing={data.refreshing} onRefresh={() => void data.refresh()} tintColor={theme.tokens.colors.accent} colors={[theme.tokens.colors.accent]} />}
      maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
      drawDistance={900}
      ListHeaderComponent={data.error ? <View style={[styles.notice, { backgroundColor: `${theme.tokens.colors.danger}16` }]}><ThemedText variant="meta" style={{ color: theme.tokens.colors.danger }}>{data.error}</ThemedText></View> : null}
      ListFooterComponent={<View style={styles.footer}><ThemedText variant="caption" muted>{data.items.length} stories · swipe controls follow your gesture settings</ThemedText></View>}
    />}
  </Screen>;
}

const styles = StyleSheet.create({ notice: { marginHorizontal: 12, marginBottom: 8, padding: 10, borderRadius: 10 }, footer: { alignItems: 'center', padding: 24 } });
