import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { FlashList, type FlashListRef } from '@shopify/flash-list';
import { router } from 'expo-router';
import type { CommentJumpKind } from '../../core/comments.ts';
import type { CollectionRecord, CommentRow } from '../../core/models.ts';
import { formatNumber, formatRelativeTime, hnItemUrl } from '../../core/format.ts';
import { useStoryData } from '../../hooks/useStoryData.ts';
import { openStory, openUrl, shareStory, subtleHaptic } from '../../app/actions.ts';
import { useAppServices, useModuleEnabled, usePreferences } from '../../app/AppServices.tsx';
import { Screen } from '../../components/Screen.tsx';
import { DetailHeader, HorizontalControls } from '../../components/Header.tsx';
import { Button, IconButton } from '../../components/Button.tsx';
import { Chip } from '../../components/Chip.tsx';
import { CommentRowView } from '../../components/CommentRow.tsx';
import { ThreadMinimap } from '../../components/ThreadMinimap.tsx';
import { TimelineChart } from '../../components/TimelineChart.tsx';
import { EmptyState, ErrorState, LoadingState } from '../../components/States.tsx';
import { Section } from '../../components/Section.tsx';
import { Surface } from '../../components/Surface.tsx';
import { ThemedText } from '../../components/ThemedText.tsx';
import { useThemeRuntime } from '../../design/ThemeProvider.tsx';

export function StoryScreen({ id }: { id: number }) {
  const commentsEnabled = useModuleEnabled('comments');
  const discoveryEnabled = useModuleEnabled('discovery');
  const libraryEnabled = useModuleEnabled('library');
  const archiveEnabled = useModuleEnabled('archive');
  const data = useStoryData(id);
  const preferences = usePreferences();
  const { database } = useAppServices();
  const { theme } = useThemeRuntime();
  const listRef = useRef<FlashListRef<CommentRow>>(null);
  const jumpCursor = useRef<Record<CommentJumpKind, number>>({ op: -1, new: -1, saved: -1, large: -1 });
  const [note, setNote] = useState('');
  const [tags, setTags] = useState('');
  const [notesOpen, setNotesOpen] = useState(false);
  const [collectionPickerOpen, setCollectionPickerOpen] = useState(false);
  const [collections, setCollections] = useState<CollectionRecord[]>([]);

  useEffect(() => { setNote(data.note); setTags(data.tags.join(', ')); }, [data.note, data.tags]);
  useEffect(() => { if (!libraryEnabled) setNotesOpen(false); }, [libraryEnabled]);

  const story = data.story;
  if (data.loading && !story) return <Screen edges={['top']}><DetailHeader title="Story" /><LoadingState label={commentsEnabled ? 'Loading story and discussion…' : 'Loading story…'} /></Screen>;
  if (data.error && !story) return <Screen edges={['top']}><DetailHeader title="Story" /><ErrorState message={data.error} onRetry={() => void data.refresh()} /></Screen>;
  if (!story) return <Screen edges={['top']}><DetailHeader title="Story" /><EmptyState title="Story unavailable" body="The item may have been deleted or is not reachable." /></Screen>;

  const jump = (kind: CommentJumpKind) => {
    const targets = data.jumpTargets(kind);
    if (!targets.length) { void subtleHaptic(preferences, theme.tokens.motion.durationScale === 0); return; }
    const nextPosition = (jumpCursor.current[kind] + 1) % targets.length;
    jumpCursor.current[kind] = nextPosition;
    listRef.current?.scrollToIndex({ index: targets[nextPosition], animated: true, viewPosition: 0.12 });
  };

  const addToCollection = async () => {
    if (!libraryEnabled) return;
    const available = await database.repository.listCollections();
    if (!available.length) { Alert.alert('No collections', 'Create a collection from the Library module first.'); return; }
    setCollections(available);
    setCollectionPickerOpen(true);
  };
  const selectCollection = async (collection: CollectionRecord) => {
    await database.repository.addToCollection(collection.id, story.id);
    setCollectionPickerOpen(false);
  };

  const authorMetadata = discoveryEnabled
    ? <Pressable onPress={() => router.push({ pathname: '/user/[id]', params: { id: story.by } })}><ThemedText variant="meta" accent>by {story.by}</ThemedText></Pressable>
    : <ThemedText variant="meta" muted>by {story.by}</ThemedText>;
  const domainMetadata = story.domain
    ? discoveryEnabled
      ? <Pressable onPress={() => router.push({ pathname: '/discovery/domain/[domain]', params: { domain: story.domain! } })}><ThemedText variant="meta" muted>{story.domain}</ThemedText></Pressable>
      : <ThemedText variant="meta" muted>{story.domain}</ThemedText>
    : null;

  const storyLayout = theme.layout.story;
  const relevantRelated = data.related.filter((item) => item.similarity >= 0.18).slice(0, 3);
  const summaryContent = <View style={[
    styles.summary,
    storyLayout === 'line' && styles.summaryLine,
    storyLayout === 'editorial' && styles.summaryEditorial,
    storyLayout === 'editorial' && { borderBottomColor: theme.tokens.colors.border }
  ]}>
    <ThemedText variant={storyLayout === 'editorial' ? 'display' : storyLayout === 'line' ? 'headline' : 'title'}>{story.title}</ThemedText>
    <View style={[styles.meta, storyLayout === 'line' && styles.metaCompact]}>
      {authorMetadata}
      <ThemedText variant="meta" muted>{formatRelativeTime(story.time)}</ThemedText>
      <ThemedText variant="meta" muted>{formatNumber(story.score, preferences.compactNumbers)} points</ThemedText>
      <ThemedText variant="meta" muted>{formatNumber(story.descendants, preferences.compactNumbers)} comments</ThemedText>
      {domainMetadata}
    </View>
    <View style={styles.actionStack}>
      <View style={styles.primaryActions}>
        <Button label={story.url ? 'Read article' : 'Open on HN'} icon="open-outline" onPress={() => void openStory(story, preferences)} style={styles.readButton} />
        {libraryEnabled ? <><IconButton icon={data.bookmarked ? 'bookmark' : 'bookmark-outline'} label={data.bookmarked ? 'Remove bookmark' : 'Save story'} onPress={() => void data.toggleBookmark()} /><IconButton icon={data.queued ? 'time' : 'time-outline'} label={data.queued ? 'Remove from queue' : 'Add to queue'} onPress={() => void data.toggleQueue()} /></> : null}
      </View>
      <View style={styles.secondaryActions}>
        {libraryEnabled ? <Button label="Collect" icon="folder-outline" variant="ghost" onPress={() => void addToCollection()} style={styles.secondaryAction} /> : null}
        <Button label="Share" icon="share-outline" variant="ghost" onPress={() => void shareStory(story)} style={styles.secondaryAction} />
        <Button label="HN thread" icon="logo-hackernews" variant="ghost" onPress={() => void openUrl(hnItemUrl(story.id), preferences.openLinks)} style={styles.secondaryAction} />
      </View>
    </View>
  </View>;
  const summary = storyLayout === 'card'
    ? <Surface elevated style={styles.summaryCard}>{summaryContent}</Surface>
    : summaryContent;

  const discussionHeader = commentsEnabled ? <>
    <View style={styles.commentsTitle}>
      <ThemedText variant="title">Discussion</ThemedText>
      {data.commentsLoading ? <ThemedText variant="meta" accent>Loading branches…</ThemedText> : <ThemedText variant="meta" muted>{data.rows.length} cached comments</ThemedText>}
    </View>
    <HorizontalControls>
      <Chip compact label="New" onPress={() => jump('new')} />
      <Chip compact label="OP" onPress={() => jump('op')} />
      {libraryEnabled ? <Chip compact label="Saved" onPress={() => jump('saved')} /> : null}
      <Chip compact label="Large threads" onPress={() => jump('large')} />
    </HorizontalControls>
  </> : <Section title="Discussion module disabled" caption="Comment branches are not loaded while this capability is off.">
    <Button label="Customize modules" icon="grid-outline" variant="secondary" onPress={() => router.push('/modules')} />
  </Section>;

  const header = <View style={styles.storyHeader}>
    {summary}
    {story.text ? storyLayout === 'line' ? <View style={styles.storyTextLine}><ThemedText>{story.text}</ThemedText></View> : <Surface style={styles.storyText}><ThemedText>{story.text}</ThemedText></Surface> : null}
    {archiveEnabled ? <Section title="Local timeline" caption="Snapshots are captured only when this installation sees the story."><Surface style={styles.sectionSurface}><TimelineChart snapshots={data.timeline} /></Surface></Section> : null}
    {libraryEnabled ? <Section title="Library notes" caption="Stored only on this device.">
      <Button label={notesOpen ? 'Hide notes' : data.note || data.tags.length ? 'Edit notes and tags' : 'Add notes and tags'} variant="secondary" onPress={() => setNotesOpen((value) => !value)} />
      {notesOpen ? <Surface style={styles.notes}>
        <TextInput value={note} onChangeText={setNote} placeholder="Your notes…" placeholderTextColor={theme.tokens.colors.mutedText} multiline style={[styles.noteInput, { color: theme.tokens.colors.text, borderColor: theme.tokens.colors.border }]} />
        <TextInput value={tags} onChangeText={setTags} placeholder="tags, separated, by commas" placeholderTextColor={theme.tokens.colors.mutedText} autoCapitalize="none" style={[styles.tagInput, { color: theme.tokens.colors.text, borderColor: theme.tokens.colors.border }]} />
        <Button label="Save locally" onPress={() => void Promise.all([data.saveNote(note), data.saveTags(tags.split(',').map((value) => value.trim()).filter(Boolean))])} />
      </Surface> : null}
    </Section> : null}
    {discoveryEnabled && relevantRelated.length ? <Section title="Related in your archive" caption="Strong local title and text matches."><View style={styles.related}>{relevantRelated.map(({ story: related, similarity }) => <Pressable key={related.id} accessibilityRole="button" accessibilityLabel={`Open related story ${related.title}`} onPress={() => router.push({ pathname: '/story/[id]', params: { id: String(related.id) } })} style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })}><Surface style={styles.relatedCard}><ThemedText variant="headline">{related.title}</ThemedText><ThemedText variant="caption" muted>{related.domain ?? 'HN'} · {Math.round(similarity * 100)}% match</ThemedText></Surface></Pressable>)}</View></Section> : null}
    {discussionHeader}
  </View>;

  return <Screen edges={['top']}>
    <DetailHeader title={story.domain ?? 'Hacker News'} subtitle={`${formatNumber(story.score, preferences.compactNumbers)} points · ${formatNumber(story.descendants, preferences.compactNumbers)} comments`} actions={<IconButton icon="refresh" label="Refresh story" onPress={() => void data.refresh()} />} />
    <View style={styles.listWrap}>
      <FlashList
        ref={listRef}
        data={commentsEnabled ? data.rows : []}
        keyExtractor={(row) => String(row.comment.id)}
        renderItem={({ item }) => <CommentRowView row={item} onToggle={() => data.toggleCollapsed(item.comment.id)} onSave={() => void data.toggleSavedComment(item.comment.id)} />}
        ListHeaderComponent={header}
        ListEmptyComponent={commentsEnabled ? <EmptyState icon="chatbubble-outline" title="No comments" body={data.commentsLoading ? 'The discussion is still loading.' : 'This story has no cached comments yet.'} /> : null}
        ListFooterComponent={commentsEnabled && data.commentsLoading ? <LoadingState label="Loading more comment branches…" /> : <View style={{ height: 100 }} />}
        drawDistance={1_000}
      />
      {commentsEnabled && data.rows.length > 0 ? <ThreadMinimap rows={data.rows} onSelect={(index) => listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.1 })} /> : null}
    </View>
    {collectionPickerOpen ? <View accessibilityViewIsModal style={styles.modal}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close collection picker" style={StyleSheet.absoluteFill} onPress={() => setCollectionPickerOpen(false)} />
        <Surface elevated style={styles.picker}>
          <View style={styles.pickerHeader}><View style={styles.pickerCopy}><ThemedText variant="title">Add to collection</ThemedText><ThemedText variant="meta" muted numberOfLines={2}>{story.title}</ThemedText></View><IconButton icon="close" label="Close" onPress={() => setCollectionPickerOpen(false)} /></View>
          <ScrollView style={styles.pickerList} contentContainerStyle={styles.pickerListContent}>
            {collections.map((collection) => <Pressable key={collection.id} accessibilityRole="button" accessibilityLabel={`Add to ${collection.name}`} onPress={() => void selectCollection(collection)} style={({ pressed }) => [styles.pickerRow, { borderBottomColor: theme.tokens.colors.border, opacity: pressed ? 0.62 : 1 }]}><View style={styles.pickerCopy}><ThemedText variant="headline">{collection.name}</ThemedText><ThemedText variant="caption" muted>{collection.itemIds.length} saved {collection.itemIds.length === 1 ? 'item' : 'items'}</ThemedText></View><ThemedText accent style={{ fontWeight: '800' }}>Add</ThemedText></Pressable>)}
          </ScrollView>
        </Surface>
      </View> : null}
  </Screen>;
}

const styles = StyleSheet.create({
  listWrap: { flex: 1 },
  storyHeader: { gap: 18, paddingHorizontal: 14, paddingTop: 12 },
  summary: { gap: 12 },
  summaryLine: { gap: 7 },
  summaryCard: { padding: 18 },
  summaryEditorial: { gap: 16, paddingVertical: 20, borderBottomWidth: StyleSheet.hairlineWidth },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  metaCompact: { gap: 6 },
  actionStack: { gap: 4 },
  primaryActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  readButton: { flex: 1 },
  secondaryActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  secondaryAction: { flex: 1, paddingHorizontal: 7 },
  storyText: { padding: 16 },
  storyTextLine: { paddingVertical: 10 },
  sectionSurface: { padding: 14 },
  notes: { padding: 12, gap: 10 },
  noteInput: { minHeight: 120, textAlignVertical: 'top', borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 15 },
  tagInput: { minHeight: 44, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontSize: 15 },
  related: { gap: 8 },
  relatedCard: { padding: 13, gap: 4 },
  commentsTitle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, marginTop: 4 },
  modal: { ...StyleSheet.absoluteFillObject, zIndex: 50, elevation: 50, justifyContent: 'flex-end', padding: 12, paddingBottom: 28, backgroundColor: 'rgba(0,0,0,0.58)' },
  picker: { maxHeight: '68%', padding: 14, gap: 12 },
  pickerHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pickerCopy: { flex: 1, minWidth: 0, gap: 2 },
  pickerList: { flexGrow: 0 },
  pickerListContent: { paddingBottom: 4 },
  pickerRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth }
});
