import { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import Slider from '@react-native-community/slider';
import { router } from 'expo-router';
import type { ColorSchemeName, CommentLayout, FeedLayout, MetadataLayout, NavigationLayout, ShellLayout, StoryLayout, ThemePackage, ThemeTokens } from '../../../theme-sdk/types.ts';
import { validateThemePackage } from '../../../theme-sdk/validate.ts';
import { getBuiltinTheme } from '../../design/builtins.ts';
import { APP_VERSION } from '../../design/constants.ts';
import { useAppServices, usePreferences } from '../../app/AppServices.tsx';
import { useThemeRuntime } from '../../design/ThemeProvider.tsx';
import { Screen } from '../../components/Screen.tsx';
import { DetailHeader } from '../../components/Header.tsx';
import { Button } from '../../components/Button.tsx';
import { Chip } from '../../components/Chip.tsx';
import { Section } from '../../components/Section.tsx';
import { Surface } from '../../components/Surface.tsx';
import { ThemePreview } from '../../components/ThemePreview.tsx';
import { ThemedText } from '../../components/ThemedText.tsx';

const colorKeys = ['background', 'surface', 'text', 'mutedText', 'accent', 'border', 'success', 'warning', 'danger'] as const;
const clone = <T,>(value: T): T => structuredClone(value);

export function ThemeStudioScreen({ id }: { id?: string }) {
  const { themes } = useAppServices();
  const preferences = usePreferences();
  const runtime = useThemeRuntime();
  const [draft, setDraft] = useState<ThemePackage>(() => clone(getBuiltinTheme(preferences.activeThemeId)));
  const [source, setSource] = useState<'builtin' | 'installed'>('builtin');
  const [scheme, setScheme] = useState<ColorSchemeName>(runtime.theme.sourceScheme);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    void themes.list().then((entries) => {
      const entry = entries.find((item) => item.theme.manifest.id === (id ?? preferences.activeThemeId));
      if (!active || !entry) return;
      setDraft(clone(entry.theme)); setSource(entry.source);
    });
    return () => { active = false; };
  }, [themes, id, preferences.activeThemeId]);

  const issues = useMemo(() => validateThemePackage(draft, { appVersion: APP_VERSION }), [draft]);
  const tokens = scheme === 'dark' ? (draft.tokens.dark ?? draft.tokens.light) : draft.tokens.light;
  const updateTokens = (update: (tokens: ThemeTokens) => void) => setDraft((existing) => {
    const next = clone(existing);
    if (scheme === 'dark' && !next.tokens.dark) next.tokens.dark = clone(next.tokens.light);
    const target = scheme === 'dark' ? next.tokens.dark! : next.tokens.light;
    update(target);
    return next;
  });
  const updateLayout = <K extends keyof ThemePackage['layout']>(key: K, value: ThemePackage['layout'][K]) => setDraft((existing) => ({ ...existing, layout: { ...existing.layout, [key]: value } }));

  const save = async () => {
    if (issues.length) { Alert.alert('Theme is not valid', issues.slice(0, 4).map((issue) => `${issue.path}: ${issue.message}`).join('\n')); return; }
    setSaving(true);
    try {
      const next = clone(draft);
      if (source === 'builtin') {
        const stamp = Date.now().toString(36);
        next.manifest.id = `local.mosaichn.${stamp}`;
        next.manifest.name = `${next.manifest.name} Custom`;
        next.manifest.author = 'Local user';
        next.manifest.version = '1.0.0';
      }
      const installed = await themes.install(next);
      await runtime.selectTheme(installed.manifest.id);
      router.replace({ pathname: '/theme/[id]', params: { id: installed.manifest.id } });
    } catch (reason) { Alert.alert('Save failed', reason instanceof Error ? reason.message : 'The theme could not be saved'); }
    finally { setSaving(false); }
  };

  return <Screen edges={['top']}>
    <DetailHeader title="Theme Studio" subtitle={source === 'builtin' ? 'Saving creates an editable community-theme copy' : `Editing ${draft.manifest.name}`} />
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <ThemePreview themePackage={draft} scheme={scheme} />
      <View style={styles.scheme}><Chip label="Light" selected={scheme === 'light'} onPress={() => setScheme('light')} /><Chip label="Dark" selected={scheme === 'dark'} onPress={() => setScheme('dark')} /></View>
      <Section title="Identity"><Surface style={styles.form}><Field label="Name" value={draft.manifest.name} onChange={(value) => setDraft((current) => ({ ...current, manifest: { ...current.manifest, name: value } }))} /><Field label="Author" value={draft.manifest.author} onChange={(value) => setDraft((current) => ({ ...current, manifest: { ...current.manifest, author: value } }))} /><Field label="Description" value={draft.manifest.description ?? ''} onChange={(value) => setDraft((current) => ({ ...current, manifest: { ...current.manifest, description: value } }))} /></Surface></Section>
      <Section title={`${scheme === 'dark' ? 'Dark' : 'Light'} colors`} caption="Hex colors are validated for readability before installation."><Surface style={styles.form}>{colorKeys.map((key) => <Field key={key} label={key} value={tokens.colors[key]} swatch onChange={(value) => updateTokens((target) => { target.colors[key] = value; })} />)}</Surface></Section>
      <Section title="Layouts"><Choice label="App shell" values={['tabs', 'floating-tabs', 'sidebar'] as ShellLayout[]} selected={draft.layout.shell} onSelect={(value) => updateLayout('shell', value)} /><Choice label="Feed" values={['compact', 'comfortable', 'cards', 'magazine'] as FeedLayout[]} selected={draft.layout.feed} onSelect={(value) => updateLayout('feed', value)} /><Choice label="Story" values={['line', 'row', 'card', 'editorial'] as StoryLayout[]} selected={draft.layout.story} onSelect={(value) => updateLayout('story', value)} /><Choice label="Comments" values={['threads', 'ledger', 'conversation'] as CommentLayout[]} selected={draft.layout.comments} onSelect={(value) => updateLayout('comments', value)} /><Choice label="Navigation" values={['standard', 'floating', 'minimal'] as NavigationLayout[]} selected={draft.layout.navigation} onSelect={(value) => updateLayout('navigation', value)} /><Choice label="Metadata" values={['inline', 'stacked', 'footer'] as MetadataLayout[]} selected={draft.layout.metadata} onSelect={(value) => updateLayout('metadata', value)} /></Section>
      <Section title="Typography and density"><SliderRow label="Type scale" value={tokens.typography.scale} minimum={0.75} maximum={1.75} step={0.05} onChange={(value) => updateTokens((target) => { target.typography.scale = value; })} /><Choice label="Font" values={['system', 'rounded', 'serif', 'monospace'] as const} selected={tokens.typography.fontFamily} onSelect={(value) => updateTokens((target) => { target.typography.fontFamily = value; })} /><SliderRow label="Spacing unit" value={tokens.spacing.unit} minimum={2} maximum={12} step={1} onChange={(value) => updateTokens((target) => { target.spacing.unit = value; })} /><SliderRow label="Density" value={tokens.spacing.density} minimum={0.65} maximum={1.5} step={0.05} onChange={(value) => updateTokens((target) => { target.spacing.density = value; })} /><SliderRow label="Corner radius" value={tokens.shape.radius} minimum={0} maximum={40} step={1} onChange={(value) => updateTokens((target) => { target.shape.radius = value; })} /></Section>
      <Section title="Effects and motion"><ToggleRow label="Native glass when available" value={tokens.effects.glass} onChange={(value) => updateTokens((target) => { target.effects.glass = value; })} /><SliderRow label="Blur" value={tokens.effects.blur} minimum={0} maximum={100} step={1} onChange={(value) => updateTokens((target) => { target.effects.blur = value; })} /><SliderRow label="Shadow" value={tokens.effects.shadow} minimum={0} maximum={1} step={0.05} onChange={(value) => updateTokens((target) => { target.effects.shadow = value; })} /><SliderRow label="Motion speed" value={tokens.motion.durationScale} minimum={0} maximum={2} step={0.1} onChange={(value) => updateTokens((target) => { target.motion.durationScale = value; })} /><SliderRow label="Spring damping" value={tokens.motion.springDamping} minimum={1} maximum={40} step={1} onChange={(value) => updateTokens((target) => { target.motion.springDamping = value; })} /></Section>
      {issues.length ? <Surface style={[styles.issues, { borderColor: runtime.theme.tokens.colors.danger }]}><ThemedText variant="headline" style={{ color: runtime.theme.tokens.colors.danger }}>{issues.length} validation issue{issues.length === 1 ? '' : 's'}</ThemedText>{issues.slice(0, 8).map((issue) => <ThemedText key={`${issue.path}-${issue.code}`} variant="meta">{issue.path}: {issue.message}</ThemedText>)}</Surface> : <Surface style={styles.valid}><ThemedText variant="headline" style={{ color: runtime.theme.tokens.colors.success }}>Theme passes validation</ThemedText><ThemedText variant="meta" muted>It can be installed, exported, and submitted to a static marketplace.</ThemedText></Surface>}
      <Button label={source === 'builtin' ? 'Install custom copy' : 'Save theme'} icon="checkmark-circle-outline" loading={saving} onPress={() => void save()} />
    </ScrollView>
  </Screen>;
}

function Field({ label, value, onChange, swatch = false }: { label: string; value: string; onChange(value: string): void; swatch?: boolean }) {
  const runtime = useThemeRuntime();
  return <View style={styles.field}><ThemedText variant="meta" muted style={{ width: 90 }}>{label}</ThemedText>{swatch ? <View style={[styles.swatch, { backgroundColor: /^#[0-9a-f]{6,8}$/i.test(value) ? value : 'transparent', borderColor: runtime.theme.tokens.colors.border }]} /> : null}<TextInput value={value} onChangeText={onChange} autoCapitalize="none" autoCorrect={false} style={[styles.fieldInput, { color: runtime.theme.tokens.colors.text, borderColor: runtime.theme.tokens.colors.border }]} /></View>;
}
function Choice<T extends string>({ label, values, selected, onSelect }: { label: string; values: readonly T[]; selected: T; onSelect(value: T): void }) { return <View style={styles.choice}><ThemedText variant="meta" muted>{label}</ThemedText><View style={styles.choiceValues}>{values.map((value) => <Chip key={value} compact label={value} selected={selected === value} onPress={() => onSelect(value)} />)}</View></View>; }
function SliderRow({ label, value, minimum, maximum, step, onChange }: { label: string; value: number; minimum: number; maximum: number; step: number; onChange(value: number): void }) { const runtime = useThemeRuntime(); return <Surface style={styles.sliderRow}><View style={styles.sliderLabel}><ThemedText>{label}</ThemedText><ThemedText variant="meta" accent>{Number.isInteger(step) ? Math.round(value) : value.toFixed(2)}</ThemedText></View><Slider value={value} minimumValue={minimum} maximumValue={maximum} step={step} onValueChange={onChange} minimumTrackTintColor={runtime.theme.tokens.colors.accent} maximumTrackTintColor={runtime.theme.tokens.colors.border} thumbTintColor={runtime.theme.tokens.colors.accent} /></Surface>; }
function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange(value: boolean): void }) { const runtime = useThemeRuntime(); return <Surface style={styles.toggle}><ThemedText>{label}</ThemedText><Switch value={value} onValueChange={onChange} trackColor={{ true: runtime.theme.tokens.colors.accent }} /></Surface>; }
const styles = StyleSheet.create({ content: { padding: 14, paddingBottom: 90, gap: 22 }, scheme: { flexDirection: 'row', gap: 8 }, form: { paddingHorizontal: 12 }, field: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(127,127,127,0.25)' }, fieldInput: { flex: 1, minHeight: 38, borderWidth: 1, borderRadius: 8, paddingHorizontal: 9, fontSize: 14 }, swatch: { width: 27, height: 27, borderRadius: 7, borderWidth: 1 }, choice: { gap: 7 }, choiceValues: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, sliderRow: { paddingHorizontal: 12, paddingVertical: 9 }, sliderLabel: { flexDirection: 'row', justifyContent: 'space-between' }, toggle: { minHeight: 54, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, issues: { padding: 14, gap: 5, borderWidth: 2 }, valid: { padding: 14, gap: 4 } });
