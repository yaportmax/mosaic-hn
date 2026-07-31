import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import * as Crypto from 'expo-crypto';
import { router } from 'expo-router';
import { useLibraryData } from '../../hooks/useLibraryData.ts';
import { useAppServices } from '../../app/AppServices.tsx';
import { shareTextFile } from '../../app/file-exchange.ts';
import { exportLibraryJson } from '../../core/exports.ts';
import { formatTimeAgo } from '../../core/format.ts';
import { Screen } from '../../components/Screen.tsx';
import { ScreenHeader } from '../../components/Header.tsx';
import { Button, IconButton } from '../../components/Button.tsx';
import { TabStrip } from '../../components/TabStrip.tsx';
import { EmptyState, LoadingState } from '../../components/States.tsx';
import { Surface } from '../../components/Surface.tsx';
import { ThemedText } from '../../components/ThemedText.tsx';
import { useThemeRuntime } from '../../design/ThemeProvider.tsx';
import { StoryRows } from '../shared/StoryRows.tsx';

const categories = ['bookmarks', 'queue', 'history', 'collections'] as const;
type Category = typeof categories[number];
const categoryOptions: ReadonlyArray<{ value: Category; label: string }> = [
  { value: 'bookmarks', label: 'Saved' },
  { value: 'queue', label: 'Read later' },
  { value: 'history', label: 'History' },
  { value: 'collections', label: 'Lists' }
];

export function LibraryScreen() {
  const data = useLibraryData();
  const { database } = useAppServices();
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
    setCollectionName('');
    setCreating(false);
    await data.refresh();
  };

  return <Screen edges={['top']}>
    <ScreenHeader title="Library" subtitle="Saved on this device" actions={<IconButton icon="share-outline" label="Export saved data" onPress={() => void exportAll().catch((error) => Alert.alert('Export failed', error.message))} />} />
    <TabStrip options={categoryOptions} value={category} onChange={setCategory} />
    {data.loading ? <LoadingState label="Opening your library…" /> : <ScrollView contentContainerStyle={styles.content}>
      {category === 'bookmarks' && (data.bookmarks.length ? <StoryRows stories={data.bookmarks} /> : <EmptyState icon="bookmark-outline" title="No saved stories" body="Tap Save on a story to keep it here." actionLabel="Browse stories" onAction={() => router.push('/')} />)}
      {category === 'queue' && (data.queue.length ? <StoryRows stories={data.queue} /> : <EmptyState icon="time-outline" title="Nothing to read later" body="Tap Read later on a story to keep a short reading list here." actionLabel="Browse stories" onAction={() => router.push('/')} />)}
      {category === 'history' && (data.history.length ? <StoryRows stories={data.history} /> : <EmptyState icon="footsteps-outline" title="No reading history" body="Stories appear here after you open their discussions." actionLabel="Open the feed" onAction={() => router.push('/')} />)}
      {category === 'collections' && <View style={styles.stack}>
        <Button label={creating ? 'Cancel' : 'New list'} icon={creating ? 'close' : 'add'} variant="secondary" onPress={() => setCreating((value) => !value)} />
        {creating ? <Surface style={styles.newCollection}><TextInput value={collectionName} onChangeText={setCollectionName} placeholder="List name" placeholderTextColor={theme.tokens.colors.mutedText} style={[styles.collectionInput, { color: theme.tokens.colors.text, borderColor: theme.tokens.colors.border }]} autoFocus onSubmitEditing={() => void createCollection()} /><Button label="Create list" onPress={() => void createCollection()} /></Surface> : null}
        {data.collections.length ? data.collections.map((collection) => <Pressable key={collection.id} accessibilityRole="button" accessibilityLabel={`Open list ${collection.name}`} onPress={() => router.push({ pathname: '/collection/[id]', params: { id: collection.id } })} style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })}><Surface style={styles.collection}><ThemedText variant="headline">{collection.name}</ThemedText><ThemedText variant="meta" muted>{collection.itemIds.length} stories · updated {formatTimeAgo(collection.updatedAt)}</ThemedText></Surface></Pressable>) : !creating ? <EmptyState icon="folder-open-outline" title="No lists" body="Create a list to organize saved stories by topic or project." /> : null}
      </View>}
    </ScrollView>}
  </Screen>;
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, padding: 14, paddingBottom: 110 },
  stack: { gap: 10 },
  collection: { padding: 16, gap: 4 },
  newCollection: { padding: 12, gap: 10 },
  collectionInput: { minHeight: 44, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontSize: 16 }
});
