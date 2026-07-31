import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeRuntime } from '../design/ThemeProvider.tsx';
import { Surface } from './Surface.tsx';
import { ThemedText } from './ThemedText.tsx';

interface TabRoute { key: string; name: string; params?: object }
interface TabState { index: number; routes: TabRoute[] }
interface TabNavigation {
  emit(event: { type: 'tabPress' | 'tabLongPress'; target: string; canPreventDefault?: boolean }): { defaultPrevented?: boolean };
  navigate(name: string, params?: object): void;
}
interface TabEntry { id: string; label: string; icon: string; activeIcon: string; route: TabRoute }

const PRIMARY_TABS = [
  { id: 'feed', routeName: 'index', label: 'Feed', icon: 'newspaper-outline', activeIcon: 'newspaper' },
  { id: 'search', routeName: 'search', label: 'Search', icon: 'search-outline', activeIcon: 'search' },
  { id: 'library', routeName: 'library', label: 'Library', icon: 'library-outline', activeIcon: 'library' },
  { id: 'settings', routeName: 'settings', label: 'Settings', icon: 'settings-outline', activeIcon: 'settings' }
] as const;

export function MosaicTabBar({ state, navigation }: { state: TabState; navigation: TabNavigation }) {
  const { theme } = useThemeRuntime();
  const insets = useSafeAreaInsets();
  const glass = theme.tokens.effects.glass;
  const entries: TabEntry[] = PRIMARY_TABS.flatMap((entry) => {
    const route = state.routes.find((candidate) => candidate.name === entry.routeName);
    return route ? [{ id: entry.id, label: entry.label, icon: entry.icon, activeIcon: entry.activeIcon, route }] : [];
  });
  const currentRoute = state.routes[state.index]?.name ?? '';

  const bar = <View style={styles.bar}>{entries.map((entry) => {
    const routeIndex = state.routes.findIndex((candidate) => candidate.key === entry.route.key);
    const focused = currentRoute === entry.route.name || (entry.id === 'settings' && !PRIMARY_TABS.some((tab) => tab.routeName === currentRoute));
    return <Pressable key={entry.id} accessibilityRole="button" accessibilityState={{ selected: focused }} accessibilityLabel={entry.label} onPress={() => { const event = navigation.emit({ type: 'tabPress', target: entry.route.key, canPreventDefault: true }); if (state.index !== routeIndex && !event.defaultPrevented) navigation.navigate(entry.route.name, entry.route.params); }} onLongPress={() => navigation.emit({ type: 'tabLongPress', target: entry.route.key })} style={({ pressed }) => [styles.item, focused && { backgroundColor: `${theme.tokens.colors.accent}18` }, { opacity: pressed ? 0.62 : 1, borderRadius: Math.max(12, theme.tokens.shape.radius * 0.68) }]}>
      <Ionicons name={(focused ? entry.activeIcon : entry.icon) as never} size={21} color={focused ? theme.tokens.colors.accent : theme.tokens.colors.mutedText} />
      <ThemedText variant="caption" numberOfLines={1} style={{ color: focused ? theme.tokens.colors.accent : theme.tokens.colors.mutedText, fontWeight: focused ? '800' : '600' }}>{entry.label}</ThemedText>
    </Pressable>;
  })}</View>;
  if (glass) return <View pointerEvents="box-none" style={[styles.glassWrap, { paddingBottom: Math.max(insets.bottom, 8) }]}><Surface interactive elevated style={styles.glassBar}>{bar}</Surface></View>;
  return <Surface style={[styles.standard, { paddingBottom: Math.max(insets.bottom, 7) }]}>{bar}</Surface>;
}

const styles = StyleSheet.create({
  bar: { minHeight: 62, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingTop: 6 },
  item: { flex: 1, minHeight: 50, alignItems: 'center', justifyContent: 'center', gap: 3, paddingHorizontal: 4 },
  standard: { borderRadius: 0, borderLeftWidth: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  glassWrap: { paddingHorizontal: 10, paddingTop: 7, backgroundColor: 'transparent' },
  glassBar: { borderRadius: 26 }
});
