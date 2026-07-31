import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ThemePackage } from '../../theme-sdk/types.ts';
import { useThemeRuntime } from '../design/ThemeProvider.tsx';
import { fontFamilyFor } from './ThemedText.tsx';

export function ThemePreview({ themePackage, active = false, onPress, compact = false, scheme }: { themePackage: ThemePackage; active?: boolean; onPress?: () => void; compact?: boolean; scheme?: 'light' | 'dark' }) {
  const runtime = useThemeRuntime();
  const tokens = (scheme ?? runtime.theme.sourceScheme) === 'dark' ? (themePackage.tokens.dark ?? themePackage.tokens.light) : themePackage.tokens.light;
  const feedLayout = themePackage.layout.feed;
  const rowCount = compact ? 2 : feedLayout === 'compact' ? 4 : 3;
  const rowHeight = compact ? 27 : feedLayout === 'compact' ? 29 : feedLayout === 'comfortable' ? 40 : feedLayout === 'magazine' ? 48 : 44;
  const fontFamily = fontFamilyFor(tokens.typography.fontFamily);
  const glass = tokens.effects.glass;

  const preview = <View style={[styles.shell, {
    padding: compact ? 9 : 13,
    gap: compact ? 6 : 8,
    backgroundColor: tokens.colors.background,
    borderColor: active ? tokens.colors.accent : tokens.colors.border,
    borderWidth: active ? 2 : Math.max(1, tokens.shape.borderWidth),
    borderRadius: Math.max(12, tokens.shape.radius)
  }]}>
    <View style={styles.header}>
      <View style={styles.headerCopy}>
        <Text numberOfLines={1} style={[styles.title, compact && styles.titleCompact, { color: tokens.colors.text, fontFamily, fontSize: (compact ? 14 : 17) * tokens.typography.scale }]}>{themePackage.manifest.name}</Text>
        {!compact ? <Text style={[styles.subtitle, { color: tokens.colors.mutedText, fontFamily }]}>Top stories</Text> : null}
      </View>
      {active ? <Ionicons name="checkmark-circle" size={compact ? 19 : 22} color={tokens.colors.accent} /> : null}
    </View>

    <View style={styles.filters}>
      {['Top', 'New', 'Ask'].map((label, index) => <View key={label} style={[styles.filter, {
        backgroundColor: index === 0 ? tokens.colors.accent : tokens.colors.surface,
        borderColor: tokens.colors.border,
        borderRadius: Math.max(6, tokens.shape.radius * 0.55)
      }]}><Text style={{ color: index === 0 ? tokens.colors.background : tokens.colors.mutedText, fontSize: compact ? 7 : 9, fontWeight: '700', fontFamily }}>{label}</Text></View>)}
    </View>

    <View style={{ gap: feedLayout === 'compact' ? 3 : 6 }}>{Array.from({ length: rowCount }, (_, row) => {
      const magazineFeature = feedLayout === 'magazine' && row === 0 && !compact;
      const card = feedLayout === 'cards' || feedLayout === 'magazine';
      return <View key={row} style={[styles.story, {
        minHeight: magazineFeature ? rowHeight + 22 : rowHeight,
        padding: feedLayout === 'compact' ? 4 : 7,
        backgroundColor: card ? tokens.colors.surface : 'transparent',
        borderColor: tokens.colors.border,
        borderWidth: card ? Math.max(1, tokens.shape.borderWidth) : 0,
        borderBottomWidth: card ? Math.max(1, tokens.shape.borderWidth) : Math.max(1, tokens.shape.borderWidth),
        borderRadius: card ? Math.max(6, tokens.shape.radius * 0.65) : 0
      }]}>
        {magazineFeature ? <View style={[styles.featureArt, { backgroundColor: `${tokens.colors.accent}2B`, borderRadius: Math.max(5, tokens.shape.radius * 0.5) }]} /> : null}
        <View style={styles.storyCopy}>
          <View style={[styles.line, { backgroundColor: tokens.colors.text, width: row === 1 ? '72%' : '91%' }]} />
          <View style={[styles.metaLine, { backgroundColor: tokens.colors.mutedText, width: row === 2 ? '46%' : '61%' }]} />
        </View>
      </View>;
    })}</View>

    <View style={[styles.nav, glass && styles.navFloating, {
      backgroundColor: tokens.colors.surface,
      borderColor: tokens.colors.border,
      borderRadius: glass ? Math.max(12, tokens.shape.radius) : Math.max(7, tokens.shape.radius * 0.65)
    }]}>
      {[0, 1, 2, 3].map((item) => <View key={item} style={[styles.navItem, { backgroundColor: item === 0 ? tokens.colors.accent : tokens.colors.mutedText }]} />)}
    </View>
  </View>;

  if (!onPress) return preview;
  return <Pressable accessibilityRole="button" accessibilityLabel={`${themePackage.manifest.name} theme`} onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>{preview}</Pressable>;
}

const styles = StyleSheet.create({
  shell: { overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  headerCopy: { flex: 1, minWidth: 0 },
  title: { fontWeight: '800' },
  titleCompact: { fontSize: 14 },
  subtitle: { fontSize: 9, marginTop: 1 },
  filters: { flexDirection: 'row', gap: 4 },
  filter: { minWidth: 28, height: 18, paddingHorizontal: 6, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  story: { flexDirection: 'row', gap: 7 },
  featureArt: { width: 54 },
  storyCopy: { flex: 1, gap: 7, justifyContent: 'center' },
  line: { height: 5, borderRadius: 4, opacity: 0.88 },
  metaLine: { height: 4, borderRadius: 4, opacity: 0.55 },
  nav: { height: 27, borderWidth: 1, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navFloating: { marginHorizontal: 10 },
  navItem: { width: 9, height: 9, borderRadius: 5, opacity: 0.86 }
});
