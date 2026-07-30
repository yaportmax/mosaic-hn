import { ScrollView, StyleSheet, View } from 'react-native';
import type { ReactNode } from 'react';
import { router } from 'expo-router';
import { IconButton } from './Button.tsx';
import { ThemedText } from './ThemedText.tsx';

export function ScreenHeader({ title, subtitle, actions, large = true }: { title: string; subtitle?: string; actions?: ReactNode; large?: boolean }) {
  return <View style={styles.header}><View style={styles.copy}><ThemedText variant={large ? 'display' : 'title'} numberOfLines={1}>{title}</ThemedText>{subtitle ? <ThemedText variant="meta" muted numberOfLines={1}>{subtitle}</ThemedText> : null}</View><View style={styles.actions}>{actions}<IconButton icon="terminal-outline" label="Open command palette" onPress={() => router.push('/command')} /></View></View>;
}

export function DetailHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return <View style={styles.header}><IconButton icon="chevron-back" label="Go back" onPress={() => router.back()} /><View style={styles.copy}><ThemedText variant="headline" numberOfLines={1}>{title}</ThemedText>{subtitle ? <ThemedText variant="caption" muted numberOfLines={1}>{subtitle}</ThemedText> : null}</View><View style={styles.actions}>{actions}</View></View>;
}

export function HorizontalControls({ children }: { children: ReactNode }) {
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.controlsRail} contentContainerStyle={styles.controls}>{children}</ScrollView>;
}
const styles = StyleSheet.create({
  header: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 6,
    gap: 10,
  },
  copy: { flex: 1, minWidth: 0 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  controlsRail: { flexGrow: 0, flexShrink: 0, height: 44 },
  controls: { alignItems: 'center', paddingHorizontal: 12, paddingTop: 2, paddingBottom: 8, gap: 6 },
});
