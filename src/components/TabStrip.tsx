import { Pressable, StyleSheet, View } from 'react-native';
import { useThemeRuntime } from '../design/ThemeProvider.tsx';
import { ThemedText } from './ThemedText.tsx';

export interface TabStripOption<T extends string> {
  value: T;
  label: string;
}

export function TabStrip<T extends string>({ options, value, onChange }: { options: readonly TabStripOption<T>[]; value: T; onChange(value: T): void }) {
  const { theme } = useThemeRuntime();
  return <View
    style={[styles.rail, { borderBottomColor: theme.tokens.colors.border }]}
    accessibilityRole="tablist"
  >
    {options.map((option) => {
      const selected = option.value === value;
      return <Pressable
        key={option.value}
        accessibilityRole="tab"
        accessibilityState={{ selected }}
        onPress={() => onChange(option.value)}
        style={({ pressed }) => [styles.tab, { opacity: pressed ? 0.62 : 1 }]}
      >
        <ThemedText variant="meta" numberOfLines={1} style={{ color: selected ? theme.tokens.colors.text : theme.tokens.colors.mutedText, fontWeight: selected ? '800' : '600' }}>{option.label}</ThemedText>
        <View style={[styles.indicator, { backgroundColor: selected ? theme.tokens.colors.accent : 'transparent' }]} />
      </Pressable>;
    })}
  </View>;
}

const styles = StyleSheet.create({
  rail: { flexGrow: 0, flexShrink: 0, height: 44, flexDirection: 'row', paddingHorizontal: 6, borderBottomWidth: StyleSheet.hairlineWidth },
  tab: { flex: 1, minWidth: 0, height: 43, paddingHorizontal: 3, alignItems: 'center', justifyContent: 'center' },
  indicator: { position: 'absolute', left: 6, right: 6, bottom: 0, height: 2, borderRadius: 2 }
});
