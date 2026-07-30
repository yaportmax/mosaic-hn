import { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import type { CollectionRecord, Story } from '../../core/models.ts';
import { exportCollectionMarkdown } from '../../core/exports.ts';
import { formatNumber } from '../../core/format.ts';
import { useAppServices, usePreferences } from '../../app/AppServices.tsx';
import { shareTextFile } from '../../app/file-exchange.ts';
import { confirmAction } from '../../app/dialogs.ts';
import { Screen } from '../../components/Screen.tsx';
import { DetailHeader } from '../../components/Header.tsx';
import { Button } from '../../components/Button.tsx';
import { Surface } from '../../components/Surface.tsx';
import { ThemedText } from '../../components/ThemedText.tsx';
import { EmptyState, LoadingState } from '../../components/States.tsx';

export function CollectionScreen({ id }: { id: string }) {
  const { database } = useAppServices();
  const preferences = usePreferences();
  const [collection, setCollection] = useState<CollectionRecord | null>(null);
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    const next = await database.repository.getCollection(id);
    setCollection(next ?? null);
    const items = next ? await database.repository.getItems(next.itemIds) : [];
    setStories(items.filter((item): item is Story => item.kind === 'story'));
    setLoading(false);
  }, [database.repository, id]);
  useEffect(() => { void reload(); }, [reload]);
  const remove = async (storyId: number) => { await database.repository.removeFromCollection(id, storyId); await reload(); };
  const exportMarkdown = async () => {
    if (!collection) return;
    const items = await Promise.all(stories.map(async (story) => ({ id: story.id, title: story.title, note: (await database.repository.getNote(story.id))?.body })));
    await shareTextFile(`${collection.name}.md`, exportCollectionMarkdown({ name: collection.name, items }), 'text/markdown');
  };
  const deleteCollection = () => collection && confirmAction({ title: 'Delete collection?', message: 'The stories themselves and any bookmarks or notes remain in your library.', confirmLabel: 'Delete', destructive: true, onConfirm: () => database.repository.deleteCollection(id).then(() => router.back()) });
  if (loading) return <Screen edges={['top']}><DetailHeader title="Collection" /><LoadingState label="Opening collection…" /></Screen>;
  if (!collection) return <Screen edges={['top']}><DetailHeader title="Collection" /><EmptyState title="Collection unavailable" body="It may have been removed from this device." /></Screen>;
  return <Screen edges={['top']}>
    <DetailHeader title={collection.name} subtitle={`${collection.itemIds.length} saved item${collection.itemIds.length === 1 ? '' : 's'}`} />
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.actions}><Button label="Export Markdown" icon="share-outline" variant="secondary" onPress={() => void exportMarkdown()} /><Button label="Delete collection" icon="trash-outline" variant="danger" onPress={deleteCollection} /></View>
      {stories.length ? <View style={styles.stack}>{stories.map((story) => <Surface key={story.id} style={styles.story}><View style={styles.copy}><ThemedText variant="headline" onPress={() => router.push({ pathname: '/story/[id]', params: { id: String(story.id) } })}>{story.title}</ThemedText><ThemedText variant="meta" muted>{story.domain ?? 'news.ycombinator.com'} · {formatNumber(story.score, preferences.compactNumbers)} points</ThemedText></View><Button label="Remove" variant="ghost" onPress={() => void remove(story.id)} /></Surface>)}</View> : <EmptyState icon="folder-open-outline" title="Empty collection" body="Add stories from their discussion screen." />}
      {collection.itemIds.length > stories.length ? <ThemedText variant="caption" muted>{collection.itemIds.length - stories.length} item{collection.itemIds.length - stories.length === 1 ? '' : 's'} are not currently cached as stories.</ThemedText> : null}
    </ScrollView>
  </Screen>;
}
const styles = StyleSheet.create({ content: { padding: 14, paddingBottom: 90, gap: 18 }, actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, stack: { gap: 9 }, story: { minHeight: 74, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 10 }, copy: { flex: 1, gap: 4 } });
