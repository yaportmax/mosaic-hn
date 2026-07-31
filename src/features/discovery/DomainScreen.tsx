import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import type { Story } from '../../core/models.ts';
import { formatNumber } from '../../core/format.ts';
import { useAppServices, usePreferences } from '../../app/AppServices.tsx';
import { openUrl } from '../../app/actions.ts';
import { Screen } from '../../components/Screen.tsx';
import { DetailHeader } from '../../components/Header.tsx';
import { Button } from '../../components/Button.tsx';
import { Surface } from '../../components/Surface.tsx';
import { ThemedText } from '../../components/ThemedText.tsx';
import { EmptyState, LoadingState } from '../../components/States.tsx';
import { StoryRows } from '../shared/StoryRows.tsx';

const matchesDomain = (storyDomain: string | null, domain: string) => Boolean(storyDomain && (storyDomain === domain || storyDomain.endsWith(`.${domain}`)));

export function DomainScreen({ domain }: { domain: string }) {
  const { database } = useAppServices();
  const preferences = usePreferences();
  const normalized = domain.trim().toLowerCase().replace(/^www\./, '');
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { let active = true; void database.repository.getAllCachedStories().then((items) => { if (active) { setStories(items.filter((story) => matchesDomain(story.domain, normalized)).sort((a, b) => b.time - a.time)); setLoading(false); } }); return () => { active = false; }; }, [database.repository, normalized]);
  const stats = useMemo(() => ({ points: stories.reduce((total, story) => total + story.score, 0), comments: stories.reduce((total, story) => total + story.descendants, 0), authors: new Set(stories.map((story) => story.by)).size }), [stories]);
  return <Screen edges={['top']}>
    <DetailHeader title={normalized || 'Domain'} subtitle="Local domain archive" actions={<Button label="Visit" icon="open-outline" variant="ghost" onPress={() => void openUrl(`https://${normalized}`, preferences.openLinks)} />} />
    {loading ? <LoadingState label="Searching your local archive…" /> : <ScrollView contentContainerStyle={styles.content}>
      <Surface style={styles.stats}><Metric value={formatNumber(stories.length, preferences.compactNumbers)} label="stories" /><Metric value={formatNumber(stats.points, preferences.compactNumbers)} label="points" /><Metric value={formatNumber(stats.comments, preferences.compactNumbers)} label="comments" /><Metric value={formatNumber(stats.authors, preferences.compactNumbers)} label="authors" /></Surface>
      <View style={styles.section}><ThemedText variant="headline">Archived stories</ThemedText><StoryRows stories={stories} empty={<EmptyState icon="globe-outline" title="Nothing archived" body="This page only searches content already fetched from Hacker News on this device." />} /></View>
    </ScrollView>}
  </Screen>;
}
function Metric({ value, label }: { value: string; label: string }) { return <View style={styles.metric}><ThemedText variant="title">{value}</ThemedText><ThemedText variant="caption" muted>{label}</ThemedText></View>; }
const styles = StyleSheet.create({ content: { padding: 14, paddingBottom: 90, gap: 20 }, stats: { padding: 15, flexDirection: 'row', flexWrap: 'wrap', gap: 22 }, metric: { minWidth: 66 }, section: { gap: 10 } });
