import { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Slider from '@react-native-community/slider';
import * as Crypto from 'expo-crypto';
import type { FeedPreset, FeedWeights } from '../../core/models.ts';
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

const weightLabels: Record<keyof FeedWeights, string> = { recency: 'Recency', score: 'Points', discussion: 'Discussion size', growth: 'Locally observed growth', preferred: 'Preferred domains/authors', keyword: 'Preferred keywords' };
const clonePreset = (preset: FeedPreset): FeedPreset => structuredClone(preset);
const createPreset = (): FeedPreset => ({ ...clonePreset(DEFAULT_FEED_PRESET), id: Crypto.randomUUID(), name: 'Custom feed' });
const splitList = (value: string): string[] => [...new Set(value.split(',').map((item) => item.trim().toLowerCase()).filter(Boolean))];

export function PresetScreen() {
  const { database, preferences: controller } = useAppServices();
  const preferences = usePreferences();
  const { theme } = useThemeRuntime();
  const [presets, setPresets] = useState<FeedPreset[]>([]);
  const [editing, setEditing] = useState<FeedPreset | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => { setPresets(await database.repository.listPresets()); setLoading(false); }, [database.repository]);
  useEffect(() => { void reload(); }, [reload]);
  const save = async () => {
    if (!editing) return;
    const name = editing.name.trim();
    if (!name) { Alert.alert('Name required', 'Give this feed algorithm a name.'); return; }
    const next = { ...editing, name, recencyHalfLifeHours: Math.max(0.25, editing.recencyHalfLifeHours) };
    await database.repository.savePreset(next);
    await controller.update({ activePresetId: next.id });
    setEditing(null); await reload();
  };
  const remove = (preset: FeedPreset) => confirmAction({ title: 'Delete preset?', message: preset.name, confirmLabel: 'Delete', destructive: true, onConfirm: () => database.repository.deletePreset(preset.id).then(async (deleted) => { if (deleted && preferences.activePresetId === preset.id) await controller.update({ activePresetId: DEFAULT_FEED_PRESET.id }); await reload(); }) });

  if (loading) return <Screen edges={['top']}><DetailHeader title="Feed algorithms" /><LoadingState label="Loading feed presets…" /></Screen>;
  return <Screen edges={['top']}>
    <DetailHeader title="Feed algorithms" subtitle="Local, transparent, deterministic ranking" />
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {!editing ? <>
        <Button label="Create custom feed" icon="add" onPress={() => setEditing(createPreset())} />
        {presets.length ? <View style={styles.stack}>{presets.map((preset) => <Surface key={preset.id} style={[styles.preset, preferences.activePresetId === preset.id && { borderColor: theme.tokens.colors.accent, borderWidth: 2 }]}><View style={styles.presetCopy}><ThemedText variant="headline">{preset.name}</ThemedText><ThemedText variant="meta" muted>Half-life {preset.recencyHalfLifeHours}h · {preset.preferredKeywords.length + preset.preferredDomains.length + preset.preferredAuthors.length} preferences</ThemedText></View><Button label={preferences.activePresetId === preset.id ? 'Active' : 'Use'} variant={preferences.activePresetId === preset.id ? 'secondary' : 'primary'} onPress={() => void controller.update({ activePresetId: preset.id })} /><Button label={preset.id === DEFAULT_FEED_PRESET.id ? 'Duplicate' : 'Edit'} variant="ghost" onPress={() => setEditing(preset.id === DEFAULT_FEED_PRESET.id ? { ...clonePreset(preset), id: Crypto.randomUUID(), name: `${preset.name} copy` } : clonePreset(preset))} />{preset.id !== DEFAULT_FEED_PRESET.id ? <Button label="Delete" variant="ghost" onPress={() => remove(preset)} /> : null}</Surface>)}</View> : <EmptyState title="No feed presets" body="Create a local algorithm to reshape Hacker News without a remote recommendation service." />}
      </> : <>
        <Section title="Identity"><TextInput value={editing.name} onChangeText={(name) => setEditing({ ...editing, name })} placeholder="Preset name" placeholderTextColor={theme.tokens.colors.mutedText} style={[styles.input, { color: theme.tokens.colors.text, borderColor: theme.tokens.colors.border }]} /></Section>
        <Section title="Ranking weights" caption="Zero disables a factor. Higher values make it more influential.">{(Object.keys(weightLabels) as Array<keyof FeedWeights>).map((key) => <WeightSlider key={key} label={weightLabels[key]} value={editing.weights[key]} onChange={(value) => setEditing({ ...editing, weights: { ...editing.weights, [key]: value } })} />)}<WeightSlider label="Recency half-life (hours)" value={editing.recencyHalfLifeHours} minimum={0.25} maximum={72} step={0.25} onChange={(recencyHalfLifeHours) => setEditing({ ...editing, recencyHalfLifeHours })} /></Section>
        <Section title="Preferred sources" caption="Comma-separated. Matching domains include their subdomains.">
          <ListField label="Domains" value={editing.preferredDomains.join(', ')} onChange={(value) => setEditing({ ...editing, preferredDomains: splitList(value) })} />
          <ListField label="Authors" value={editing.preferredAuthors.join(', ')} onChange={(value) => setEditing({ ...editing, preferredAuthors: splitList(value) })} />
          <ListField label="Keywords" value={editing.preferredKeywords.join(', ')} onChange={(value) => setEditing({ ...editing, preferredKeywords: splitList(value) })} />
        </Section>
        <Surface style={styles.explanation}><ThemedText variant="headline">What this changes</ThemedText><ThemedText muted>Mosaic HN still downloads the selected official feed. This preset only reorders that local set and explains every contribution. It does not alter Hacker News itself.</ThemedText></Surface>
        <View style={styles.buttons}><Button label="Save and activate" icon="checkmark" onPress={() => void save()} /><Button label="Cancel" variant="ghost" onPress={() => setEditing(null)} /></View>
      </>}
    </ScrollView>
  </Screen>;
}

function WeightSlider({ label, value, onChange, minimum = 0, maximum = 3, step = 0.05 }: { label: string; value: number; onChange(value: number): void; minimum?: number; maximum?: number; step?: number }) {
  const { theme } = useThemeRuntime();
  return <Surface style={styles.slider}><View style={styles.sliderLabel}><ThemedText>{label}</ThemedText><ThemedText variant="meta" accent>{value.toFixed(step < 0.1 ? 2 : 1)}</ThemedText></View><Slider value={value} minimumValue={minimum} maximumValue={maximum} step={step} onValueChange={onChange} minimumTrackTintColor={theme.tokens.colors.accent} maximumTrackTintColor={theme.tokens.colors.border} thumbTintColor={theme.tokens.colors.accent} /></Surface>;
}
function ListField({ label, value, onChange }: { label: string; value: string; onChange(value: string): void }) {
  const { theme } = useThemeRuntime();
  return <Surface style={styles.listField}><ThemedText variant="meta" muted>{label}</ThemedText><TextInput value={value} onChangeText={onChange} autoCapitalize="none" autoCorrect={false} placeholder="Comma-separated" placeholderTextColor={theme.tokens.colors.mutedText} style={[styles.input, { color: theme.tokens.colors.text, borderColor: theme.tokens.colors.border }]} /></Surface>;
}
const styles = StyleSheet.create({ content: { padding: 14, paddingBottom: 100, gap: 22 }, stack: { gap: 9 }, preset: { minHeight: 72, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 7 }, presetCopy: { flex: 1, gap: 3 }, input: { minHeight: 46, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontSize: 15 }, slider: { padding: 12 }, sliderLabel: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 }, listField: { padding: 12, gap: 7 }, explanation: { padding: 15, gap: 6 }, buttons: { gap: 8 } });
