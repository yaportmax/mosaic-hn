import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import * as Crypto from 'expo-crypto';
import { router } from 'expo-router';
import { useLibraryData } from '../../hooks/useLibraryData.ts';
import { useAppServices, usePreferences } from '../../app/AppServices.tsx';
import { shareTextFile } from '../../app/file-exchange.ts';
import { exportLibraryJson } from '../../core/exports.ts';
import { formatRelativeTime, hnItemUrl } from '../../core/format.ts';
import { openUrl } from '../../app/actions.ts';
import { Screen } from '../../components/Screen.tsx';
import { ScreenHeader } from '../../components/Header.tsx';
import { Chip } from '../../components/Chip.tsx';
import { Button, IconButton } from '../../components/Button.tsx';
import { EmptyState, LoadingState } from '../../components/States.tsx';
import { Surface } from '../../components/Surface.tsx';
import { ThemedText } from '../../components/ThemedText.tsx';
import { useThemeRuntime } from '../../design/ThemeProvider.tsx';
import { StoryRows } from '../shared/StoryRows.tsx';

const categories = ['bookmarks', 'queue', 'history', 'collections', 'comments'] as const;
type Category = typeof categories[number];

export function LibraryScreen() {
  const data = useLibraryData();
  const { database } = useAppServices();
  const preferences = usePreferences();
  const { theme } = useThemeRuntime();
  const [category, setCategory] = useState<Category>('bookmarks');
  const [creating, setCreating] = useState(false);
  const [collectionName, setCollectionName] = useState('');

  const exportAll = async () => {
    const payload = await database.repository.getLibraryExport();
    await shareTextFile(`mosaic-hn-library-${new Date().toISOString().slice(0, 10)}.json`, exportLibraryJson(payload), 'application/json');
  };
  const createCollection = async () => {
    const name = collectionName.trim();
    if (!name) return;
    const now = Math.floor(Date.now() / 1000);
    await database.repository.saveCollection({ id: Crypto.randomUUID(), name, createdAt: now, updatedAt: now, itemIds: [] });
    setCollectionName(''); setCreating(false); await data.refresh();
  };

  const emptyCopy: Record<Category, [string, string]> = {
    bookmarks: ['No bookmarks', 'Save stories with the bookmark control or your configured gesture.'],
    queue: ['Your reading queue is empty', 'Queue stories for later without sending data to a cloud service.'],
    history: ['No reading history', 'Stories appear here after you open their discussions.'],
    collections: ['No collections', 'Create local folders for research, projects, or reading lists.'],
    comments: ['No saved comments', 'Bookmark individual comments from any discussion.']
  };

  return <Screen edges={['top']}>
    <ScreenHeader title="Library" subtitle="Bookmarks, collections, notes, and offline history" actions={<><IconButton icon="calendar-outline" label="Open local archive" onPress={() => router.push('/archive')} /><IconButton icon="share-outline" label="Export library" onPress={() => void exportAll().catch((error) => Alert.alert('Export failed', error.message))} /></>} />
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categories}>{categories.map((item) => <Chip key={item} label={item[0]!.toUpperCase() + item.slice(1)} selected={category === item} onPress={() => setCategory(item)} />)}</ScrollView>
    {data.loading ? <LoadingState label="Opening your library…" /> : <ScrollView contentContainerStyle={styles.content}>
      {category === 'bookmarks' && (data.bookmarks.length ? <StoryRows stories={data.bookmarks} /> : <EmptyState title={emptyCopy.bookmarks[0]} body={emptyCopy.bookmarks[1]} />)}
      {category === 'queue' && (data.queue.length ? <StoryRows stories={data.queue} /> : <EmptyState icon="time-outline" title={emptyCopy.queue[0]} body={emptyCopy.queue[1]} />)}
      {category === 'history' && (data.history.length ? <StoryRows stories={data.history} /> : <EmptyState icon="footsteps-outline" title={emptyCopy.history[0]} body={emptyCopy.history[1]} />)}
      {category === 'collections' && <View style={styles.stack}>
        <Button label={creating ? 'Cancel' : 'New collection'} icon={creating ? 'close' : 'add'} variant="secondary" onPress={() => setCreating((value) => !value)} />
        {creating ? <Surface style={styles.newCollection}><TextInput value={collectionName} onChangeText={setCollectionName} placeholder="Collection name" placeholderTextColor={theme.tokens.colors.mutedText} style={[styles.collectionInput, { color: theme.tokens.colors.text, borderColor: theme.tokens.colors.border }]} autoFocus onSubmitEditing={() => void createCollection()} /><Button label="Create" onPress={() => void createCollection()} /></Surface> : null}
        {data.collections.length ? data.collections.map((collection) => <Pressable key={collection.id} onPress={() => router.push({ pathname: '/collection/[id]', params: { id: collection.id } })} style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })}><Surface style={styles.collection}><ThemedText variant="headline">{collection.name}</ThemedText><ThemedText variant="meta" muted>{collection.itemIds.length} items · updated {formatRelativeTime(collection.updatedAt)}</ThemedText></Surface></Pressable>) : !creating ? <EmptyState icon="folder-open-outline" title={emptyCopy.collections[0]} body={emptyCopy.collections[1]} /> : null}
      </View>}
      {category === 'comments' && (data.savedComments.length ? <View style={styles.stack}>{data.savedComments.map((comment) => <Pressable key={comment.id} onPress={() => void openUrl(hnItemUrl(comment.id), preferences.openLinks)} style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })}><Surface style={styles.comment}><ThemedText variant="meta" accent>{comment.by}</ThemedText><ThemedText numberOfLines={7}>{comment.text || '[deleted]'}</ThemedText></Surface></Pressable>)}</View> : <EmptyState icon="chatbox-ellipses-outline" title={emptyCopy.comments[0]} body={emptyCopy.comments[1]} />)}
    </ScrollView>}
  </Screen>;
}
const styles = StyleSheet.create({ categories: { paddingHorizontal: 14, paddingBottom: 10, gap: 8 }, content: { padding: 14, paddingBottom: 110 }, stack: { gap: 10 }, collection: { padding: 16, gap: 4 }, comment: { padding: 14, gap: 6 }, newCollection: { padding: 12, gap: 10 }, collectionInput: { minHeight: 44, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontSize: 16 } });
