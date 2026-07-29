import type { Comment, FeedKind, FeedPreset, FilterRule, HnItem, HnUser, LibraryExportV1, Story, StorySnapshot } from '../core/models.ts';
import { DEFAULT_FEED_PRESET } from '../core/ranking.ts';
import type { DatabaseAdapter } from './types.ts';

export interface HnGateway {
  getFeedIds(feed: FeedKind, signal?: AbortSignal): Promise<number[]>;
  getItem(id: number, signal?: AbortSignal): Promise<HnItem | null>;
  getItems(ids: readonly number[], signal?: AbortSignal): Promise<HnItem[]>;
  getUser(id: string, signal?: AbortSignal): Promise<HnUser | null>;
}

interface FeedCacheRecord { ids: number[]; fetchedAt: number }
interface TimestampRecord { createdAt: number }
interface VisitRecord { visitedAt: number }
interface NoteValue { itemId: number; body: string; updatedAt: number }
interface TagValue { itemId: number; tags: string[] }
interface StoredCollection { id: string; name: string; createdAt: number; updatedAt: number; itemIds: number[] }

export interface RefreshFeedOptions { limit?: number; signal?: AbortSignal }
export interface RepositoryAutomationAction { itemId: number; save: boolean; queue: boolean; tags: string[] }
export interface LoadDiscussionOptions {
  batchSize?: number;
  maxComments?: number;
  signal?: AbortSignal;
  onBatch?: (comments: Comment[]) => void;
}

const numericKey = (id: number): string => String(id);
const isStory = (item: HnItem): item is Story => item.kind === 'story';
const isComment = (item: HnItem): item is Comment => item.kind === 'comment';

export class ReaderRepository {
  private readonly db: DatabaseAdapter;
  private readonly gateway: HnGateway;
  private readonly now: () => number;

  constructor(
    db: DatabaseAdapter,
    gateway: HnGateway,
    now: () => number = () => Math.floor(Date.now() / 1000)
  ) {
    this.db = db;
    this.gateway = gateway;
    this.now = now;
  }

  async getCachedItem(id: number): Promise<HnItem | undefined> {
    return this.db.get<HnItem>('items', numericKey(id));
  }

  async getCachedStory(id: number): Promise<Story | undefined> {
    const item = await this.getCachedItem(id);
    return item?.kind === 'story' ? item : undefined;
  }

  async saveItems(items: readonly HnItem[]): Promise<void> {
    await this.db.transaction(async (tx) => {
      for (const item of items) await tx.set('items', numericKey(item.id), item);
    });
  }

  async getCachedFeed(feed: FeedKind, limit = 120): Promise<Story[]> {
    const cache = await this.db.get<FeedCacheRecord>('feeds', feed);
    if (!cache) return [];
    const output: Story[] = [];
    for (const id of cache.ids.slice(0, Math.max(0, limit))) {
      const story = await this.getCachedStory(id);
      if (story) output.push(story);
    }
    return output;
  }

  async getFeedFetchedAt(feed: FeedKind): Promise<number | undefined> {
    return (await this.db.get<FeedCacheRecord>('feeds', feed))?.fetchedAt;
  }

  async refreshFeed(feed: FeedKind, options: RefreshFeedOptions = {}): Promise<Story[]> {
    const capturedAt = this.now();
    const ids = (await this.gateway.getFeedIds(feed, options.signal)).slice(0, Math.max(1, options.limit ?? 120));
    const fetched = await this.gateway.getItems(ids, options.signal);
    const byId = new Map(fetched.filter(isStory).map((story) => [story.id, story]));
    const stories = ids.map((id) => byId.get(id)).filter((story): story is Story => Boolean(story));
    await this.db.transaction(async (tx) => {
      for (const story of stories) await tx.set('items', numericKey(story.id), story);
      await tx.set<FeedCacheRecord>('feeds', feed, { ids: stories.map((story) => story.id), fetchedAt: capturedAt });
      for (let rank = 0; rank < stories.length; rank += 1) {
        const story = stories[rank];
        if (!story) continue;
        const snapshot: StorySnapshot = { itemId: story.id, capturedAt, score: story.score, descendants: story.descendants, rank: rank + 1 };
        await tx.set('snapshots', `${story.id}:${capturedAt}:${rank + 1}`, snapshot);
      }
    });
    return stories;
  }

  async getStory(id: number, options: { refresh?: boolean; signal?: AbortSignal } = {}): Promise<Story | undefined> {
    const cached = await this.getCachedStory(id);
    if (cached && !options.refresh) return cached;
    const item = await this.gateway.getItem(id, options.signal);
    if (!item || item.kind !== 'story') return cached;
    await this.db.set('items', numericKey(item.id), item);
    return item;
  }

  async getUser(id: string, options: { refresh?: boolean; signal?: AbortSignal } = {}): Promise<HnUser | undefined> {
    const key = id.trim().toLowerCase();
    const cached = await this.db.get<HnUser>('users', key);
    if (cached && !options.refresh) return cached;
    const user = await this.gateway.getUser(id, options.signal);
    if (!user) return cached;
    await this.db.set('users', key, user);
    return user;
  }

  async loadDiscussion(story: Story, options: LoadDiscussionOptions = {}): Promise<Map<number, Comment>> {
    const batchSize = Math.max(1, Math.min(50, Math.trunc(options.batchSize ?? 20)));
    const maxComments = Math.max(1, Math.min(10_000, Math.trunc(options.maxComments ?? 3_000)));
    const collected = new Map<number, Comment>();
    const queued = new Set<number>();
    const pending: number[] = [...story.kids];
    const cachedBatch: Comment[] = [];

    while (pending.length > 0 && collected.size < maxComments) {
      const id = pending.shift();
      if (!id || queued.has(id)) continue;
      queued.add(id);
      const cached = await this.getCachedItem(id);
      if (cached?.kind === 'comment') {
        collected.set(id, cached);
        cachedBatch.push(cached);
        pending.push(...cached.kids);
      }
    }
    if (cachedBatch.length > 0) options.onBatch?.(cachedBatch);

    const missingQueue: number[] = [];
    const discoverMissing = (ids: readonly number[]): void => {
      for (const id of ids) if (!collected.has(id) && !missingQueue.includes(id)) missingQueue.push(id);
    };
    discoverMissing(story.kids);
    for (const comment of collected.values()) discoverMissing(comment.kids);

    while (missingQueue.length > 0 && collected.size < maxComments) {
      const ids = missingQueue.splice(0, batchSize);
      const fetched = (await this.gateway.getItems(ids, options.signal)).filter(isComment);
      if (fetched.length > 0) {
        await this.saveItems(fetched);
        for (const comment of fetched) {
          if (collected.has(comment.id)) continue;
          collected.set(comment.id, comment);
          discoverMissing(comment.kids);
        }
        options.onBatch?.(fetched);
      }
    }
    return collected;
  }

  async getLatestSnapshots(ids: readonly number[]): Promise<Map<number, StorySnapshot>> {
    const output = new Map<number, StorySnapshot>();
    for (const id of ids) {
      const records = await this.db.scan<StorySnapshot>('snapshots', `${id}:`);
      const latest = records.map((record) => record.value).sort((a, b) => b.capturedAt - a.capturedAt)[0];
      if (latest) output.set(id, latest);
    }
    return output;
  }

  async getStoryTimeline(id: number): Promise<StorySnapshot[]> {
    return (await this.db.scan<StorySnapshot>('snapshots', `${id}:`)).map((record) => record.value).sort((a, b) => a.capturedAt - b.capturedAt || a.rank - b.rank);
  }

  async recordVisit(itemId: number): Promise<number | undefined> {
    const prior = await this.getLastVisit(itemId);
    await this.db.set<VisitRecord>('visits', numericKey(itemId), { visitedAt: this.now() });
    return prior;
  }

  async getLastVisit(itemId: number): Promise<number | undefined> {
    return (await this.db.get<VisitRecord>('visits', numericKey(itemId)))?.visitedAt;
  }

  private async toggleTimestampTable(table: string, itemId: number): Promise<boolean> {
    const key = numericKey(itemId);
    const existing = await this.db.get<TimestampRecord>(table, key);
    if (existing) { await this.db.delete(table, key); return false; }
    await this.db.set<TimestampRecord>(table, key, { createdAt: this.now() });
    return true;
  }

  async setBookmark(itemId: number, enabled: boolean): Promise<void> {
    const key = numericKey(itemId);
    if (enabled) {
      if (!(await this.db.get<TimestampRecord>('bookmarks', key))) await this.db.set<TimestampRecord>('bookmarks', key, { createdAt: this.now() });
    } else await this.db.delete('bookmarks', key);
  }

  async setQueue(itemId: number, enabled: boolean): Promise<void> {
    const key = numericKey(itemId);
    if (enabled) {
      if (!(await this.db.get<TimestampRecord>('queue', key))) await this.db.set<TimestampRecord>('queue', key, { createdAt: this.now() });
    } else await this.db.delete('queue', key);
  }

  async setSavedComment(itemId: number, enabled: boolean): Promise<void> {
    const key = numericKey(itemId);
    if (enabled) {
      if (!(await this.db.get<TimestampRecord>('saved-comments', key))) await this.db.set<TimestampRecord>('saved-comments', key, { createdAt: this.now() });
    } else await this.db.delete('saved-comments', key);
  }

  async toggleBookmark(itemId: number): Promise<boolean> { return this.toggleTimestampTable('bookmarks', itemId); }
  async toggleQueue(itemId: number): Promise<boolean> { return this.toggleTimestampTable('queue', itemId); }
  async toggleSavedComment(itemId: number): Promise<boolean> { return this.toggleTimestampTable('saved-comments', itemId); }
  async isBookmarked(itemId: number): Promise<boolean> { return Boolean(await this.db.get('bookmarks', numericKey(itemId))); }
  async isQueued(itemId: number): Promise<boolean> { return Boolean(await this.db.get('queue', numericKey(itemId))); }
  async isCommentSaved(itemId: number): Promise<boolean> { return Boolean(await this.db.get('saved-comments', numericKey(itemId))); }

  async saveNote(itemId: number, body: string): Promise<void> {
    const value: NoteValue = { itemId, body: body.trim(), updatedAt: this.now() };
    if (!value.body) await this.db.delete('notes', numericKey(itemId));
    else await this.db.set('notes', numericKey(itemId), value);
  }

  async getNote(itemId: number): Promise<NoteValue | undefined> { return this.db.get<NoteValue>('notes', numericKey(itemId)); }

  async setTags(itemId: number, tags: readonly string[]): Promise<void> {
    const normalized = [...new Set(tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean))].sort();
    if (normalized.length === 0) await this.db.delete('tags', numericKey(itemId));
    else await this.db.set<TagValue>('tags', numericKey(itemId), { itemId, tags: normalized });
  }

  async getTags(itemId: number): Promise<string[]> {
    return [...((await this.db.get<TagValue>('tags', numericKey(itemId)))?.tags ?? [])];
  }

  async addTags(itemId: number, tags: readonly string[]): Promise<void> {
    await this.setTags(itemId, [...await this.getTags(itemId), ...tags]);
  }

  async applyAutomation(actions: readonly RepositoryAutomationAction[]): Promise<void> {
    await this.db.transaction(async (tx) => {
      const repository = new ReaderRepository(tx, this.gateway, this.now);
      for (const action of actions) {
        if (action.save) await repository.setBookmark(action.itemId, true);
        if (action.queue) await repository.setQueue(action.itemId, true);
        if (action.tags.length > 0) await repository.addTags(action.itemId, action.tags);
      }
    });
  }

  async saveCollection(collection: StoredCollection): Promise<void> { await this.db.set('collections', collection.id, collection); }
  async deleteCollection(id: string): Promise<void> { await this.db.delete('collections', id); }
  async listCollections(): Promise<StoredCollection[]> { return (await this.db.scan<StoredCollection>('collections')).map((record) => record.value).sort((a, b) => b.updatedAt - a.updatedAt); }

  async savePreset(preset: FeedPreset): Promise<void> { await this.db.set('presets', preset.id, preset); }
  async listPresets(): Promise<FeedPreset[]> {
    const custom = (await this.db.scan<FeedPreset>('presets')).map((record) => record.value);
    return custom.length > 0 ? custom : [DEFAULT_FEED_PRESET];
  }
  async saveRule(rule: FilterRule): Promise<void> { await this.db.set('rules', rule.id, rule); }
  async deleteRule(id: string): Promise<void> { await this.db.delete('rules', id); }
  async listRules(): Promise<FilterRule[]> { return (await this.db.scan<FilterRule>('rules')).map((record) => record.value); }

  async searchStories(query: string, limit = 100): Promise<Story[]> {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return [];
    const records = this.db.search
      ? await this.db.search<HnItem>('items', normalized, limit * 2)
      : await this.db.scan<HnItem>('items');
    const seen = new Set<number>();
    const output: Story[] = [];
    for (const record of records) {
      const item = record.value;
      if (item.kind !== 'story' || seen.has(item.id)) continue;
      const haystack = `${item.title}\n${item.text ?? ''}\n${item.by}\n${item.domain ?? ''}`.toLowerCase();
      if (!haystack.includes(normalized) && !this.db.search) continue;
      seen.add(item.id);
      output.push(item);
      if (output.length >= limit) break;
    }
    return output.sort((a, b) => a.id - b.id);
  }


  async setHidden(itemId: number, hidden: boolean): Promise<void> {
    const key = numericKey(itemId);
    if (hidden) await this.db.set<TimestampRecord>('hidden', key, { createdAt: this.now() });
    else await this.db.delete('hidden', key);
  }

  async isHidden(itemId: number): Promise<boolean> { return Boolean(await this.db.get('hidden', numericKey(itemId))); }

  async getHiddenIds(): Promise<Set<number>> {
    return new Set((await this.db.scan<TimestampRecord>('hidden')).map((record) => Number(record.key)).filter(Number.isFinite));
  }

  async getRecentHistory(limit = 100): Promise<Story[]> {
    const visits = await this.db.scan<VisitRecord>('visits');
    const output: Array<{ story: Story; visitedAt: number }> = [];
    for (const visit of visits) {
      const story = await this.getCachedStory(Number(visit.key));
      if (story) output.push({ story, visitedAt: visit.value.visitedAt });
    }
    return output.sort((a, b) => b.visitedAt - a.visitedAt || b.story.id - a.story.id).slice(0, Math.max(1, limit)).map((entry) => entry.story);
  }

  async getSavedCommentIds(): Promise<Set<number>> {
    return new Set((await this.db.scan<TimestampRecord>('saved-comments')).map((record) => Number(record.key)).filter(Number.isFinite));
  }

  async getItems(ids: readonly number[]): Promise<HnItem[]> {
    const output: HnItem[] = [];
    for (const id of ids) {
      const item = await this.getCachedItem(id);
      if (item) output.push(item);
    }
    return output;
  }

  async getAllCachedStories(limit = 5_000): Promise<Story[]> {
    const items = (await this.db.scan<HnItem>('items')).map((record) => record.value).filter(isStory);
    return items.sort((a, b) => b.time - a.time || b.id - a.id).slice(0, limit);
  }

  async getFlaggedStories(table: 'bookmarks' | 'queue'): Promise<Story[]> {
    const flags = await this.db.scan<TimestampRecord>(table);
    const output: Array<{ story: Story; createdAt: number }> = [];
    for (const flag of flags) {
      const story = await this.getCachedStory(Number(flag.key));
      if (story) output.push({ story, createdAt: flag.value.createdAt });
    }
    return output.sort((a, b) => b.createdAt - a.createdAt).map((entry) => entry.story);
  }

  async getLibraryExport(): Promise<LibraryExportV1> {
    const bookmarks = (await this.db.scan<TimestampRecord>('bookmarks')).map(({ key, value }) => ({ itemId: Number(key), createdAt: value.createdAt }));
    const queue = (await this.db.scan<TimestampRecord>('queue')).map(({ key, value }) => ({ itemId: Number(key), createdAt: value.createdAt }));
    const savedComments = (await this.db.scan<TimestampRecord>('saved-comments')).map(({ key, value }) => ({ itemId: Number(key), createdAt: value.createdAt }));
    const collections = (await this.db.scan<StoredCollection>('collections')).map((record) => record.value);
    const notes = (await this.db.scan<NoteValue>('notes')).map((record) => record.value);
    const tags = (await this.db.scan<TagValue>('tags')).map((record) => record.value);
    const presets = (await this.db.scan<FeedPreset>('presets')).map((record) => record.value);
    const rules = (await this.db.scan<FilterRule>('rules')).map((record) => record.value);
    return { version: 1, exportedAt: this.now(), bookmarks, queue, savedComments, collections, notes, tags, presets, rules };
  }

  async importLibrary(payload: LibraryExportV1): Promise<void> {
    await this.db.transaction(async (tx) => {
      for (const value of payload.bookmarks) await tx.set('bookmarks', numericKey(value.itemId), { createdAt: value.createdAt });
      for (const value of payload.queue) await tx.set('queue', numericKey(value.itemId), { createdAt: value.createdAt });
      for (const value of payload.savedComments) await tx.set('saved-comments', numericKey(value.itemId), { createdAt: value.createdAt });
      for (const value of payload.collections) await tx.set('collections', value.id, value);
      for (const value of payload.notes) await tx.set('notes', numericKey(value.itemId), value);
      for (const value of payload.tags) await tx.set('tags', numericKey(value.itemId), value);
      for (const value of payload.presets) await tx.set('presets', value.id, value);
      for (const value of payload.rules) await tx.set('rules', value.id, value);
    });
  }
}
