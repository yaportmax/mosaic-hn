import { StyleSheet, View, type ViewProps } from 'react-native';
import { ThemedText } from './ThemedText.tsx';

export function Section({ title, caption, children, style }: ViewProps & { title?: string; caption?: string }) {
  return <View style={[styles.section, style]}>{title ? <ThemedText variant="headline">{title}</ThemedText> : null}{caption ? <ThemedText variant="meta" muted>{caption}</ThemedText> : null}<View style={styles.body}>{children}</View></View>;
}
const styles = StyleSheet.create({ section: { gap: 6 }, body: { gap: 10, marginTop: 6 } });
