import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePreferences } from '../app/AppServices.tsx';
import { useThemeRuntime } from '../design/ThemeProvider.tsx';
import { Surface } from './Surface.tsx';
import { ThemedText } from './ThemedText.tsx';

const routeNames = { feed: 'index', search: 'search', library: 'library', themes: 'themes', settings: 'settings' } as const;
interface TabRoute { key: string; name: string; params?: object }
interface TabState { index: number; routes: TabRoute[] }
interface TabNavigation {
  emit(event: { type: 'tabPress' | 'tabLongPress'; target: string; canPreventDefault?: boolean }): { defaultPrevented?: boolean };
  navigate(name: string, params?: object): void;
}

const metadata = {
  index: { label: 'Feed', icon: 'newspaper-outline', active: 'newspaper' },
  search: { label: 'Search', icon: 'search-outline', active: 'search' },
  library: { label: 'Library', icon: 'library-outline', active: 'library' },
  themes: { label: 'Themes', icon: 'color-palette-outline', active: 'color-palette' },
  settings: { label: 'Settings', icon: 'settings-outline', active: 'settings' }
} as const;

export function MosaicTabBar({ state, navigation }: { state: TabState; navigation: TabNavigation }) {
  const preferences = usePreferences();
  const { theme } = useThemeRuntime();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const sidebar = width >= 820 && theme.layout.shell === 'sidebar';
  const minimal = theme.layout.navigation === 'minimal';
  const floating = !sidebar && (theme.layout.shell === 'floating-tabs' || theme.layout.navigation === 'floating');
  const iconSize = sidebar ? 22 : minimal ? 24 : 21;
  const routes = preferences.tabOrder
    .map((key) => state.routes.find((route) => route.name === routeNames[key]))
    .filter((route): route is TabRoute => Boolean(route));
  const bar = <View style={[styles.bar, sidebar ? styles.sidebar : styles.bottom, minimal && !sidebar ? styles.minimalBar : null, sidebar ? { paddingTop: Math.max(insets.top, 14), paddingBottom: Math.max(insets.bottom, 14) } : { paddingBottom: Math.max(insets.bottom, 7), paddingTop: 7 }]}>{routes.map((route) => {
    const index = state.routes.findIndex((candidate) => candidate.key === route.key);
    const focused = state.index === index;
    const meta = metadata[route.name as keyof typeof metadata] ?? metadata.index;
    return <Pressable key={route.key} accessibilityRole="button" accessibilityState={{ selected: focused }} accessibilityLabel={meta.label} onPress={() => { const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true }); if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params); }} onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })} style={({ pressed }) => [styles.item, minimal && styles.minimalItem, sidebar && styles.sidebarItem, focused && { backgroundColor: `${theme.tokens.colors.accent}18` }, { opacity: pressed ? 0.62 : 1, borderRadius: Math.max(12, theme.tokens.shape.radius * 0.75) }]}>
      <Ionicons name={(focused ? meta.active : meta.icon) as never} size={iconSize} color={focused ? theme.tokens.colors.accent : theme.tokens.colors.mutedText} />
      {!minimal || sidebar ? <ThemedText variant="caption" numberOfLines={1} style={{ color: focused ? theme.tokens.colors.accent : theme.tokens.colors.mutedText, fontWeight: focused ? '800' : '600' }}>{meta.label}</ThemedText> : null}
    </Pressable>;
  })}</View>;
  if (floating) return <View pointerEvents="box-none" style={[styles.floatingWrap, { bottom: theme.layout.navigation === 'floating' ? 14 : 8 }]}><Surface interactive elevated style={styles.floating}>{bar}</Surface></View>;
  return <Surface style={[styles.standard, sidebar && styles.standardSidebar]}>{bar}</Surface>;
}

const styles = StyleSheet.create({ bar: { flexDirection: 'row', alignItems: 'center' }, bottom: { minHeight: 64, paddingHorizontal: 8 }, minimalBar: { minHeight: 52, paddingTop: 3, paddingBottom: 3 }, sidebar: { flex: 1, width: 106, flexDirection: 'column', gap: 8, paddingHorizontal: 9 }, item: { flex: 1, minHeight: 49, alignItems: 'center', justifyContent: 'center', gap: 3, paddingHorizontal: 4 }, minimalItem: { minHeight: 44, gap: 0 }, sidebarItem: { flex: 0, width: '100%', minHeight: 64 }, standard: { borderRadius: 0, borderLeftWidth: 0, borderRightWidth: 0, borderBottomWidth: 0 }, standardSidebar: { flex: 1, width: 106, borderTopWidth: 0, borderLeftWidth: 0, borderBottomWidth: 0 }, floatingWrap: { position: 'absolute', left: 12, right: 12 }, floating: { borderRadius: 24 }, });
