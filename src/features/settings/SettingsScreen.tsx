import { Alert, Linking, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useAppServices, useModuleConfiguration, usePreferences } from '../../app/AppServices.tsx';
import { pickTextFile } from '../../app/file-exchange.ts';
import { confirmAction } from '../../app/dialogs.ts';
import { importLibraryJson } from '../../core/exports.ts';
import type { FeedKind } from '../../core/models.ts';
import { FEED_KINDS } from '../../core/models.ts';
import { FEED_LABELS } from '../../core/format.ts';
import type { AccessibilityOverride, GestureAction } from '../../state/preferences.ts';
import { DEFAULT_PREFERENCES } from '../../state/preferences.ts';
import { Screen } from '../../components/Screen.tsx';
import { ScreenHeader } from '../../components/Header.tsx';
import { Section } from '../../components/Section.tsx';
import { SettingRow } from '../../components/SettingRow.tsx';
import { Chip } from '../../components/Chip.tsx';
import { Surface } from '../../components/Surface.tsx';
import { ThemedText } from '../../components/ThemedText.tsx';

function Choice<T extends string>({ values, selected, labels, onSelect }: { values: readonly T[]; selected: T; labels?: Partial<Record<T, string>>; onSelect(value: T): void }) {
  return <View style={styles.chips}>{values.map((value) => <Chip key={value} compact label={labels?.[value] ?? value} selected={value === selected} onPress={() => onSelect(value)} />)}</View>;
}

const GESTURE_LABELS: Partial<Record<GestureAction, string>> = {
  none: 'None',
  open: 'Open story',
  save: 'Save',
  queue: 'Read later',
  share: 'Share',
  hide: 'Hide'
};

export function SettingsScreen() {
  const preferences = usePreferences();
  const moduleConfiguration = useModuleConfiguration();
  const { preferences: controller, database } = useAppServices();
  const commentsEnabled = moduleConfiguration.enabled.includes('comments');
  const automationEnabled = moduleConfiguration.enabled.includes('automation');
  const libraryEnabled = moduleConfiguration.enabled.includes('library');
  const gestureActions: GestureAction[] = ['none', 'open', ...(libraryEnabled ? ['save', 'queue'] as const : []), 'share', ...(automationEnabled ? ['hide'] as const : [])];
  const update = (patch: Parameters<typeof controller.update>[0]) => void controller.update(patch);

  const importLibrary = async () => {
    const file = await pickTextFile(['application/json', 'text/json', 'text/plain']);
    if (!file) return;
    const payload = importLibraryJson(file.text);
    await database.repository.importLibrary(payload);
    Alert.alert('Import complete', `${payload.bookmarks.length} saved stories and ${payload.queue.length} read-later stories were restored.`);
  };

  const reset = () => confirmAction({
    title: 'Reset preferences?',
    message: 'This keeps your saved stories and reading history but restores the default theme, feed, gestures, and reading preferences.',
    confirmLabel: 'Reset',
    destructive: true,
    onConfirm: () => controller.reset()
  });

  return <Screen edges={['top']}>
    <ScreenHeader title="Settings" subtitle="Reading, appearance, accessibility, and privacy" />
    <ScrollView contentContainerStyle={styles.content}>
      <Section title="Appearance">
        <Surface style={styles.group}>
          <SettingRow icon="color-palette-outline" title="Themes and colors" detail="Choose a theme or customize colors, type, spacing, and layout with a live preview." onPress={() => router.push('/themes')} />
        </Surface>
      </Section>

      <Section title="Reading">
        <Surface style={styles.group}>
          {commentsEnabled ? <SettingRow icon="chatbubble-ellipses-outline" title="Load discussions" detail="Load Hacker News comments when a story opens." value={preferences.preloadComments} onValueChange={(preloadComments) => update({ preloadComments })} /> : null}
          <SettingRow icon="calculator-outline" title="Compact numbers" detail="Show 1.2k instead of 1,200." value={preferences.compactNumbers} onValueChange={(compactNumbers) => update({ compactNumbers })} />
        </Surface>
      </Section>

      <Section title="Default feed">
        <Choice<FeedKind> values={FEED_KINDS} selected={preferences.defaultFeed} labels={FEED_LABELS} onSelect={(defaultFeed) => update({ defaultFeed })} />
        <Surface style={styles.numberChoices}><ThemedText variant="meta" muted>Stories per refresh</ThemedText><Choice values={['60', '120', '200', '300'] as const} selected={String(preferences.feedLimit) as '60' | '120' | '200' | '300'} onSelect={(value) => update({ feedLimit: Number(value) })} /></Surface>
        <Surface style={styles.numberChoices}><ThemedText variant="meta" muted>Refresh automatically</ThemedText><Choice values={['0', '5', '10', '30'] as const} selected={String(preferences.autoRefreshMinutes) as '0' | '5' | '10' | '30'} labels={{ '0': 'Off', '5': '5 min', '10': '10 min', '30': '30 min' }} onSelect={(value) => update({ autoRefreshMinutes: Number(value) })} /></Surface>
        <Surface style={styles.group}><SettingRow icon="options-outline" title="Customize feed ranking" detail="Choose how age, points, comments, trends, sources, and keywords affect the order." onPress={() => router.push('/presets')} /></Surface>
      </Section>

      <Section title="Accessibility" caption="These options override the selected theme when needed.">
        <Surface style={styles.group}>
          <SettingRow icon="eye-outline" title="High contrast" detail="Increase contrast while keeping the current theme." value={preferences.highContrast} onValueChange={(highContrast) => update({ highContrast })} />
          <SettingRow icon="accessibility-outline" title="Reduce motion" />
          <Choice<AccessibilityOverride> values={['system', 'on', 'off']} selected={preferences.reduceMotion} labels={{ system: 'Follow device', on: 'On', off: 'Off' }} onSelect={(reduceMotion) => update({ reduceMotion })} />
          <SettingRow icon="layers-outline" title="Reduce transparency" detail="Use solid backgrounds instead of blur and glass effects." />
          <Choice<AccessibilityOverride> values={['system', 'on', 'off']} selected={preferences.reduceTransparency} labels={{ system: 'Follow device', on: 'On', off: 'Off' }} onSelect={(reduceTransparency) => update({ reduceTransparency })} />
          <SettingRow icon="phone-portrait-outline" title="Haptics" detail="Give subtle feedback after supported actions." value={preferences.hapticsEnabled} onValueChange={(hapticsEnabled) => update({ hapticsEnabled })} />
        </Surface>
      </Section>

      <Section title="Gesture shortcuts" caption="Read later saves a story in Library so you can return to it.">
        {([
          ['Swipe left', 'swipeLeft'], ['Swipe right', 'swipeRight'], ['Long press', 'longPress'], ['Double tap', 'doubleTap']
        ] as const).map(([label, key]) => <Surface key={key} style={styles.gesture}><ThemedText variant="meta" muted>{label}</ThemedText><Choice values={gestureActions} selected={preferences.gestures[key]} labels={GESTURE_LABELS} onSelect={(action) => update({ gestures: { ...preferences.gestures, [key]: action } })} /></Surface>)}
      </Section>

      <Section title="Hacker News account">
        <Surface style={styles.group}>
          <SettingRow icon="person-circle-outline" title="Open Hacker News sign-in" detail="Reading works without an account. HN sign-in, voting, and posting happen on news.ycombinator.com because its public API is read-only." onPress={() => void Linking.openURL('https://news.ycombinator.com/login')} />
        </Surface>
      </Section>

      <Section title="Data and privacy">
        <Surface style={styles.group}>
          <SettingRow icon="shield-checkmark-outline" title="Stored on this device" detail="Saved stories, reading history, preferences, and custom themes stay local." />
          <SettingRow icon="download-outline" title="Import saved data" detail="Restore a Mosaic HN library export on this device." onPress={() => void importLibrary().catch((error) => Alert.alert('Import failed', error instanceof Error ? error.message : 'The file could not be imported'))} />
          <SettingRow icon="logo-github" title="View source code" detail="Inspect Mosaic HN on GitHub." onPress={() => void Linking.openURL('https://github.com/yaportmax/mosaic-hn')} />
          <SettingRow icon="refresh-outline" title="Reset preferences" detail={`Restore the ${DEFAULT_PREFERENCES.defaultFeed} feed, default theme, and default gestures.`} destructive onPress={reset} />
        </Surface>
      </Section>
    </ScrollView>
  </Screen>;
}

const styles = StyleSheet.create({
  content: { padding: 14, paddingBottom: 120, gap: 25 },
  group: { paddingHorizontal: 14, paddingBottom: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, paddingHorizontal: 4, paddingBottom: 10 },
  numberChoices: { padding: 12, gap: 8 },
  gesture: { padding: 12, gap: 8 }
});
