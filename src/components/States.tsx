import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeRuntime } from '../design/ThemeProvider.tsx';
import { foregroundFor } from '../design/contrast.ts';
import { Button } from './Button.tsx';
import { ThemedText } from './ThemedText.tsx';

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  const { theme } = useThemeRuntime();
  return <View style={styles.center}><ActivityIndicator color={theme.tokens.colors.accent} /><ThemedText variant="meta" muted>{label}</ThemedText></View>;
}

export function EmptyState({ icon = 'albums-outline', title, body, actionLabel, onAction }: { icon?: string; title: string; body: string; actionLabel?: string; onAction?: () => void }) {
  const { theme } = useThemeRuntime();
  return <View style={styles.center}><Ionicons name={icon as never} size={40} color={theme.tokens.colors.mutedText} /><ThemedText variant="headline" style={{ textAlign: 'center' }}>{title}</ThemedText><ThemedText muted style={{ textAlign: 'center', maxWidth: 360 }}>{body}</ThemedText>{actionLabel && onAction ? <Button label={actionLabel} onPress={onAction} /> : null}</View>;
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return <EmptyState icon="warning-outline" title="Could not load" body={message} actionLabel={onRetry ? 'Try again' : undefined} onAction={onRetry} />;
}

export function OfflineBanner() {
  const { theme } = useThemeRuntime();
  return <View style={[styles.banner, { backgroundColor: theme.tokens.colors.warning }]}><ThemedText variant="caption" style={{ color: foregroundFor(theme.tokens.colors.warning), fontWeight: '800' }}>Offline - showing saved data</ThemedText></View>;
}
const styles = StyleSheet.create({ center: { flex: 1, minHeight: 220, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 28 }, banner: { paddingHorizontal: 12, paddingVertical: 5, alignItems: 'center' } });
