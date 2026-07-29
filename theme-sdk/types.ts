export type ColorSchemeName = 'light' | 'dark';
export type FontFamilyToken = 'system' | 'rounded' | 'serif' | 'monospace';
export type FontWeightToken = '400' | '500' | '600' | '700' | '800';
export type ShellLayout = 'tabs' | 'floating-tabs' | 'sidebar';
export type FeedLayout = 'compact' | 'comfortable' | 'cards' | 'magazine';
export type StoryLayout = 'line' | 'row' | 'card' | 'editorial';
export type CommentLayout = 'threads' | 'ledger' | 'conversation';
export type NavigationLayout = 'standard' | 'floating' | 'minimal';
export type MetadataLayout = 'inline' | 'stacked' | 'footer';

export interface ThemeColors {
  background: string;
  surface: string;
  text: string;
  mutedText: string;
  accent: string;
  border: string;
  success: string;
  warning: string;
  danger: string;
  elevated?: string;
  overlay?: string;
}

export interface ThemeTokens {
  colors: ThemeColors;
  typography: {
    fontFamily: FontFamilyToken;
    monoFamily: 'monospace';
    scale: number;
    titleWeight: FontWeightToken;
    bodyWeight: FontWeightToken;
  };
  spacing: { unit: number; density: number };
  shape: { radius: number; borderWidth: number };
  effects: { glass: boolean; blur: number; shadow: number };
  motion: { durationScale: number; springDamping: number };
}

export interface ThemeManifest {
  id: string;
  name: string;
  author: string;
  version: string;
  minAppVersion: string;
  license: string;
  description?: string;
  homepage?: string;
  preview?: string;
}

export interface ThemeLayout {
  shell: ShellLayout;
  feed: FeedLayout;
  story: StoryLayout;
  comments: CommentLayout;
  navigation: NavigationLayout;
  metadata: MetadataLayout;
}

export interface ThemePackage {
  manifest: ThemeManifest;
  tokens: {
    light: ThemeTokens;
    dark?: ThemeTokens;
    highContrastLight?: ThemeTokens;
    highContrastDark?: ThemeTokens;
  };
  layout: ThemeLayout;
}

export interface ThemeValidationIssue {
  path: string;
  code: 'required' | 'format' | 'range' | 'enum' | 'contrast' | 'compatibility' | 'size';
  message: string;
}

export interface ThemeValidationOptions {
  appVersion: string;
  maxSerializedBytes?: number;
}

export interface ThemeAccessibilityState {
  colorScheme: ColorSchemeName;
  reduceMotion: boolean;
  reduceTransparency: boolean;
  highContrast: boolean;
}

export interface ResolvedTheme {
  manifest: ThemeManifest;
  layout: ThemeLayout;
  tokens: ThemeTokens;
  sourceScheme: ColorSchemeName;
}

export interface ThemeRegistryEntry {
  id: string;
  version: string;
  name: string;
  author: string;
  downloadUrl: string;
  sha256: string;
  previewUrl?: string;
  minAppVersion: string;
}

export interface ThemeRegistry {
  version: 1;
  updatedAt: string;
  themes: ThemeRegistryEntry[];
}
