import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import type { ThemePackage } from '../../../theme-sdk/types.ts';
import { useAppServices, usePreferences } from '../../app/AppServices.tsx';
import { confirmAction } from '../../app/dialogs.ts';
import { useThemeRuntime } from '../../design/ThemeProvider.tsx';
import { Screen } from '../../components/Screen.tsx';
import { DetailHeader } from '../../components/Header.tsx';
import { Button } from '../../components/Button.tsx';
import { LoadingState } from '../../components/States.tsx';
import { Section } from '../../components/Section.tsx';
import { ThemePreview } from '../../components/ThemePreview.tsx';
import { ThemedText } from '../../components/ThemedText.tsx';

export function ThemeDetailScreen({ id }: { id: string }) {
  const { themes } = useAppServices();
  const preferences = usePreferences();
  const runtime = useThemeRuntime();
  const [themePackage, setThemePackage] = useState<ThemePackage | null>(null);
  const [source, setSource] = useState<'builtin' | 'installed'>('builtin');
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    let mounted = true;
    void themes.list().then((entries) => {
      const entry = entries.find((item) => item.theme.manifest.id === id);
      if (mounted && entry) {
        setThemePackage(entry.theme);
        setSource(entry.source);
      }
    });
    return () => { mounted = false; };
  }, [themes, id]);

  if (!themePackage) return <Screen edges={['top']}><DetailHeader title="Theme" /><LoadingState label="Loading theme…" /></Screen>;
  const active = preferences.activeThemeId === themePackage.manifest.id;

  const apply = async () => {
    setApplying(true);
    try {
      await runtime.selectTheme(themePackage.manifest.id);
      router.back();
    } catch (reason) {
      Alert.alert('Could not apply theme', reason instanceof Error ? reason.message : 'Please try again.');
    } finally {
      setApplying(false);
    }
  };
  const remove = async () => {
    const removed = await themes.remove(themePackage.manifest.id);
    if (!removed) return;
    if (active) await runtime.selectTheme('org.mosaichn.mosaic');
    router.back();
  };

  return <Screen edges={['top']}>
    <DetailHeader title={themePackage.manifest.name} subtitle={`Designed by ${themePackage.manifest.author}`} />
    <ScrollView contentContainerStyle={styles.content}>
      <ThemePreview themePackage={themePackage} active={active} />
      {themePackage.manifest.description ? <Section title="About this look"><ThemedText>{themePackage.manifest.description}</ThemedText></Section> : null}
      <Button label={active ? 'Currently active' : 'Apply theme'} icon={active ? 'checkmark' : 'color-palette-outline'} disabled={active} loading={applying} onPress={() => void apply()} />
      <Button label="Customize this theme" icon="options-outline" variant="secondary" onPress={() => router.push({ pathname: '/theme/studio', params: { id: themePackage.manifest.id } })} />
      {source === 'installed' ? <Button label="Delete custom theme" variant="danger" onPress={() => confirmAction({ title: 'Delete custom theme?', message: 'This removes the theme from this device.', confirmLabel: 'Delete', destructive: true, onConfirm: remove })} /> : null}
    </ScrollView>
  </Screen>;
}

const styles = StyleSheet.create({ content: { padding: 14, paddingBottom: 80, gap: 20 } });
