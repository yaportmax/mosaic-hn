import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useModuleConfiguration } from '../app/AppServices.tsx';
import { getMoreModules, getTabModules } from '../modules/runtime.ts';
import { useThemeRuntime } from '../design/ThemeProvider.tsx';
import { Surface } from './Surface.tsx';
import { ThemedText } from './ThemedText.tsx';

interface TabRoute { key: string; name: string; params?: object }
interface TabState { index: number; routes: TabRoute[] }
interface TabNavigation {
  emit(event: { type: 'tabPress' | 'tabLongPress'; target: string; canPreventDefault?: boolean }): { defaultPrevented?: boolean };
  navigate(name: string, params?: object): void;
}
interface TabEntry { id: string; label: string; icon: string; activeIcon: string; route: TabRoute; memberRoutes: readonly string[] }

export function MosaicTabBar({ state, navigation }: { state: TabState; navigation: TabNavigation }) {
  const configuration = useModuleConfiguration();
  const { theme } = useThemeRuntime();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const sidebar = width >= 820 && theme.layout.shell === 'sidebar';
  const minimal = theme.layout.navigation === 'minimal';
  const floating = !sidebar && (theme.layout.shell === 'floating-tabs' || theme.layout.navigation === 'floating');
  const iconSize = sidebar ? 22 : minimal ? 24 : 21;
  const tabModules = getTabModules(configuration);
  const moreModules = getMoreModules(configuration);
  const entries: TabEntry[] = tabModules.flatMap((module) => {
    const route = state.routes.find((candidate) => candidate.name === module.tabRoute);
    return route ? [{ id: module.id, label: module.shortName, icon: module.icon, activeIcon: module.activeIcon, route, memberRoutes: [route.name] }] : [];
  });
  const moreRoute = state.routes.find((route) => route.name === 'more');
  if (moreRoute && moreModules.length > 0) entries.push({ id: 'more', label: 'More', icon: 'ellipsis-horizontal-circle-outline', activeIcon: 'ellipsis-horizontal-circle', route: moreRoute, memberRoutes: ['more', ...moreModules.flatMap((module) => module.tabRoute ? [module.tabRoute] : [])] });
  const currentRoute = state.routes[state.index]?.name ?? '';
  const scrollable = !sidebar && entries.length > 5;

  const barContent = <View style={[styles.bar, sidebar ? styles.sidebar : styles.bottom, minimal && !sidebar ? styles.minimalBar : null, sidebar ? { paddingTop: Math.max(insets.top, 14), paddingBottom: Math.max(insets.bottom, 14) } : { paddingBottom: Math.max(insets.bottom, 7), paddingTop: 7 }]}>{entries.map((entry) => {
    const routeIndex = state.routes.findIndex((candidate) => candidate.key === entry.route.key);
    const focused = entry.memberRoutes.includes(currentRoute);
    return <Pressable key={entry.id} accessibilityRole="button" accessibilityState={{ selected: focused }} accessibilityLabel={entry.label} onPress={() => { const event = navigation.emit({ type: 'tabPress', target: entry.route.key, canPreventDefault: true }); if ((state.index !== routeIndex || entry.id === 'more') && !event.defaultPrevented) navigation.navigate(entry.route.name, entry.route.params); }} onLongPress={() => navigation.emit({ type: 'tabLongPress', target: entry.route.key })} style={({ pressed }) => [styles.item, scrollable && styles.scrollItem, minimal && styles.minimalItem, sidebar && styles.sidebarItem, focused && { backgroundColor: `${theme.tokens.colors.accent}18` }, { opacity: pressed ? 0.62 : 1, borderRadius: Math.max(12, theme.tokens.shape.radius * 0.75) }]}>
      <Ionicons name={(focused ? entry.activeIcon : entry.icon) as never} size={iconSize} color={focused ? theme.tokens.colors.accent : theme.tokens.colors.mutedText} />
      {!minimal || sidebar ? <ThemedText variant="caption" numberOfLines={1} style={{ color: focused ? theme.tokens.colors.accent : theme.tokens.colors.mutedText, fontWeight: focused ? '800' : '600' }}>{entry.label}</ThemedText> : null}
    </Pressable>;
  })}</View>;
  const bar = scrollable ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>{barContent}</ScrollView> : barContent;
  if (floating) return <View pointerEvents="box-none" style={[styles.floatingWrap, { bottom: theme.layout.navigation === 'floating' ? 14 : 8 }]}><Surface interactive elevated style={styles.floating}>{bar}</Surface></View>;
  return <Surface style={[styles.standard, sidebar && styles.standardSidebar]}>{bar}</Surface>;
}

const styles = StyleSheet.create({ bar: { flexDirection: 'row', alignItems: 'center' }, bottom: { minHeight: 64, paddingHorizontal: 8 }, minimalBar: { minHeight: 52, paddingTop: 3, paddingBottom: 3 }, sidebar: { flex: 1, width: 106, flexDirection: 'column', gap: 8, paddingHorizontal: 9 }, item: { flex: 1, minHeight: 49, alignItems: 'center', justifyContent: 'center', gap: 3, paddingHorizontal: 4 }, scrollItem: { flex: 0, minWidth: 74 }, minimalItem: { minHeight: 44, gap: 0 }, sidebarItem: { flex: 0, width: '100%', minHeight: 64 }, scrollContent: { flexGrow: 1 }, standard: { borderRadius: 0, borderLeftWidth: 0, borderRightWidth: 0, borderBottomWidth: 0 }, standardSidebar: { flex: 1, width: 106, borderTopWidth: 0, borderLeftWidth: 0, borderBottomWidth: 0 }, floatingWrap: { position: 'absolute', left: 12, right: 12 }, floating: { borderRadius: 24 } });
