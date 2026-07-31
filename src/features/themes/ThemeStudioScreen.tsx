import { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import type { ColorSchemeName, CommentLayout, FeedLayout, FontFamilyToken, MetadataLayout, StoryLayout, ThemePackage, ThemeTokens } from '../../../theme-sdk/types.ts';
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
type ColorKey = typeof colorKeys[number];

const colorLabels: Record<ColorKey, { label: string; detail: string }> = {
  background: { label: 'App background', detail: 'The area behind every screen.' },
  surface: { label: 'Cards and panels', detail: 'Story cards, controls, and sheets.' },
  text: { label: 'Main text', detail: 'Headlines and primary labels.' },
  mutedText: { label: 'Secondary text', detail: 'Metadata, timestamps, and hints.' },
  accent: { label: 'Accent', detail: 'Selected tabs, primary buttons, and highlights.' },
  border: { label: 'Dividers', detail: 'Card outlines and separators.' },
  success: { label: 'Success', detail: 'Completed and positive states.' },
  warning: { label: 'Warning', detail: 'Attention states and read-later indicators.' },
  danger: { label: 'Error', detail: 'Destructive actions and failures.' }
};

const COLOR_PALETTE = [
  '#FFFFFF', '#F7F7F7', '#E5E7EB', '#B3B3BA', '#6B7280', '#38383F', '#19191D', '#0E0E10',
  '#FF8A4C', '#FF6B61', '#E64980', '#A855F7', '#6C7CFF', '#3B82F6', '#0EA5E9', '#14B8A6',
  '#46B97B', '#84CC16', '#F5B942', '#F97316', '#B45309', '#7C3AED', '#1D4ED8', '#0F766E'
] as const;

const clone = <T,>(value: T): T => structuredClone(value);

export function ThemeStudioScreen({ id }: { id?: string }) {
  const { themes } = useAppServices();
  const preferences = usePreferences();
  const runtime = useThemeRuntime();
  const [draft, setDraft] = useState<ThemePackage>(() => clone(getBuiltinTheme(preferences.activeThemeId)));
  const [source, setSource] = useState<'builtin' | 'installed'>('builtin');
  const [scheme, setScheme] = useState<ColorSchemeName>(runtime.theme.sourceScheme);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [picking, setPicking] = useState<ColorKey | null>(null);

  useEffect(() => {
    let mounted = true;
    void themes.list().then((entries) => {
      const entry = entries.find((item) => item.theme.manifest.id === (id ?? preferences.activeThemeId));
      if (!mounted || !entry) return;
      setDraft(clone(entry.theme));
      setSource(entry.source);
    });
    return () => { mounted = false; };
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
    if (issues.length) {
      Alert.alert('A few colors need attention', issues.slice(0, 4).map((issue) => issue.message).join('\n'));
      return;
    }
    setSaving(true);
    try {
      const next = clone(draft);
      if (source === 'builtin') {
        const stamp = Date.now().toString(36);
        next.manifest.id = `local.mosaichn.${stamp}`;
        next.manifest.name = `${next.manifest.name} Custom`;
        next.manifest.author = 'You';
        next.manifest.version = '1.0.0';
      }
      const installed = await themes.install(next);
      await runtime.selectTheme(installed.manifest.id);
      router.replace({ pathname: '/theme/[id]', params: { id: installed.manifest.id } });
    } catch (reason) {
      Alert.alert('Could not save theme', reason instanceof Error ? reason.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return <Screen edges={['top']}>
    <DetailHeader title="Customize theme" subtitle="Every choice updates the preview" />
    <ScrollView stickyHeaderIndices={[0]} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={[styles.previewDock, { backgroundColor: runtime.theme.tokens.colors.background, borderBottomColor: runtime.theme.tokens.colors.border }]}>
        <View style={styles.previewTop}>
          <View style={styles.scheme}><Chip compact label="Light" selected={scheme === 'light'} onPress={() => setScheme('light')} /><Chip compact label="Dark" selected={scheme === 'dark'} onPress={() => setScheme('dark')} /></View>
          <Button label="Expand preview" icon="expand-outline" variant="ghost" onPress={() => setExpanded(true)} />
        </View>
        <ThemePreview compact themePackage={draft} scheme={scheme} />
      </View>

      <Section title="Theme name">
        <Surface style={styles.form}>
          <TextInput value={draft.manifest.name} onChangeText={(name) => setDraft((current) => ({ ...current, manifest: { ...current.manifest, name } }))} placeholder="Theme name" placeholderTextColor={runtime.theme.tokens.colors.mutedText} style={[styles.input, { color: runtime.theme.tokens.colors.text, borderColor: runtime.theme.tokens.colors.border }]} />
          <TextInput value={draft.manifest.description ?? ''} onChangeText={(description) => setDraft((current) => ({ ...current, manifest: { ...current.manifest, description } }))} placeholder="Short description" placeholderTextColor={runtime.theme.tokens.colors.mutedText} style={[styles.input, { color: runtime.theme.tokens.colors.text, borderColor: runtime.theme.tokens.colors.border }]} />
        </Surface>
      </Section>

      <Section title={`${scheme === 'dark' ? 'Dark' : 'Light'} colors`} caption="Tap a color square to pick a color, or enter a hex value. The preview stays visible while you work.">
        <Surface style={styles.form}>{colorKeys.map((key) => <ColorField key={key} colorKey={key} value={tokens.colors[key]} onPick={() => setPicking(key)} onChange={(value) => updateTokens((target) => { target.colors[key] = value; })} />)}</Surface>
      </Section>

      <Section title="Text" caption="All six styles use fonts already available on the device, so themes work offline.">
        <NamedChoice<FontFamilyToken> label="Font style" values={['system', 'rounded', 'humanist', 'serif', 'condensed', 'monospace']} labels={{ system: 'System', rounded: 'Rounded', humanist: 'Humanist', serif: 'Serif', condensed: 'Condensed', monospace: 'Mono' }} selected={tokens.typography.fontFamily} onSelect={(fontFamily) => updateTokens((target) => { target.typography.fontFamily = fontFamily; })} />
        <NumberChoice label="Text size" values={[0.9, 1, 1.15, 1.3]} labels={['Small', 'Standard', 'Large', 'Extra large']} selected={tokens.typography.scale} onSelect={(scale) => updateTokens((target) => { target.typography.scale = scale; })} />
      </Section>

      <Section title="Shape and depth" caption="Corner shape changes cards, buttons, tabs, and sheets. Shadow changes raised surfaces.">
        <NumberChoice label="Corners" values={[4, 12, 20, 30]} labels={['Square', 'Soft', 'Rounded', 'Pill']} selected={tokens.shape.radius} onSelect={(radius) => updateTokens((target) => { target.shape.radius = radius; })} />
        <NumberChoice label="Shadow" values={[0, 0.18, 0.35]} labels={['Off', 'Soft', 'Strong']} selected={tokens.effects.shadow} onSelect={(shadow) => updateTokens((target) => { target.effects.shadow = shadow; })} />
      </Section>

      <Section title="Screen layouts" caption="These choices change content presentation. The four-tab phone navigation always stays familiar and usable.">
        <NamedChoice<FeedLayout> label="Feed" values={['compact', 'comfortable', 'cards', 'magazine']} labels={{ compact: 'Compact', comfortable: 'Comfortable', cards: 'Cards', magazine: 'Magazine' }} selected={draft.layout.feed} onSelect={(value) => updateLayout('feed', value)} />
        <NamedChoice<StoryLayout> label="Story rows" values={['line', 'row', 'card', 'editorial']} labels={{ line: 'Minimal', row: 'Balanced', card: 'Cards', editorial: 'Headlines' }} selected={draft.layout.story} onSelect={(value) => updateLayout('story', value)} />
        <NamedChoice<CommentLayout> label="Discussion" values={['threads', 'ledger', 'conversation']} labels={{ threads: 'Threaded', ledger: 'Compact', conversation: 'Conversation' }} selected={draft.layout.comments} onSelect={(value) => updateLayout('comments', value)} />
        <NamedChoice<MetadataLayout> label="Story details" values={['inline', 'stacked', 'footer']} labels={{ inline: 'One line', stacked: 'Two lines', footer: 'Below title' }} selected={draft.layout.metadata} onSelect={(value) => updateLayout('metadata', value)} />
      </Section>

      {issues.length ? <Surface style={[styles.issues, { borderColor: runtime.theme.tokens.colors.danger }]}><ThemedText variant="headline" style={{ color: runtime.theme.tokens.colors.danger }}>Fix before saving</ThemedText>{issues.slice(0, 6).map((issue, index) => <ThemedText key={`${issue.code}-${index}`} variant="meta">{issue.message}</ThemedText>)}</Surface> : null}
      <Button label="Save and apply" icon="checkmark-circle-outline" loading={saving} onPress={() => void save()} style={styles.pageButton} />
      <Button label="Cancel" variant="ghost" onPress={() => router.back()} style={styles.pageButton} />
    </ScrollView>

    <Modal visible={expanded} transparent animationType="fade" onRequestClose={() => setExpanded(false)}>
      <View style={styles.modalBackdrop}>
        <Surface elevated style={styles.previewModal}>
          <View style={styles.modalHeader}><ThemedText variant="title">Theme preview</ThemedText><Button label="Done" variant="ghost" onPress={() => setExpanded(false)} /></View>
          <ThemePreview themePackage={draft} scheme={scheme} />
        </Surface>
      </View>
    </Modal>

    <Modal visible={Boolean(picking)} transparent animationType="fade" onRequestClose={() => setPicking(null)}>
      <View style={styles.modalBackdrop}>
        <Surface elevated style={styles.colorModal}>
          <View style={styles.modalHeader}><ThemedText variant="title">{picking ? colorLabels[picking].label : 'Pick color'}</ThemedText><Button label="Done" variant="ghost" onPress={() => setPicking(null)} /></View>
          <View style={styles.palette}>{COLOR_PALETTE.map((color) => <Pressable key={color} accessibilityRole="button" accessibilityLabel={`Use color ${color}`} onPress={() => {
            if (picking) updateTokens((target) => { target.colors[picking] = color; });
            setPicking(null);
          }} style={({ pressed }) => [styles.paletteColor, { backgroundColor: color, borderColor: runtime.theme.tokens.colors.border, opacity: pressed ? 0.65 : 1 }]} />)}</View>
          <ThemedText variant="meta" muted>For an exact color, close this picker and type its hex value in the field.</ThemedText>
        </Surface>
      </View>
    </Modal>
  </Screen>;
}

function ColorField({ colorKey, value, onPick, onChange }: { colorKey: ColorKey; value: string; onPick(): void; onChange(value: string): void }) {
  const runtime = useThemeRuntime();
  const copy = colorLabels[colorKey];
  const valid = /^#[0-9a-f]{6,8}$/i.test(value);
  return <View style={styles.colorField}>
    <View style={styles.colorCopy}><ThemedText variant="headline">{copy.label}</ThemedText><ThemedText variant="caption" muted>{copy.detail}</ThemedText></View>
    <Pressable accessibilityRole="button" accessibilityLabel={`Pick ${copy.label} color`} onPress={onPick} style={({ pressed }) => [styles.swatch, { backgroundColor: valid ? value : 'transparent', borderColor: runtime.theme.tokens.colors.border, opacity: pressed ? 0.65 : 1 }]} />
    <TextInput value={value} onChangeText={onChange} autoCapitalize="characters" autoCorrect={false} style={[styles.hexInput, { color: runtime.theme.tokens.colors.text, borderColor: valid ? runtime.theme.tokens.colors.border : runtime.theme.tokens.colors.danger }]} />
  </View>;
}

function NamedChoice<T extends string>({ label, values, labels, selected, onSelect }: { label: string; values: readonly T[]; labels: Record<T, string>; selected: T; onSelect(value: T): void }) {
  return <Surface style={styles.choice}><ThemedText variant="meta" muted>{label}</ThemedText><View style={styles.choiceValues}>{values.map((value) => <Chip key={value} compact label={labels[value]} selected={selected === value} onPress={() => onSelect(value)} />)}</View></Surface>;
}

function NumberChoice({ label, values, labels, selected, onSelect }: { label: string; values: readonly number[]; labels: readonly string[]; selected: number; onSelect(value: number): void }) {
  const closest = values.reduce((best, value) => Math.abs(value - selected) < Math.abs(best - selected) ? value : best, values[0] ?? selected);
  return <Surface style={styles.choice}><ThemedText variant="meta" muted>{label}</ThemedText><View style={styles.choiceValues}>{values.map((value, index) => <Chip key={value} compact label={labels[index] ?? String(value)} selected={closest === value} onPress={() => onSelect(value)} />)}</View></Surface>;
}

const styles = StyleSheet.create({
  content: { paddingBottom: 90, gap: 22 },
  previewDock: { paddingHorizontal: 14, paddingTop: 8, paddingBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth, gap: 8, zIndex: 10 },
  previewTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  scheme: { flexDirection: 'row', gap: 7 },
  form: { marginHorizontal: 14, padding: 12, gap: 10 },
  input: { minHeight: 44, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontSize: 15 },
  colorField: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(127,127,127,0.25)' },
  colorCopy: { flex: 1, minWidth: 120, gap: 2 },
  swatch: { width: 38, height: 38, borderRadius: 10, borderWidth: 1 },
  hexInput: { width: 92, minHeight: 38, borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, fontSize: 13 },
  choice: { marginHorizontal: 14, padding: 12, gap: 8 },
  choiceValues: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  issues: { marginHorizontal: 14, padding: 14, gap: 5, borderWidth: 2 },
  pageButton: { marginHorizontal: 14 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'center', padding: 22 },
  previewModal: { padding: 16, gap: 14, maxWidth: 520, width: '100%', alignSelf: 'center' },
  colorModal: { padding: 16, gap: 14, maxWidth: 430, width: '100%', alignSelf: 'center' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  palette: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  paletteColor: { width: 42, height: 42, borderRadius: 12, borderWidth: 1 }
});
