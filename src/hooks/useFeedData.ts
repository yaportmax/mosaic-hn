import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNetInfo } from '@react-native-community/netinfo';
import type { FeedKind, FeedPreset, Story } from '../core/models.ts';
import { DEFAULT_FEED_PRESET } from '../core/ranking.ts';
import { buildFeedView, type FeedViewItem } from '../core/feed-pipeline.ts';
import { useAppServices, usePreferences } from '../app/AppServices.tsx';

export interface FeedDataState {
  items: FeedViewItem[];
  hiddenCount: number;
  preset: FeedPreset;
  bookmarkedIds: ReadonlySet<number>;
  queuedIds: ReadonlySet<number>;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  lastUpdated: number | null;
  offline: boolean;
  refresh(): Promise<void>;
  reloadFromCache(): Promise<void>;
}

export function useFeedData(feed: FeedKind): FeedDataState {
  const { database } = useAppServices();
  const preferences = usePreferences();
  const netInfo = useNetInfo();
  const [items, setItems] = useState<FeedViewItem[]>([]);
  const [hiddenCount, setHiddenCount] = useState(0);
  const [preset, setPreset] = useState<FeedPreset>(DEFAULT_FEED_PRESET);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<number>>(new Set());
  const [queuedIds, setQueuedIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const generation = useRef(0);

  const prepare = useCallback(async (stories: readonly Story[]) => {
    const current = ++generation.current;
    let [presets, rules, snapshots, hiddenIds, bookmarks, queue] = await Promise.all([
      database.repository.listPresets(),
      database.repository.listRules(),
      database.repository.getLatestSnapshots(stories.map((story) => story.id)),
      database.repository.getHiddenIds(),
      database.repository.getFlaggedIds('bookmarks'),
      database.repository.getFlaggedIds('queue')
    ]);
    const selected = presets.find((candidate) => candidate.id === preferences.activePresetId) ?? presets[0] ?? DEFAULT_FEED_PRESET;
    const persistentHiddenCount = stories.reduce((count, story) => count + (hiddenIds.has(story.id) ? 1 : 0), 0);
    const visible = stories.filter((story) => !hiddenIds.has(story.id));
    const result = buildFeedView(visible, selected, rules, { nowSeconds: Math.floor(Date.now() / 1000), feed, snapshots });
    if (result.automation.length > 0) {
      await database.repository.applyAutomation(result.automation);
      [bookmarks, queue] = await Promise.all([database.repository.getFlaggedIds('bookmarks'), database.repository.getFlaggedIds('queue')]);
    }
    if (current !== generation.current) return;
    setPreset(selected);
    setBookmarkedIds(bookmarks);
    setQueuedIds(queue);
    setItems(result.items);
    setHiddenCount(persistentHiddenCount + result.hiddenStoryIds.length);
  }, [database.repository, feed, preferences.activePresetId]);

  const reloadFromCache = useCallback(async () => {
    const cached = await database.repository.getCachedFeed(feed, preferences.feedLimit);
    await prepare(cached);
    setLastUpdated(await database.repository.getFeedFetchedAt(feed) ?? null);
    setLoading(false);
  }, [database.repository, feed, preferences.feedLimit, prepare]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const stories = await database.repository.refreshFeed(feed, { limit: preferences.feedLimit });
      await prepare(stories);
      setLastUpdated(await database.repository.getFeedFetchedAt(feed) ?? Math.floor(Date.now() / 1000));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The feed could not be refreshed');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [database.repository, feed, preferences.feedLimit, prepare]);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const cached = await database.repository.getCachedFeed(feed, preferences.feedLimit);
        if (!active) return;
        if (cached.length > 0) await prepare(cached);
        setLastUpdated(await database.repository.getFeedFetchedAt(feed) ?? null);
        setLoading(cached.length === 0);
        if (netInfo.isConnected !== false) await refresh();
        else setLoading(false);
      } catch (reason) {
        if (active) { setError(reason instanceof Error ? reason.message : 'The feed could not be opened'); setLoading(false); }
      }
    })();
    return () => { active = false; };
  }, [database.repository, feed, preferences.feedLimit, prepare, refresh, netInfo.isConnected]);

  useEffect(() => {
    if (preferences.autoRefreshMinutes <= 0 || netInfo.isConnected === false) return;
    const timer = setInterval(() => { void refresh(); }, preferences.autoRefreshMinutes * 60_000);
    return () => clearInterval(timer);
  }, [preferences.autoRefreshMinutes, refresh, netInfo.isConnected]);

  return useMemo(() => ({ items, hiddenCount, preset, bookmarkedIds, queuedIds, loading, refreshing, error, lastUpdated, offline: netInfo.isConnected === false, refresh, reloadFromCache }), [items, hiddenCount, preset, bookmarkedIds, queuedIds, loading, refreshing, error, lastUpdated, netInfo.isConnected, refresh, reloadFromCache]);
}
