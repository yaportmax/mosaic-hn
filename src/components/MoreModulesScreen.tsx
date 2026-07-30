import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useModuleConfiguration } from '../app/AppServices.tsx';
import { getMoreModules, getTabModules } from '../modules/runtime.ts';
import { Screen } from './Screen.tsx';
import { ScreenHeader } from './Header.tsx';
import { Surface } from './Surface.tsx';
import { ThemedText } from './ThemedText.tsx';
import { EmptyState } from './States.tsx';
import { Button } from './Button.tsx';
import { useThemeRuntime } from '../design/ThemeProvider.tsx';

export function MoreModulesScreen() {
  const configuration = useModuleConfiguration();
  const tabModules = getTabModules(configuration);
  const overflowTabs = tabModules.length > 5 || getMoreModules(configuration).length > 0 ? tabModules.slice(4) : [];
  const modules = [...overflowTabs, ...getMoreModules(configuration)];
  const { theme } = useThemeRuntime();
  return <Screen edges={['top']}>
    <ScreenHeader title="More" subtitle={`${modules.length} enabled module${modules.length === 1 ? '' : 's'}`} actions={<Button label="Customize" icon="grid-outline" variant="ghost" onPress={() => router.push('/modules')} />} />
    {modules.length === 0 ? <EmptyState icon="apps-outline" title="No modules here" body="Move modules into More from the module manager, or keep a minimal tab-only setup." actionLabel="Customize modules" onAction={() => router.push('/modules')} /> : <ScrollView contentContainerStyle={styles.content}>{overflowTabs.length ? <ThemedText variant="caption" muted>Phone navigation keeps four primary destinations visible. Additional enabled tabs appear here.</ThemedText> : null}{modules.map((module) => <Pressable key={module.id} accessibilityRole="button" accessibilityLabel={`Open ${module.name}`} onPress={() => module.route && router.replace(module.route)} style={({ pressed }) => ({ opacity: pressed ? 0.64 : 1 })}><Surface interactive style={styles.row}><View style={[styles.icon, { backgroundColor: `${theme.tokens.colors.accent}18` }]}><Ionicons name={module.icon as never} size={22} color={theme.tokens.colors.accent} /></View><View style={styles.copy}><ThemedText variant="headline">{module.name}</ThemedText><ThemedText variant="meta" muted>{module.description}</ThemedText></View><Ionicons name="chevron-forward" size={19} color={theme.tokens.colors.mutedText} /></Surface></Pressable>)}</ScrollView>}
  </Screen>;
}

const styles = StyleSheet.create({ content: { padding: 14, paddingBottom: 120, gap: 9 }, row: { minHeight: 76, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 12 }, icon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }, copy: { flex: 1, gap: 3 } });
