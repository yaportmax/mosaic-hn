import { Alert, Linking, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { BUILTIN_MODULES } from '../../../module-sdk/registry.ts';
import { useAppServices, useModuleConfiguration, usePreferences } from '../../app/AppServices.tsx';
import { pickTextFile } from '../../app/file-exchange.ts';
import { confirmAction } from '../../app/dialogs.ts';
import { importLibraryJson } from '../../core/exports.ts';
import type { FeedKind } from '../../core/models.ts';
import { FEED_KINDS } from '../../core/models.ts';
import { FEED_LABELS } from '../../core/format.ts';
import type { AccessibilityOverride, ColorModePreference, GestureAction, LinkOpeningPreference } from '../../state/preferences.ts';
import { DEFAULT_PREFERENCES } from '../../state/preferences.ts';
import { Screen } from '../../components/Screen.tsx';
import { ScreenHeader } from '../../components/Header.tsx';
import { Section } from '../../components/Section.tsx';
import { SettingRow } from '../../components/SettingRow.tsx';
import { Chip } from '../../components/Chip.tsx';
import { Button } from '../../components/Button.tsx';
import { Surface } from '../../components/Surface.tsx';
import { ThemedText } from '../../components/ThemedText.tsx';

function Choice<T extends string>({ values, selected, labels, onSelect }: { values: readonly T[]; selected: T; labels?: Partial<Record<T, string>>; onSelect(value: T): void }) {
  return <View style={styles.chips}>{values.map((value) => <Chip key={value} compact label={labels?.[value] ?? value} selected={value === selected} onPress={() => onSelect(value)} />)}</View>;
}

export function SettingsScreen() {
  const preferences = usePreferences();
  const moduleConfiguration = useModuleConfiguration();
  const { preferences: controller, database } = useAppServices();
  const commentsEnabled = moduleConfiguration.enabled.includes('comments');
  const algorithmsEnabled = moduleConfiguration.enabled.includes('algorithms');
  const automationEnabled = moduleConfiguration.enabled.includes('automation');
  const libraryEnabled = moduleConfiguration.enabled.includes('library');
  const gestureActions: GestureAction[] = ['none', 'open', ...(libraryEnabled ? ['save', 'queue'] as const : []), 'share', ...(automationEnabled ? ['hide'] as const : [])];
  const update = (patch: Parameters<typeof controller.update>[0]) => void controller.update(patch);

  const importLibrary = async () => {
    const file = await pickTextFile(['application/json', 'text/json', 'text/plain']);
    if (!file) return;
    const payload = importLibraryJson(file.text);
    await database.repository.importLibrary(payload);
    Alert.alert('Import complete', `${payload.bookmarks.length} bookmarks, ${payload.collections.length} collections, ${payload.presets.length} feed presets, and ${payload.rules.length} rules were merged locally.`);
  };

  const reset = () => confirmAction({ title: 'Reset preferences?', message: 'This keeps your cached stories, module setup, and library but restores appearance, feed, gesture, and reading preferences.', confirmLabel: 'Reset', destructive: true, onConfirm: () => controller.reset() });

  return <Screen edges={['top']}>
    <ScreenHeader title="Settings" subtitle="Local, private, modular, and extensively configurable" />
    <ScrollView contentContainerStyle={styles.content}>
      <Section title="App composition">
        <Surface style={styles.group}>
          <SettingRow icon="grid-outline" title="Modules" detail={`${moduleConfiguration.enabled.length} of ${BUILTIN_MODULES.length} enabled · choose tabs, More, hidden modules, order, and home screen.`} onPress={() => router.push('/modules')} />
          <SettingRow icon="terminal-outline" title="Command palette" detail="Jump to any enabled module or common action." onPress={() => router.push('/command')} />
        </Surface>
      </Section>

      <Section title="Reading">
        <Surface style={styles.group}>
          <SettingRow icon="globe-outline" title="Open links" detail="Choose the system browser or an in-app browser sheet." />
          <Choice<LinkOpeningPreference> values={['system', 'in-app']} selected={preferences.openLinks} labels={{ system: 'System browser', 'in-app': 'In-app browser' }} onSelect={(openLinks) => update({ openLinks })} />
          {commentsEnabled ? <SettingRow icon="chatbubble-ellipses-outline" title="Preload comments" detail="Fetch discussion branches progressively when a story opens." value={preferences.preloadComments} onValueChange={(preloadComments) => update({ preloadComments })} /> : null}
          {algorithmsEnabled ? <SettingRow icon="analytics-outline" title="Show ranking explanations" detail="Expose the local factors that raised each story." value={preferences.showRankingExplanations} onValueChange={(showRankingExplanations) => update({ showRankingExplanations })} /> : null}
          <SettingRow icon="calculator-outline" title="Compact numbers" detail="Use 1.2k rather than 1,200 in dense interfaces." value={preferences.compactNumbers} onValueChange={(compactNumbers) => update({ compactNumbers })} />
        </Surface>
      </Section>

      <Section title="Default feed">
        <Choice<FeedKind> values={FEED_KINDS} selected={preferences.defaultFeed} labels={FEED_LABELS} onSelect={(defaultFeed) => update({ defaultFeed })} />
        <Surface style={styles.numberChoices}><ThemedText variant="meta" muted>Stories per refresh</ThemedText><Choice values={['60', '120', '200', '300'] as const} selected={String(preferences.feedLimit) as '60' | '120' | '200' | '300'} onSelect={(value) => update({ feedLimit: Number(value) })} /></Surface>
        <Surface style={styles.numberChoices}><ThemedText variant="meta" muted>Automatic refresh</ThemedText><Choice values={['0', '5', '10', '30'] as const} selected={String(preferences.autoRefreshMinutes) as '0' | '5' | '10' | '30'} labels={{ '0': 'Off', '5': '5 min', '10': '10 min', '30': '30 min' }} onSelect={(value) => update({ autoRefreshMinutes: Number(value) })} /></Surface>
        {algorithmsEnabled ? <Button label="Edit custom feed algorithms" icon="options-outline" variant="secondary" onPress={() => router.push('/presets')} /> : null}
        {automationEnabled ? <Button label="Edit filters and automation" icon="filter-outline" variant="secondary" onPress={() => router.push('/rules')} /> : null}
      </Section>

      <Section title="Appearance and accessibility">
        <Surface style={styles.group}>
          <SettingRow icon="contrast-outline" title="Color mode" detail="System appearance remains the default." />
          <Choice<ColorModePreference> values={['system', 'light', 'dark']} selected={preferences.colorMode} onSelect={(colorMode) => update({ colorMode })} />
          <SettingRow icon="eye-outline" title="High contrast" detail="Themes resolve through their high-contrast variants when available." value={preferences.highContrast} onValueChange={(highContrast) => update({ highContrast })} />
          <SettingRow icon="accessibility-outline" title="Reduce motion" />
          <Choice<AccessibilityOverride> values={['system', 'on', 'off']} selected={preferences.reduceMotion} onSelect={(reduceMotion) => update({ reduceMotion })} />
          <SettingRow icon="layers-outline" title="Reduce transparency" detail="Disables glass and blur when enabled." />
          <Choice<AccessibilityOverride> values={['system', 'on', 'off']} selected={preferences.reduceTransparency} onSelect={(reduceTransparency) => update({ reduceTransparency })} />
          <SettingRow icon="phone-portrait-outline" title="Haptics" detail="Subtle selection feedback for configured actions." value={preferences.hapticsEnabled} onValueChange={(hapticsEnabled) => update({ hapticsEnabled })} />
        </Surface>
      </Section>

      <Section title="Gesture controls" caption="Only actions owned by enabled modules are offered. Disabled actions remain saved and return when their module is restored.">
        {([
          ['Swipe left', 'swipeLeft'], ['Swipe right', 'swipeRight'], ['Long press', 'longPress'], ['Double tap', 'doubleTap']
        ] as const).map(([label, key]) => <Surface key={key} style={styles.gesture}><ThemedText variant="meta" muted>{label}</ThemedText><Choice values={gestureActions} selected={preferences.gestures[key]} onSelect={(action) => update({ gestures: { ...preferences.gestures, [key]: action } })} /></Surface>)}
      </Section>

      <Section title="Data and source">
        <Surface style={styles.group}>
          <SettingRow icon="cloud-offline-outline" title="No Mosaic account" detail="Stories, modules, themes, rules, notes, and reading history stay in your local SQLite database." />
          <SettingRow icon="download-outline" title="Import library JSON" detail="Merge a Mosaic HN version 1 export into this device." onPress={() => void importLibrary().catch((error) => Alert.alert('Import failed', error instanceof Error ? error.message : 'The file could not be imported'))} />
          <SettingRow icon="logo-github" title="Source code" detail="MIT licensed at github.com/yaportmax/mosaic-hn" onPress={() => void Linking.openURL('https://github.com/yaportmax/mosaic-hn')} />
          <SettingRow icon="document-text-outline" title="Open-source licenses" detail="All application code, module contracts, and bundled themes are inspectable." onPress={() => void Linking.openURL('https://github.com/yaportmax/mosaic-hn/blob/main/LICENSE')} />
          <SettingRow icon="refresh-outline" title="Reset preferences" detail={`Restores the ${DEFAULT_PREFERENCES.defaultFeed} feed, Mosaic theme, and default gestures without changing modules.`} destructive onPress={reset} />
        </Surface>
      </Section>
    </ScrollView>
  </Screen>;
}

const styles = StyleSheet.create({ content: { padding: 14, paddingBottom: 120, gap: 25 }, group: { paddingHorizontal: 14, paddingBottom: 12 }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, paddingHorizontal: 4, paddingBottom: 10 }, numberChoices: { padding: 12, gap: 8 }, gesture: { padding: 12, gap: 8 } });
