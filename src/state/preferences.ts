import type { FeedKind } from '../core/models.ts';
import type { DatabaseAdapter } from '../db/types.ts';
import { DEFAULT_THEME_ID } from '../design/constants.ts';
import { createExternalStore, type ExternalStore } from './external-store.ts';

export type ColorModePreference = 'system' | 'light' | 'dark';
export type LinkOpeningPreference = 'in-app' | 'system';
export type GestureAction = 'none' | 'open' | 'save' | 'queue' | 'share' | 'hide';
export type AccessibilityOverride = 'system' | 'on' | 'off';

export interface GesturePreferences {
  swipeLeft: GestureAction;
  swipeRight: GestureAction;
  longPress: GestureAction;
  doubleTap: GestureAction;
}

export interface AppPreferences {
  activeThemeId: string;
  colorMode: ColorModePreference;
  highContrast: boolean;
  reduceMotion: AccessibilityOverride;
  reduceTransparency: AccessibilityOverride;
  defaultFeed: FeedKind;
  activePresetId: string;
  feedLimit: number;
  autoRefreshMinutes: number;
  commentMaxDepth: number | null;
  openLinks: LinkOpeningPreference;
  hapticsEnabled: boolean;
  preloadComments: boolean;
  showRankingExplanations: boolean;
  compactNumbers: boolean;
  gestures: GesturePreferences;
  tabOrder: Array<'feed' | 'search' | 'library' | 'themes' | 'settings'>;
  remoteThemeRegistryUrl: string;
}

export const DEFAULT_PREFERENCES: AppPreferences = Object.freeze({
  activeThemeId: DEFAULT_THEME_ID,
  colorMode: 'system',
  highContrast: false,
  reduceMotion: 'system',
  reduceTransparency: 'system',
  defaultFeed: 'top',
  activePresetId: 'balanced',
  feedLimit: 120,
  autoRefreshMinutes: 10,
  commentMaxDepth: null,
  openLinks: 'system',
  hapticsEnabled: true,
  preloadComments: true,
  showRankingExplanations: false,
  compactNumbers: true,
  gestures: Object.freeze({ swipeLeft: 'save', swipeRight: 'open', longPress: 'queue', doubleTap: 'save' }),
  tabOrder: Object.freeze(['feed', 'search', 'library', 'themes', 'settings']),
  remoteThemeRegistryUrl: ''
}) as AppPreferences;

const VALID_FEEDS = new Set<FeedKind>(['top', 'new', 'best', 'ask', 'show', 'jobs']);
const VALID_GESTURES = new Set<GestureAction>(['none', 'open', 'save', 'queue', 'share', 'hide']);
const VALID_TABS = new Set(DEFAULT_PREFERENCES.tabOrder);
const clampInt = (value: unknown, minimum: number, maximum: number, fallback: number): number => {
  const number = typeof value === 'number' && Number.isFinite(value) ? Math.trunc(value) : fallback;
  return Math.max(minimum, Math.min(maximum, number));
};
const asEnum = <T extends string>(value: unknown, allowed: ReadonlySet<T>, fallback: T): T => typeof value === 'string' && allowed.has(value as T) ? value as T : fallback;

export function normalizePreferences(value: Partial<AppPreferences> | undefined): AppPreferences {
  const source = value ?? {};
  const gestures = source.gestures ?? DEFAULT_PREFERENCES.gestures;
  const tabOrder = Array.isArray(source.tabOrder)
    ? [...new Set(source.tabOrder.filter((tab): tab is AppPreferences['tabOrder'][number] => VALID_TABS.has(tab as never)))]
    : [...DEFAULT_PREFERENCES.tabOrder];
  for (const tab of DEFAULT_PREFERENCES.tabOrder) if (!tabOrder.includes(tab)) tabOrder.push(tab);
  const maxDepth = source.commentMaxDepth;
  return {
    activeThemeId: typeof source.activeThemeId === 'string' && source.activeThemeId.trim() ? source.activeThemeId.trim() : DEFAULT_PREFERENCES.activeThemeId,
    colorMode: asEnum(source.colorMode, new Set<ColorModePreference>(['system', 'light', 'dark']), DEFAULT_PREFERENCES.colorMode),
    highContrast: typeof source.highContrast === 'boolean' ? source.highContrast : DEFAULT_PREFERENCES.highContrast,
    reduceMotion: asEnum(source.reduceMotion, new Set<AccessibilityOverride>(['system', 'on', 'off']), DEFAULT_PREFERENCES.reduceMotion),
    reduceTransparency: asEnum(source.reduceTransparency, new Set<AccessibilityOverride>(['system', 'on', 'off']), DEFAULT_PREFERENCES.reduceTransparency),
    defaultFeed: asEnum(source.defaultFeed, VALID_FEEDS, DEFAULT_PREFERENCES.defaultFeed),
    activePresetId: typeof source.activePresetId === 'string' && source.activePresetId.trim() ? source.activePresetId.trim() : DEFAULT_PREFERENCES.activePresetId,
    feedLimit: clampInt(source.feedLimit, 20, 500, DEFAULT_PREFERENCES.feedLimit),
    autoRefreshMinutes: clampInt(source.autoRefreshMinutes, 0, 120, DEFAULT_PREFERENCES.autoRefreshMinutes),
    commentMaxDepth: typeof maxDepth === 'number' && Number.isFinite(maxDepth) && maxDepth >= 0 ? Math.min(50, Math.trunc(maxDepth)) : null,
    openLinks: asEnum(source.openLinks, new Set<LinkOpeningPreference>(['in-app', 'system']), DEFAULT_PREFERENCES.openLinks),
    hapticsEnabled: typeof source.hapticsEnabled === 'boolean' ? source.hapticsEnabled : DEFAULT_PREFERENCES.hapticsEnabled,
    preloadComments: typeof source.preloadComments === 'boolean' ? source.preloadComments : DEFAULT_PREFERENCES.preloadComments,
    showRankingExplanations: typeof source.showRankingExplanations === 'boolean' ? source.showRankingExplanations : DEFAULT_PREFERENCES.showRankingExplanations,
    compactNumbers: typeof source.compactNumbers === 'boolean' ? source.compactNumbers : DEFAULT_PREFERENCES.compactNumbers,
    gestures: {
      swipeLeft: asEnum(gestures.swipeLeft, VALID_GESTURES, DEFAULT_PREFERENCES.gestures.swipeLeft),
      swipeRight: asEnum(gestures.swipeRight, VALID_GESTURES, DEFAULT_PREFERENCES.gestures.swipeRight),
      longPress: asEnum(gestures.longPress, VALID_GESTURES, DEFAULT_PREFERENCES.gestures.longPress),
      doubleTap: asEnum(gestures.doubleTap, VALID_GESTURES, DEFAULT_PREFERENCES.gestures.doubleTap)
    },
    tabOrder,
    remoteThemeRegistryUrl: typeof source.remoteThemeRegistryUrl === 'string' ? source.remoteThemeRegistryUrl.trim() : ''
  };
}

export class PreferencesController implements ExternalStore<AppPreferences> {
  private readonly db: DatabaseAdapter;
  private readonly store: ExternalStore<AppPreferences>;

  constructor(db: DatabaseAdapter) {
    this.db = db;
    this.store = createExternalStore<AppPreferences>(structuredClone(DEFAULT_PREFERENCES));
  }

  getSnapshot = (): AppPreferences => this.store.getSnapshot();
  subscribe = (listener: () => void): (() => void) => this.store.subscribe(listener);
  setState = (updater: AppPreferences | ((state: AppPreferences) => AppPreferences)): void => this.store.setState(updater);

  async load(): Promise<AppPreferences> {
    const stored = await this.db.get<Partial<AppPreferences>>('settings', 'preferences');
    const normalized = normalizePreferences(stored);
    this.store.setState(normalized);
    return normalized;
  }

  async update(patch: Partial<AppPreferences>): Promise<AppPreferences> {
    const next = normalizePreferences({ ...this.store.getSnapshot(), ...patch, gestures: patch.gestures ?? this.store.getSnapshot().gestures });
    await this.db.set('settings', 'preferences', next);
    this.store.setState(next);
    return next;
  }

  async reset(): Promise<AppPreferences> {
    const next = structuredClone(DEFAULT_PREFERENCES);
    await this.db.set('settings', 'preferences', next);
    this.store.setState(next);
    return next;
  }
}
