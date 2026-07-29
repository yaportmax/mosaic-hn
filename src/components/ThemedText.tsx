import { Platform, Text, type TextProps, type TextStyle } from 'react-native';
import { useThemeRuntime } from '../design/ThemeProvider.tsx';

export type TextVariant = 'display' | 'title' | 'headline' | 'body' | 'meta' | 'caption' | 'mono';

const baseSizes: Record<TextVariant, number> = { display: 30, title: 23, headline: 17, body: 15, meta: 13, caption: 11, mono: 13 };
const lineHeights: Record<TextVariant, number> = { display: 36, title: 29, headline: 22, body: 21, meta: 18, caption: 15, mono: 18 };

export function fontFamilyFor(token: string): string | undefined {
  if (token === 'monospace') return Platform.select({ ios: 'ui-monospace', android: 'monospace', default: 'monospace' });
  if (token === 'serif') return Platform.select({ ios: 'New York', android: 'serif', default: 'serif' });
  if (token === 'rounded') return Platform.select({ ios: 'ui-rounded', android: 'sans-serif', default: undefined });
  return undefined;
}

export function ThemedText({ variant = 'body', muted = false, accent = false, style, ...props }: TextProps & { variant?: TextVariant; muted?: boolean; accent?: boolean }) {
  const { theme } = useThemeRuntime();
  const tokens = theme.tokens;
  const isTitle = variant === 'display' || variant === 'title' || variant === 'headline';
  const textStyle: TextStyle = {
    color: accent ? tokens.colors.accent : muted ? tokens.colors.mutedText : tokens.colors.text,
    fontSize: baseSizes[variant] * tokens.typography.scale,
    lineHeight: lineHeights[variant] * tokens.typography.scale,
    fontFamily: fontFamilyFor(variant === 'mono' ? 'monospace' : tokens.typography.fontFamily),
    fontWeight: isTitle ? tokens.typography.titleWeight : tokens.typography.bodyWeight,
    includeFontPadding: false
  };
  return <Text {...props} style={[textStyle, style]} />;
}
