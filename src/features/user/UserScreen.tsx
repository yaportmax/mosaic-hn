import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import type { HnUser, Story } from '../../core/models.ts';
import { formatNumber, formatRelativeTime, hnUserUrl } from '../../core/format.ts';
import { useAppServices, usePreferences } from '../../app/AppServices.tsx';
import { openUrl } from '../../app/actions.ts';
import { Screen } from '../../components/Screen.tsx';
import { DetailHeader } from '../../components/Header.tsx';
import { Button } from '../../components/Button.tsx';
import { Surface } from '../../components/Surface.tsx';
import { ThemedText } from '../../components/ThemedText.tsx';
import { EmptyState, ErrorState, LoadingState } from '../../components/States.tsx';
import { StoryRows } from '../shared/StoryRows.tsx';

async function fetchSubmittedStories(ids: readonly number[], getStory: (id: number) => Promise<Story | undefined>): Promise<Story[]> {
  const output: Story[] = [];
  for (let offset = 0; offset < Math.min(ids.length, 48); offset += 8) {
    const batch = await Promise.all(ids.slice(offset, offset + 8).map(getStory));
    output.push(...batch.filter((story): story is Story => Boolean(story)));
  }
  return output;
}

export function UserScreen({ id }: { id: string }) {
  const { database } = useAppServices();
  const preferences = usePreferences();
  const [user, setUser] = useState<HnUser | null>(null);
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    void (async () => {
      try {
        const [profile, cached] = await Promise.all([database.repository.getUser(id, { refresh: true, signal: controller.signal }), database.repository.getAllCachedStories()]);
        if (!profile) throw new Error('This Hacker News profile is unavailable.');
        const local = cached.filter((story) => story.by.toLowerCase() === id.toLowerCase());
        if (active) { setUser(profile); setStories(local); setLoading(false); }
        const remote = await fetchSubmittedStories(profile.submitted, (itemId) => database.repository.getStory(itemId, { refresh: false, signal: controller.signal }));
        if (active) setStories([...new Map([...remote, ...local].map((story) => [story.id, story])).values()].sort((a, b) => b.time - a.time));
      } catch (reason) {
        if (active && !controller.signal.aborted) { setError(reason instanceof Error ? reason.message : 'The profile could not be loaded'); setLoading(false); }
      }
    })();
    return () => { active = false; controller.abort(); };
  }, [database.repository, id]);

  const age = useMemo(() => user ? formatRelativeTime(user.created) : '', [user]);
  if (loading) return <Screen edges={['top']}><DetailHeader title={id} /><LoadingState label="Loading Hacker News profile…" /></Screen>;
  if (error && !user) return <Screen edges={['top']}><DetailHeader title={id} /><ErrorState message={error} /></Screen>;
  if (!user) return <Screen edges={['top']}><DetailHeader title={id} /><EmptyState title="Profile unavailable" body="This user may not exist or has not been cached." /></Screen>;

  return <Screen edges={['top']}>
    <DetailHeader title={user.id} subtitle={`${formatNumber(user.karma, preferences.compactNumbers)} karma · joined ${age} ago`} actions={<Button label="Open on HN" icon="open-outline" variant="ghost" onPress={() => void openUrl(hnUserUrl(user.id), preferences.openLinks)} />} />
    <ScrollView contentContainerStyle={styles.content}>
      <Surface style={styles.profile}><View style={styles.stats}><Stat label="Karma" value={formatNumber(user.karma, preferences.compactNumbers)} /><Stat label="Submissions" value={formatNumber(user.submitted.length, preferences.compactNumbers)} /><Stat label="Account age" value={age} /></View>{user.about ? <ThemedText>{user.about}</ThemedText> : <ThemedText muted>No profile text.</ThemedText>}</Surface>
      <View style={styles.section}><ThemedText variant="headline">Recent submitted stories</ThemedText><ThemedText variant="meta" muted>Up to 48 recent submissions plus any older stories already archived on this device.</ThemedText><StoryRows stories={stories} empty={<EmptyState title="No local stories" body="This account may primarily submit comments, or its stories have not been loaded yet." />} /></View>
    </ScrollView>
  </Screen>;
}
function Stat({ label, value }: { label: string; value: string }) { return <View style={styles.stat}><ThemedText variant="title">{value}</ThemedText><ThemedText variant="caption" muted>{label}</ThemedText></View>; }
const styles = StyleSheet.create({ content: { padding: 14, paddingBottom: 90, gap: 22 }, profile: { padding: 16, gap: 16 }, stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 22 }, stat: { minWidth: 80, gap: 1 }, section: { gap: 9 } });
