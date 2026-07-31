import { useCallback, useEffect, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import type { ManagedTheme } from '../../design/theme-manager.ts';
import type { ColorModePreference } from '../../state/preferences.ts';
import { useAppServices, usePreferences } from '../../app/AppServices.tsx';
import { useThemeRuntime } from '../../design/ThemeProvider.tsx';
import { Screen } from '../../components/Screen.tsx';
import { ScreenHeader } from '../../components/Header.tsx';
import { Button } from '../../components/Button.tsx';
import { Chip } from '../../components/Chip.tsx';
import { LoadingState } from '../../components/States.tsx';
import { ThemePreview } from '../../components/ThemePreview.tsx';
import { Section } from '../../components/Section.tsx';
import { Surface } from '../../components/Surface.tsx';
import { ThemedText } from '../../components/ThemedText.tsx';

export function ThemeGalleryScreen() {
  const { themes, preferences: controller } = useAppServices();
  const preferences = usePreferences();
  const runtime = useThemeRuntime();
  const [catalog, setCatalog] = useState<ManagedTheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activatingId, setActivatingId] = useState<string | null>(null);

  const loadCatalog = useCallback(async () => {
    setCatalog(await themes.list());
    setLoading(false);
  }, [themes]);
  useEffect(() => { void loadCatalog(); }, [loadCatalog]);

  const activate = async (id: string, name: string) => {
    setActivatingId(id);
    try {
      await runtime.selectTheme(id);
      Alert.alert('Theme applied', `${name} is now active.`);
    } catch (reason) {
      Alert.alert('Could not apply theme', reason instanceof Error ? reason.message : 'Please try again.');
    } finally {
      setActivatingId(null);
    }
  };

  const setColorMode = (colorMode: ColorModePreference) => void controller.update({ colorMode });

  return <Screen edges={['top']}>
    <ScreenHeader title="Appearance" subtitle="Themes, colors, type, and layout" />
    {loading ? <LoadingState label="Loading themes…" /> : <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void (async () => { setRefreshing(true); await loadCatalog(); setRefreshing(false); })()} />} contentContainerStyle={styles.content}>
      <Section title="Light or dark">
        <Surface style={styles.mode}>
          <ThemedText variant="meta" muted>Follow the device or override it for Mosaic HN.</ThemedText>
          <View style={styles.modeChoices}>{(['system', 'light', 'dark'] as const).map((value) => <Chip key={value} label={value === 'system' ? 'Follow device' : value === 'light' ? 'Light' : 'Dark'} selected={preferences.colorMode === value} onPress={() => setColorMode(value)} />)}</View>
        </Surface>
      </Section>

      <Section title="Themes" caption="Tap a preview to see it larger. Applying a theme changes the app immediately.">
        <View style={styles.grid}>{catalog.map((entry) => {
          const active = preferences.activeThemeId === entry.theme.manifest.id;
          return <View key={entry.theme.manifest.id} style={styles.gridItem}>
            <ThemePreview compact themePackage={entry.theme} active={active} onPress={() => router.push({ pathname: '/theme/[id]', params: { id: entry.theme.manifest.id } })} />
            <Button label={active ? 'Active' : 'Apply'} variant={active ? 'secondary' : 'primary'} disabled={active} loading={activatingId === entry.theme.manifest.id} onPress={() => void activate(entry.theme.manifest.id, entry.theme.manifest.name)} />
          </View>;
        })}</View>
      </Section>

      <Button label="Create a custom theme" icon="color-palette-outline" onPress={() => router.push('/theme/studio')} />
    </ScrollView>}
  </Screen>;
}

const styles = StyleSheet.create({
  content: { padding: 14, paddingBottom: 110, gap: 24 },
  mode: { padding: 14, gap: 10 },
  modeChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gridItem: { flexGrow: 1, flexBasis: '46%', minWidth: 150, maxWidth: 240, gap: 7 }
});
