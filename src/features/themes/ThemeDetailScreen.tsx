import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import type { ThemePackage } from '../../../theme-sdk/types.ts';
import { useAppServices, usePreferences } from '../../app/AppServices.tsx';
import { shareTextFile } from '../../app/file-exchange.ts';
import { useThemeRuntime } from '../../design/ThemeProvider.tsx';
import { Screen } from '../../components/Screen.tsx';
import { DetailHeader } from '../../components/Header.tsx';
import { Button } from '../../components/Button.tsx';
import { EmptyState, LoadingState } from '../../components/States.tsx';
import { Section } from '../../components/Section.tsx';
import { Surface } from '../../components/Surface.tsx';
import { ThemePreview } from '../../components/ThemePreview.tsx';
import { ThemedText } from '../../components/ThemedText.tsx';

export function ThemeDetailScreen({ id }: { id: string }) {
  const { themes } = useAppServices();
  const preferences = usePreferences();
  const runtime = useThemeRuntime();
  const [themePackage, setThemePackage] = useState<ThemePackage | null>(null);
  const [source, setSource] = useState<'builtin' | 'installed'>('builtin');
  useEffect(() => { let active = true; void themes.list().then((entries) => { const entry = entries.find((item) => item.theme.manifest.id === id); if (active && entry) { setThemePackage(entry.theme); setSource(entry.source); } }); return () => { active = false; }; }, [themes, id]);
  if (!themePackage) return <Screen edges={['top']}><DetailHeader title="Theme" /><LoadingState label="Loading theme…" /></Screen>;
  const active = preferences.activeThemeId === themePackage.manifest.id;
  const remove = async () => {
    const removed = await themes.remove(themePackage.manifest.id);
    if (!removed) return;
    if (active) await runtime.selectTheme('org.mosaichn.mosaic');
    router.back();
  };
  return <Screen edges={['top']}>
    <DetailHeader title={themePackage.manifest.name} subtitle={`${themePackage.manifest.author} · v${themePackage.manifest.version}`} />
    <ScrollView contentContainerStyle={styles.content}>
      <ThemePreview themePackage={themePackage} active={active} />
      <View style={styles.actions}><Button label={active ? 'Active theme' : 'Use theme'} icon={active ? 'checkmark' : 'color-palette-outline'} onPress={() => void runtime.selectTheme(themePackage.manifest.id)} /><Button label="Edit a copy" icon="options-outline" variant="secondary" onPress={() => router.push({ pathname: '/theme/studio', params: { id: themePackage.manifest.id } })} /><Button label="Export JSON" icon="share-outline" variant="secondary" onPress={() => void themes.exportJson(themePackage.manifest.id).then((json) => shareTextFile(`${themePackage.manifest.name.toLowerCase().replace(/\s+/g, '-')}.mosaic-theme.json`, json, 'application/json')).catch((reason) => Alert.alert('Export failed', reason.message))} /></View>
      <Section title="Package"><Surface style={styles.details}><Detail label="Identifier" value={themePackage.manifest.id} /><Detail label="License" value={themePackage.manifest.license} /><Detail label="Minimum app" value={themePackage.manifest.minAppVersion} /><Detail label="Shell" value={themePackage.layout.shell} /><Detail label="Feed" value={themePackage.layout.feed} /><Detail label="Story" value={themePackage.layout.story} /><Detail label="Comments" value={themePackage.layout.comments} /><Detail label="Navigation" value={themePackage.layout.navigation} /></Surface></Section>
      {themePackage.manifest.description ? <Section title="Description"><ThemedText>{themePackage.manifest.description}</ThemedText></Section> : null}
      {source === 'installed' ? <Button label="Remove community theme" variant="danger" onPress={() => Alert.alert('Remove theme?', 'The JSON package will be deleted from this device.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: () => void remove() }])} /> : null}
    </ScrollView>
  </Screen>;
}
function Detail({ label, value }: { label: string; value: string }) { return <View style={styles.detail}><ThemedText variant="meta" muted>{label}</ThemedText><ThemedText variant="meta" style={{ flex: 1, textAlign: 'right' }}>{value}</ThemedText></View>; }
const styles = StyleSheet.create({ content: { padding: 14, paddingBottom: 80, gap: 20 }, actions: { gap: 8 }, details: { paddingHorizontal: 14 }, detail: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(127,127,127,0.25)' } });
