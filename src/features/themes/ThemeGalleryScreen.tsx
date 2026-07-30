import { useCallback, useEffect, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import type { ThemeRegistry, ThemeRegistryEntry } from '../../../theme-sdk/types.ts';
import type { ManagedTheme } from '../../design/theme-manager.ts';
import { downloadMarketplaceTheme, loadThemeRegistry } from '../../design/marketplace-runtime.ts';
import { useAppServices, usePreferences } from '../../app/AppServices.tsx';
import { pickTextFile } from '../../app/file-exchange.ts';
import { useThemeRuntime } from '../../design/ThemeProvider.tsx';
import { Screen } from '../../components/Screen.tsx';
import { ScreenHeader } from '../../components/Header.tsx';
import { Button, IconButton } from '../../components/Button.tsx';
import { EmptyState, LoadingState } from '../../components/States.tsx';
import { ThemePreview } from '../../components/ThemePreview.tsx';
import { ThemedText } from '../../components/ThemedText.tsx';
import { Section } from '../../components/Section.tsx';
import { Surface } from '../../components/Surface.tsx';

export function ThemeGalleryScreen() {
  const { themes, preferences: controller } = useAppServices();
  const preferences = usePreferences();
  const runtime = useThemeRuntime();
  const [catalog, setCatalog] = useState<ManagedTheme[]>([]);
  const [registry, setRegistry] = useState<ThemeRegistry | null>(null);
  const [registryUrl, setRegistryUrl] = useState(preferences.remoteThemeRegistryUrl);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCatalog = useCallback(async () => { setCatalog(await themes.list()); setLoading(false); }, [themes]);
  useEffect(() => { void loadCatalog(); }, [loadCatalog]);

  const importTheme = async () => {
    const file = await pickTextFile(['application/json', 'text/json', 'text/plain']);
    if (!file) return;
    const theme = await themes.importJson(file.text);
    await loadCatalog();
    Alert.alert('Theme installed', `${theme.manifest.name} is now available.`);
  };
  const loadRemote = async () => {
    const url = registryUrl.trim();
    if (!url) { setRegistry(null); await controller.update({ remoteThemeRegistryUrl: '' }); return; }
    setRefreshing(true); setError(null);
    try { const next = await loadThemeRegistry(url); setRegistry(next); await controller.update({ remoteThemeRegistryUrl: url }); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'The marketplace could not be loaded'); }
    finally { setRefreshing(false); }
  };
  const installRemote = async (entry: ThemeRegistryEntry) => {
    if (!registryUrl.trim()) return;
    try { const theme = await downloadMarketplaceTheme(entry, registryUrl.trim()); await themes.install(theme); await loadCatalog(); Alert.alert('Theme installed', theme.manifest.name); }
    catch (reason) { Alert.alert('Install failed', reason instanceof Error ? reason.message : 'The theme could not be installed'); }
  };

  return <Screen edges={['top']}>
    <ScreenHeader title="Themes" subtitle="Complete visual wrappers, safely declarative" actions={<><IconButton icon="add" label="Open theme studio" onPress={() => router.push('/theme/studio')} /><IconButton icon="download-outline" label="Import theme file" onPress={() => void importTheme().catch((reason) => Alert.alert('Import failed', reason.message))} /></>} />
    {loading ? <LoadingState label="Loading theme catalog…" /> : <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadCatalog()} />} contentContainerStyle={styles.content}>
      <Section title="Installed" caption={`${catalog.length} validated themes. Tap a preview for details and editing.`}><View style={styles.grid}>{catalog.map((entry) => {
        const active = preferences.activeThemeId === entry.theme.manifest.id;
        return <View key={entry.theme.manifest.id} style={styles.gridItem}><ThemePreview compact themePackage={entry.theme} active={active} onPress={() => router.push({ pathname: '/theme/[id]', params: { id: entry.theme.manifest.id } })} /><Button label={active ? 'Active' : 'Use theme'} variant={active ? 'secondary' : 'primary'} disabled={active} onPress={() => void runtime.selectTheme(entry.theme.manifest.id)} /></View>;
      })}</View></Section>
      <Section title="Community marketplace" caption="A public static registry. Packages are HTTPS-only, size-limited, schema-validated, and SHA-256 verified before installation.">
        <Surface style={styles.registry}><TextInput value={registryUrl} onChangeText={setRegistryUrl} placeholder="https://…/registry.json" placeholderTextColor={runtime.theme.tokens.colors.mutedText} autoCapitalize="none" autoCorrect={false} keyboardType="url" style={[styles.input, { color: runtime.theme.tokens.colors.text, borderColor: runtime.theme.tokens.colors.border }]} /><View style={styles.registryButtons}><Button label="Load registry" loading={refreshing} onPress={() => void loadRemote()} /><Button label="Clear" variant="ghost" onPress={() => { setRegistryUrl(''); setRegistry(null); void controller.update({ remoteThemeRegistryUrl: '' }); }} /></View>{error ? <ThemedText variant="meta" style={{ color: runtime.theme.tokens.colors.danger }}>{error}</ThemedText> : null}</Surface>
        {registry ? registry.themes.length ? <View style={styles.market}>{registry.themes.map((entry) => <Surface key={`${entry.id}@${entry.version}`} style={styles.marketRow}><View style={styles.marketCopy}><ThemedText variant="headline">{entry.name}</ThemedText><ThemedText variant="meta" muted>{entry.author} · v{entry.version}</ThemedText></View><Button label="Install" variant="secondary" onPress={() => void installRemote(entry)} /></Surface>)}</View> : <EmptyState title="Registry is empty" body="No themes were declared in this registry." /> : <Surface style={styles.marketInfo}><ThemedText variant="headline">No registry required</ThemedText><ThemedText muted>Bundled themes and local JSON imports work without any marketplace server. A community registry can be any static file hosted in a public repository.</ThemedText></Surface>}
      </Section>
    </ScrollView>}
  </Screen>;
}
const styles = StyleSheet.create({ content: { padding: 14, paddingBottom: 110, gap: 24 }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, gridItem: { flexGrow: 1, flexBasis: '46%', minWidth: 150, maxWidth: 240, gap: 7 }, registry: { padding: 14, gap: 10 }, input: { minHeight: 44, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontSize: 15 }, registryButtons: { flexDirection: 'row', gap: 8 }, market: { gap: 8 }, marketRow: { padding: 13, flexDirection: 'row', alignItems: 'center', gap: 10 }, marketCopy: { flex: 1 }, marketInfo: { padding: 15, gap: 6 } });
