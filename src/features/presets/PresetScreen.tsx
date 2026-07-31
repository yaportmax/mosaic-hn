import { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Slider from '@react-native-community/slider';
import * as Crypto from 'expo-crypto';
import type { FeedPreset } from '../../core/models.ts';
import { DEFAULT_FEED_PRESET } from '../../core/ranking.ts';
import { useAppServices, usePreferences } from '../../app/AppServices.tsx';
import { confirmAction } from '../../app/dialogs.ts';
import { Screen } from '../../components/Screen.tsx';
import { DetailHeader } from '../../components/Header.tsx';
import { Section } from '../../components/Section.tsx';
import { Surface } from '../../components/Surface.tsx';
import { ThemedText } from '../../components/ThemedText.tsx';
import { Button } from '../../components/Button.tsx';
import { Chip } from '../../components/Chip.tsx';
import { EmptyState, LoadingState } from '../../components/States.tsx';
import { useThemeRuntime } from '../../design/ThemeProvider.tsx';

const clonePreset = (preset: FeedPreset): FeedPreset => structuredClone(preset);
const splitList = (value: string): string[] => [...new Set(value.split(',').map((item) => item.trim().toLowerCase()).filter(Boolean))];

function normalizeForEditor(preset: FeedPreset): FeedPreset {
  const next = clonePreset(preset);
  next.weights.recency = next.weights.recency <= 0.25 ? 0 : next.weights.recency >= 1.75 ? 2 : 1;
  if (next.weights.score > 0 && next.weights.score <= 3) next.weights.score *= 500;
  if (next.weights.discussion > 0 && next.weights.discussion <= 3) next.weights.discussion *= 250;
  next.weights.growth = next.weights.growth <= 0.25 ? 0 : next.weights.growth >= 1.75 ? 2 : 1;
  next.weights.preferred = next.weights.preferred <= 0.25 ? 0 : next.weights.preferred >= 1.75 ? 2 : 1;
  next.weights.keyword = next.weights.keyword <= 0.25 ? 0 : next.weights.keyword >= 1.75 ? 2 : 1;
  next.recencyHalfLifeHours = 12;
  return next;
}

const createPreset = (): FeedPreset => ({
  ...normalizeForEditor(DEFAULT_FEED_PRESET),
  id: Crypto.randomUUID(),
  name: 'My feed'
});

function recencyLabel(value: number): string {
  if (value <= 0) return 'All cached stories';
  if (value >= 2) return 'Newest first';
  return 'Balanced';
}

export function PresetScreen() {
  const { database, preferences: controller } = useAppServices();
  const preferences = usePreferences();
  const { theme } = useThemeRuntime();
  const [presets, setPresets] = useState<FeedPreset[]>([]);
  const [editing, setEditing] = useState<FeedPreset | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setPresets(await database.repository.listPresets());
    setLoading(false);
  }, [database.repository]);
  useEffect(() => { void reload(); }, [reload]);

  const save = async () => {
    if (!editing) return;
    const name = editing.name.trim();
    if (!name) {
      Alert.alert('Name required', 'Give this feed a name.');
      return;
    }
    const next = normalizeForEditor({ ...editing, name });
    await database.repository.savePreset(next);
    await controller.update({ activePresetId: next.id });
    setEditing(null);
    await reload();
  };
  const remove = (preset: FeedPreset) => confirmAction({
    title: 'Delete feed?',
    message: preset.name,
    confirmLabel: 'Delete',
    destructive: true,
    onConfirm: () => database.repository.deletePreset(preset.id).then(async (deleted) => {
      if (deleted && preferences.activePresetId === preset.id) await controller.update({ activePresetId: DEFAULT_FEED_PRESET.id });
      await reload();
    })
  });

  if (loading) return <Screen edges={['top']}><DetailHeader title="Customize feed" /><LoadingState label="Loading feeds…" /></Screen>;
  return <Screen edges={['top']}>
    <DetailHeader title="Customize feed" subtitle="Choose what should rise to the top" />
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {!editing ? <>
        <Button label="Create a custom feed" icon="add" onPress={() => setEditing(createPreset())} />
        {presets.length ? <View style={styles.stack}>{presets.map((preset) => {
          const normalized = normalizeForEditor(preset);
          const active = preferences.activePresetId === preset.id;
          return <Surface key={preset.id} style={[styles.preset, active && { borderColor: theme.tokens.colors.accent, borderWidth: 2 }]}>
            <View style={styles.presetCopy}>
              <ThemedText variant="headline">{preset.name}</ThemedText>
              <ThemedText variant="meta" muted>{recencyLabel(normalized.weights.recency)} · {Math.round(normalized.weights.score)} point cap · {Math.round(normalized.weights.discussion)} comment cap</ThemedText>
            </View>
            <Button label={active ? 'Active' : 'Use'} variant={active ? 'secondary' : 'primary'} disabled={active} onPress={() => void controller.update({ activePresetId: preset.id })} />
            <Button label={preset.id === DEFAULT_FEED_PRESET.id ? 'Copy' : 'Edit'} variant="ghost" onPress={() => setEditing(preset.id === DEFAULT_FEED_PRESET.id ? { ...normalized, id: Crypto.randomUUID(), name: `${preset.name} copy` } : normalized)} />
            {preset.id !== DEFAULT_FEED_PRESET.id ? <Button label="Delete" variant="ghost" onPress={() => remove(preset)} /> : null}
          </Surface>;
        })}</View> : <EmptyState title="No custom feeds" body="Create one to change how stories are ordered without changing Hacker News itself." />}
      </> : <>
        <Section title="Name">
          <TextInput value={editing.name} onChangeText={(name) => setEditing({ ...editing, name })} placeholder="Feed name" placeholderTextColor={theme.tokens.colors.mutedText} style={[styles.input, { color: theme.tokens.colors.text, borderColor: theme.tokens.colors.border }]} />
        </Section>

        <Section title="Age of stories" caption="0 ignores age and includes every cached story. 1 uses the normal Hacker News-style freshness balance. 2 sorts the feed strictly newest first.">
          <ModeChoice value={editing.weights.recency} options={[
            { value: 0, label: '0 · All time' },
            { value: 1, label: '1 · Balanced' },
            { value: 2, label: '2 · Newest' }
          ]} onChange={(recency) => setEditing({ ...editing, weights: { ...editing.weights, recency } })} />
        </Section>

        <Section title="Points" caption="Stories gain points influence until this cap. Set 0 to ignore points. At 500, a 500-point story receives the full points boost and higher totals do not add more.">
          <NumberSlider label="Points cap" value={editing.weights.score} minimum={0} maximum={2_000} step={25} format={(value) => value <= 0 ? 'Ignored' : `${Math.round(value)} pts`} onChange={(score) => setEditing({ ...editing, weights: { ...editing.weights, score } })} />
        </Section>

        <Section title="Comments" caption="Stories gain discussion influence until this many comments. Set 0 to ignore discussion size.">
          <NumberSlider label="Comment cap" value={editing.weights.discussion} minimum={0} maximum={1_000} step={10} format={(value) => value <= 0 ? 'Ignored' : `${Math.round(value)} comments`} onChange={(discussion) => setEditing({ ...editing, weights: { ...editing.weights, discussion } })} />
        </Section>

        <Section title="Extra boosts">
          <InfluenceChoice label="Trending now" detail="Uses point and comment growth observed on this device." value={editing.weights.growth} onChange={(growth) => setEditing({ ...editing, weights: { ...editing.weights, growth } })} />
          <InfluenceChoice label="Preferred sources and authors" detail="Boosts matching domains and HN usernames below." value={editing.weights.preferred} onChange={(preferred) => setEditing({ ...editing, weights: { ...editing.weights, preferred } })} />
          <InfluenceChoice label="Preferred keywords" detail="Boosts stories whose title or text contains a keyword below." value={editing.weights.keyword} onChange={(keyword) => setEditing({ ...editing, weights: { ...editing.weights, keyword } })} />
        </Section>

        <Section title="Your preferences" caption="Separate multiple entries with commas. Matching domains include subdomains.">
          <ListField label="Websites" value={editing.preferredDomains.join(', ')} placeholder="github.com, nytimes.com" onChange={(value) => setEditing({ ...editing, preferredDomains: splitList(value) })} />
          <ListField label="HN users" value={editing.preferredAuthors.join(', ')} placeholder="pg, dang" onChange={(value) => setEditing({ ...editing, preferredAuthors: splitList(value) })} />
          <ListField label="Keywords" value={editing.preferredKeywords.join(', ')} placeholder="rust, climate, design" onChange={(value) => setEditing({ ...editing, preferredKeywords: splitList(value) })} />
        </Section>

        <Surface style={styles.explanation}>
          <ThemedText variant="headline">How this works</ThemedText>
          <ThemedText muted>Mosaic downloads the official feed, applies these choices on your device, and shows the reordered result. “All time” can include older stories already cached on this device.</ThemedText>
        </Surface>
        <View style={styles.buttons}><Button label="Save and use this feed" icon="checkmark" onPress={() => void save()} /><Button label="Cancel" variant="ghost" onPress={() => setEditing(null)} /></View>
      </>}
    </ScrollView>
  </Screen>;
}

function ModeChoice({ value, options, onChange }: { value: number; options: ReadonlyArray<{ value: number; label: string }>; onChange(value: number): void }) {
  return <View style={styles.choiceValues}>{options.map((option) => <Chip key={option.value} label={option.label} selected={value === option.value} onPress={() => onChange(option.value)} />)}</View>;
}

function InfluenceChoice({ label, detail, value, onChange }: { label: string; detail: string; value: number; onChange(value: number): void }) {
  return <Surface style={styles.influence}>
    <ThemedText variant="headline">{label}</ThemedText>
    <ThemedText variant="meta" muted>{detail}</ThemedText>
    <ModeChoice value={value} options={[{ value: 0, label: 'Off' }, { value: 1, label: 'Normal' }, { value: 2, label: 'Strong' }]} onChange={onChange} />
  </Surface>;
}

function NumberSlider({ label, value, minimum, maximum, step, format, onChange }: { label: string; value: number; minimum: number; maximum: number; step: number; format(value: number): string; onChange(value: number): void }) {
  const { theme } = useThemeRuntime();
  return <Surface style={styles.slider}>
    <View style={styles.sliderLabel}><ThemedText>{label}</ThemedText><ThemedText variant="meta" accent>{format(value)}</ThemedText></View>
    <Slider value={value} minimumValue={minimum} maximumValue={maximum} step={step} onValueChange={onChange} minimumTrackTintColor={theme.tokens.colors.accent} maximumTrackTintColor={theme.tokens.colors.border} thumbTintColor={theme.tokens.colors.accent} />
  </Surface>;
}

function ListField({ label, value, placeholder, onChange }: { label: string; value: string; placeholder: string; onChange(value: string): void }) {
  const { theme } = useThemeRuntime();
  return <Surface style={styles.listField}><ThemedText variant="meta" muted>{label}</ThemedText><TextInput value={value} onChangeText={onChange} autoCapitalize="none" autoCorrect={false} placeholder={placeholder} placeholderTextColor={theme.tokens.colors.mutedText} style={[styles.input, { color: theme.tokens.colors.text, borderColor: theme.tokens.colors.border }]} /></Surface>;
}

const styles = StyleSheet.create({
  content: { padding: 14, paddingBottom: 100, gap: 22 },
  stack: { gap: 9 },
  preset: { minHeight: 72, padding: 12, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 7 },
  presetCopy: { flexGrow: 1, flexBasis: 210, gap: 3 },
  input: { minHeight: 46, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontSize: 15 },
  slider: { padding: 12 },
  sliderLabel: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  choiceValues: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  influence: { padding: 13, gap: 6 },
  listField: { padding: 12, gap: 7 },
  explanation: { padding: 15, gap: 6 },
  buttons: { gap: 8 }
});
