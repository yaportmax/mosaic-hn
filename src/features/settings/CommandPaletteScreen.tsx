import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { BUILTIN_MODULES } from '../../../module-sdk/registry.ts';
import { useAppServices, useModuleConfiguration, usePreferences } from '../../app/AppServices.tsx';
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
  const moduleConfiguration = useModuleConfiguration();
  const runtime = useThemeRuntime();
  const [query, setQuery] = useState('');
  const commands = useMemo<Command[]>(() => {
    const moduleCommands = BUILTIN_MODULES
      .filter((module) => module.kind === 'navigation' && module.id !== 'modules' && moduleConfiguration.enabled.includes(module.id) && module.route)
      .map((module) => ({
        id: `module-${module.id}`,
        navigates: true,
        title: `Open ${module.name}`,
        subtitle: module.description,
        icon: module.icon,
        keywords: module.keywords.join(' '),
        run: () => router.replace(module.id === 'modules' ? '/modules' : module.route ?? '/(tabs)')
      }));
    const utilityCommands: Command[] = [
      { id: 'modules-recovery', navigates: true, title: 'Customize modules', subtitle: 'Enable, disable, place, order, export, or import app modules', icon: 'grid-outline', keywords: 'customize app setup recovery', run: () => router.replace('/modules') }
    ];
    if (moduleConfiguration.enabled.includes('algorithms')) utilityCommands.push({ id: 'explain', title: preferences.showRankingExplanations ? 'Hide ranking explanations' : 'Show ranking explanations', subtitle: 'Toggle contribution details under feed stories', icon: 'analytics-outline', keywords: 'ranking why transparency', run: () => controller.update({ showRankingExplanations: !preferences.showRankingExplanations }) });
    if (moduleConfiguration.enabled.includes('themes')) {
      utilityCommands.push({ id: 'studio', navigates: true, title: 'Create a theme', subtitle: 'Open the complete theme studio', icon: 'brush-outline', keywords: 'edit visual layout color font', run: () => router.replace('/theme/studio') });
      utilityCommands.push(...BUILTIN_THEMES.map((theme) => ({ id: `theme-${theme.manifest.id}`, title: `Use ${theme.manifest.name}`, subtitle: `${theme.layout.feed} feed · ${theme.layout.comments} comments`, icon: 'color-wand-outline', keywords: `theme ${theme.manifest.name} ${theme.manifest.description ?? ''}`, run: () => runtime.selectTheme(theme.manifest.id) })));
    }
    return [...moduleCommands, ...utilityCommands];
  }, [controller, moduleConfiguration, preferences.showRankingExplanations, runtime]);
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
