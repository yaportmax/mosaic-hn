import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { FEED_KINDS, type FeedArchiveRecord, type FeedKind, type Story } from '../../core/models.ts';
import { FEED_LABELS, formatNumber, formatRelativeTime } from '../../core/format.ts';
import { useAppServices, usePreferences } from '../../app/AppServices.tsx';
import { Screen } from '../../components/Screen.tsx';
import { DetailHeader, HorizontalControls } from '../../components/Header.tsx';
import { Chip } from '../../components/Chip.tsx';
import { EmptyState, LoadingState } from '../../components/States.tsx';
import { Surface } from '../../components/Surface.tsx';
import { ThemedText } from '../../components/ThemedText.tsx';
import { StoryRows } from '../shared/StoryRows.tsx';

const filters = ['all', ...FEED_KINDS] as const;
type ArchiveFilter = (typeof filters)[number];

function archiveDateLabel(date: string): string {
  const parsed = new Date(`${date}T12:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC'
  }).format(parsed);
}

function archiveKey(record: FeedArchiveRecord): string {
  return `${record.feed}:${record.date}`;
}

export function ArchiveScreen() {
  const { database } = useAppServices();
  const preferences = usePreferences();
  const [filter, setFilter] = useState<ArchiveFilter>('all');
  const [records, setRecords] = useState<FeedArchiveRecord[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingStories, setLoadingStories] = useState(false);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      const next = await database.repository.listFeedArchive(filter === 'all' ? undefined : filter);
      setRecords(next);
      setSelectedKey((current) => current && next.some((record) => archiveKey(record) === current) ? current : next[0] ? archiveKey(next[0]) : null);
    } finally {
      setLoading(false);
    }
  }, [database.repository, filter]);

  useEffect(() => { void loadRecords(); }, [loadRecords]);

  const selected = useMemo(() => records.find((record) => archiveKey(record) === selectedKey), [records, selectedKey]);
  useEffect(() => {
    let active = true;
    if (!selected) { setStories([]); setLoadingStories(false); return () => { active = false; }; }
    setLoadingStories(true);
    void database.repository.getArchivedFeed(selected.feed, selected.date)
      .then((result) => { if (active) setStories(result.stories); })
      .finally(() => { if (active) setLoadingStories(false); });
    return () => { active = false; };
  }, [database.repository, selected]);

  return <Screen edges={['top']}>
    <DetailHeader title="Local archive" subtitle={`${records.length} captured feed ${records.length === 1 ? 'view' : 'views'}`} />
    <HorizontalControls>{filters.map((value) => <Chip key={value} label={value === 'all' ? 'All' : FEED_LABELS[value]} selected={filter === value} onPress={() => setFilter(value)} />)}</HorizontalControls>
    {loading ? <LoadingState label="Opening your local feed archive…" /> : records.length === 0 ? <EmptyState icon="calendar-outline" title="No archived feed dates" body="Refresh a Hacker News feed while online. Mosaic HN saves one local snapshot per feed per UTC day, for up to 365 days." /> : <ScrollView contentContainerStyle={styles.content}>
      <Surface style={styles.notice}><ThemedText variant="meta" accent>LOCAL TIME TRAVEL</ThemedText><ThemedText muted>These snapshots contain only feeds this installation actually observed. Refreshing the same feed again on the same UTC date updates that date instead of creating duplicates.</ThemedText></Surface>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dates} accessibilityRole="tablist">
        {records.map((record) => {
          const key = archiveKey(record);
          const selectedRecord = key === selectedKey;
          return <Pressable key={key} accessibilityRole="tab" accessibilityState={{ selected: selectedRecord }} onPress={() => setSelectedKey(key)} style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })}>
            <Surface style={[styles.dateCard, selectedRecord && styles.selectedDate]}>
              <ThemedText variant="meta" accent={selectedRecord}>{FEED_LABELS[record.feed]}</ThemedText>
              <ThemedText variant="headline">{archiveDateLabel(record.date)}</ThemedText>
              <ThemedText variant="caption" muted>{formatNumber(record.storyIds.length, preferences.compactNumbers)} stories · captured {formatRelativeTime(record.capturedAt)} ago</ThemedText>
            </Surface>
          </Pressable>;
        })}
      </ScrollView>
      {selected ? <View style={styles.section}>
        <View style={styles.sectionHeader}><View style={styles.sectionCopy}><ThemedText variant="title">{FEED_LABELS[selected.feed]} · {archiveDateLabel(selected.date)}</ThemedText><ThemedText variant="meta" muted>{selected.storyIds.length} story IDs saved at capture time</ThemedText></View></View>
        {loadingStories ? <LoadingState label="Loading archived stories…" /> : <StoryRows stories={stories} empty={<EmptyState icon="file-tray-outline" title="Stories no longer in local storage" body="The archive record remains, but these items are not currently available in the on-device item cache." />} />}
      </View> : null}
    </ScrollView>}
  </Screen>;
}

const styles = StyleSheet.create({
  content: { padding: 14, paddingBottom: 80, gap: 16 },
  notice: { padding: 14, gap: 5 },
  dates: { gap: 9, paddingRight: 4 },
  dateCard: { width: 210, minHeight: 106, padding: 13, gap: 5 },
  selectedDate: { transform: [{ scale: 0.99 }] },
  section: { gap: 10 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionCopy: { flex: 1, gap: 2 }
});
