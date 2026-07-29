import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAppServices, usePreferences } from '../../app/AppServices.tsx';
import { BUILTIN_THEMES } from '../../design/builtins.ts';
import { Screen } from '../../components/Screen.tsx';
import { DetailHeader } from '../../components/Header.tsx';
import { Surface } from '../../components/Surface.tsx';
import { ThemedText } from '../../components/ThemedText.tsx';
import { useThemeRuntime } from '../../design/ThemeProvider.tsx';

interface Command { id: string; title: string; subtitle: string; icon: string; keywords: string; navigates?: boolean; run(): void | Promise<void> }

export function CommandPaletteScreen() {
  const { preferences: controller } = useAppServices();
  const preferences = usePreferences();
  const runtime = useThemeRuntime();
  const [query, setQuery] = useState('');
  const commands = useMemo<Command[]>(() => [
    { id: 'feed', navigates: true, title: 'Open feed', subtitle: 'Top, New, Best, Ask, Show, and Jobs', icon: 'newspaper-outline', keywords: 'home top new best ask show jobs', run: () => router.replace('/(tabs)') },
    { id: 'search', navigates: true, title: 'Search local archive', subtitle: 'Stories, comments, authors, and domains', icon: 'search-outline', keywords: 'find local fts', run: () => router.replace('/(tabs)/search') },
    { id: 'library', navigates: true, title: 'Open library', subtitle: 'Bookmarks, queue, comments, and collections', icon: 'library-outline', keywords: 'saved bookmarks queue collection', run: () => router.replace('/(tabs)/library') },
    { id: 'archive', navigates: true, title: 'Open local time travel', subtitle: 'Feed snapshots captured by this installation', icon: 'calendar-outline', keywords: 'archive history date past snapshot', run: () => router.replace('/archive') },
    { id: 'themes', navigates: true, title: 'Open themes', subtitle: 'Installed themes and community registry', icon: 'color-palette-outline', keywords: 'appearance marketplace skin', run: () => router.replace('/(tabs)/themes') },
    { id: 'studio', navigates: true, title: 'Create a theme', subtitle: 'Open the complete theme studio', icon: 'brush-outline', keywords: 'edit visual layout color font', run: () => router.replace('/theme/studio') },
    { id: 'presets', navigates: true, title: 'Edit feed algorithms', subtitle: 'Local ranking weights and preferences', icon: 'options-outline', keywords: 'ranking custom feed algorithm', run: () => router.replace('/presets') },
    { id: 'rules', navigates: true, title: 'Edit filters and automation', subtitle: 'Hide, boost, queue, save, and tag', icon: 'filter-outline', keywords: 'rule automation block mute', run: () => router.replace('/rules') },
    { id: 'settings', navigates: true, title: 'Open settings', subtitle: 'Gestures, accessibility, data, and navigation', icon: 'settings-outline', keywords: 'preferences control', run: () => router.replace('/(tabs)/settings') },
    { id: 'explain', title: preferences.showRankingExplanations ? 'Hide ranking explanations' : 'Show ranking explanations', subtitle: 'Toggle contribution details under feed stories', icon: 'analytics-outline', keywords: 'ranking why transparency', run: () => controller.update({ showRankingExplanations: !preferences.showRankingExplanations }) },
    ...BUILTIN_THEMES.map((theme) => ({ id: `theme-${theme.manifest.id}`, title: `Use ${theme.manifest.name}`, subtitle: `${theme.layout.feed} feed · ${theme.layout.comments} comments`, icon: 'color-wand-outline', keywords: `theme ${theme.manifest.name} ${theme.manifest.description ?? ''}`, run: () => runtime.selectTheme(theme.manifest.id) }))
  ], [controller, preferences.showRankingExplanations, runtime]);
  const normalized = query.trim().toLowerCase();
  const visible = commands.filter((command) => !normalized || `${command.title} ${command.subtitle} ${command.keywords}`.toLowerCase().includes(normalized));
  const run = async (command: Command) => { await command.run(); if (!command.navigates && router.canGoBack()) router.back(); };
  return <Screen edges={['top']}>
    <DetailHeader title="Command palette" subtitle={`${visible.length} available commands`} />
    <View style={[styles.search, { backgroundColor: runtime.theme.tokens.colors.surface, borderColor: runtime.theme.tokens.colors.border }]}><Ionicons name="search" size={20} color={runtime.theme.tokens.colors.mutedText} /><TextInput autoFocus value={query} onChangeText={setQuery} placeholder="Type a command…" placeholderTextColor={runtime.theme.tokens.colors.mutedText} style={[styles.input, { color: runtime.theme.tokens.colors.text }]} /></View>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">{visible.map((command) => <Pressable key={command.id} accessibilityRole="button" onPress={() => void run(command)} style={({ pressed }) => ({ opacity: pressed ? 0.64 : 1 })}><Surface style={styles.command}><View style={[styles.icon, { backgroundColor: `${runtime.theme.tokens.colors.accent}18` }]}><Ionicons name={command.icon as never} size={20} color={runtime.theme.tokens.colors.accent} /></View><View style={styles.copy}><ThemedText variant="headline">{command.title}</ThemedText><ThemedText variant="meta" muted>{command.subtitle}</ThemedText></View></Surface></Pressable>)}</ScrollView>
  </Screen>;
}
const styles = StyleSheet.create({ search: { marginHorizontal: 14, marginBottom: 8, minHeight: 48, borderWidth: 1, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12 }, input: { flex: 1, fontSize: 16, paddingVertical: 10 }, content: { padding: 14, paddingBottom: 70, gap: 8 }, command: { minHeight: 68, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }, icon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' }, copy: { flex: 1, gap: 2 } });
