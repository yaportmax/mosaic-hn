import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryDatabaseAdapter } from './memory-adapter.ts';
import { ReaderRepository, type HnGateway } from './reader-repository.ts';
import type { Comment, FeedKind, HnItem, HnUser, Story } from '../core/models.ts';

const story = (id: number, title = `Story ${id}`, kids: number[] = []): Story => ({ id, kind: 'story', hnType: 'story', title, by: 'alice', time: 1_000 + id, score: 10 + id, descendants: kids.length, kids, deleted: false, dead: false, domain: 'example.com' });
const comment = (id: number, parent: number, kids: number[] = []): Comment => ({ id, kind: 'comment', hnType: 'comment', parent, by: 'reader', time: 2_000 + id, text: `Comment ${id}`, kids, deleted: false, dead: false });

class FakeGateway implements HnGateway {
  feeds = new Map<FeedKind, number[]>([['top', [1, 2]]]);
  items = new Map<number, HnItem>([[1, story(1, 'SQLite internals', [10])], [2, story(2, 'Rust release')], [10, comment(10, 1, [11])], [11, comment(11, 10)]]);
  async getFeedIds(feed: FeedKind): Promise<number[]> { return this.feeds.get(feed) ?? []; }
  async getItem(id: number): Promise<HnItem | null> { return this.items.get(id) ?? null; }
  async getItems(ids: readonly number[]): Promise<HnItem[]> { return ids.map((id) => this.items.get(id)).filter((item): item is HnItem => Boolean(item)); }
  async getUser(id: string): Promise<HnUser | null> { return { id, created: 1, karma: 10, about: '', submitted: [1] }; }
}

test('refreshFeed persists a cached feed, items, and local snapshots', async () => {
  let now = 5_000;
  const repo = new ReaderRepository(new MemoryDatabaseAdapter(), new FakeGateway(), () => now);
  const refreshed = await repo.refreshFeed('top', { limit: 20 });
  assert.deepEqual(refreshed.map((item) => item.id), [1, 2]);
  assert.deepEqual((await repo.getCachedFeed('top')).map((item) => item.id), [1, 2]);
  assert.equal((await repo.getLatestSnapshots([1])).get(1)?.capturedAt, 5_000);
  now = 7_000;
  await repo.refreshFeed('top', { limit: 1 });
  assert.equal((await repo.getStoryTimeline(1)).length, 2);
});

test('loadDiscussion emits cached-first progressive comment batches', async () => {
  const repo = new ReaderRepository(new MemoryDatabaseAdapter(), new FakeGateway(), () => 5_000);
  const root = story(1, 'Story', [10]);
  const batches: number[][] = [];
  const comments = await repo.loadDiscussion(root, { batchSize: 1, onBatch: (batch) => batches.push(batch.map((item) => item.id)) });
  assert.deepEqual([...comments.keys()], [10, 11]);
  assert.deepEqual(batches, [[10], [11]]);
  const cachedBatches: number[][] = [];
  await repo.loadDiscussion(root, { batchSize: 10, onBatch: (batch) => cachedBatches.push(batch.map((item) => item.id)) });
  assert.deepEqual(cachedBatches[0], [10, 11]);
});

test('library flags are atomic and exports include local user data', async () => {
  const repo = new ReaderRepository(new MemoryDatabaseAdapter(), new FakeGateway(), () => 5_000);
  await repo.refreshFeed('top');
  assert.equal(await repo.toggleBookmark(1), true);
  assert.equal(await repo.toggleQueue(2), true);
  await repo.saveNote(1, 'Deep dive');
  await repo.setTags(1, ['database', 'favorite']);
  const exported = await repo.getLibraryExport();
  assert.deepEqual(exported.bookmarks.map((entry) => entry.itemId), [1]);
  assert.deepEqual(exported.queue.map((entry) => entry.itemId), [2]);
  assert.equal(exported.notes[0]?.body, 'Deep dive');
  assert.equal(await repo.toggleBookmark(1), false);
});

test('searchStories searches cached titles, text, authors, and domains locally', async () => {
  const repo = new ReaderRepository(new MemoryDatabaseAdapter(), new FakeGateway(), () => 5_000);
  await repo.refreshFeed('top');
  assert.deepEqual((await repo.searchStories('sqlite')).map((item) => item.id), [1]);
  assert.deepEqual((await repo.searchStories('example.com')).map((item) => item.id), [1, 2]);
});

test('recordVisit preserves the previous visit boundary for new-comment markers', async () => {
  let now = 5_000;
  const repo = new ReaderRepository(new MemoryDatabaseAdapter(), new FakeGateway(), () => now);
  assert.equal(await repo.recordVisit(1), undefined);
  now = 7_000;
  assert.equal(await repo.recordVisit(1), 5_000);
  assert.equal(await repo.getLastVisit(1), 7_000);
});

test('automation actions are idempotent and tags merge without toggling', async () => {
  const repo = new ReaderRepository(new MemoryDatabaseAdapter(), new FakeGateway(), () => 5_000);
  await repo.applyAutomation([{ itemId: 1, save: true, queue: true, tags: ['database'] }]);
  await repo.applyAutomation([{ itemId: 1, save: true, queue: true, tags: ['favorite', 'database'] }]);
  assert.equal(await repo.isBookmarked(1), true);
  assert.equal(await repo.isQueued(1), true);
  assert.deepEqual(await repo.getTags(1), ['database', 'favorite']);
});

test('library history and hidden items are queryable without a remote service', async () => {
  let now = 5_000;
  const repo = new ReaderRepository(new MemoryDatabaseAdapter(), new FakeGateway(), () => now);
  await repo.refreshFeed('top');
  await repo.recordVisit(1);
  now = 6_000;
  await repo.recordVisit(2);
  await repo.setHidden(1, true);
  assert.deepEqual((await repo.getRecentHistory()).map((item) => item.id), [2, 1]);
  assert.equal(await repo.isHidden(1), true);
  await repo.setHidden(1, false);
  assert.equal(await repo.isHidden(1), false);
});

test('custom feed presets can be removed without deleting the built-in balanced fallback', async () => {
  const repo = new ReaderRepository(new MemoryDatabaseAdapter(), new FakeGateway(), () => 5_000);
  await repo.savePreset({ id: 'systems', name: 'Systems', weights: { recency: 1, score: 1, discussion: 1, growth: 1, preferred: 1, keyword: 2 }, recencyHalfLifeHours: 24, preferredDomains: [], preferredAuthors: [], preferredKeywords: ['sqlite'] });
  assert.equal(await repo.deletePreset('systems'), true);
  assert.equal(await repo.deletePreset('missing'), false);
  assert.deepEqual((await repo.listPresets()).map((preset) => preset.id), ['balanced']);
});

test('the balanced feed preset remains available alongside custom presets', async () => {
  const repo = new ReaderRepository(new MemoryDatabaseAdapter(), new FakeGateway(), () => 5_000);
  await repo.savePreset({ id: 'systems', name: 'Systems', weights: { recency: 1, score: 1, discussion: 1, growth: 1, preferred: 1, keyword: 2 }, recencyHalfLifeHours: 24, preferredDomains: [], preferredAuthors: [], preferredKeywords: ['sqlite'] });
  assert.deepEqual((await repo.listPresets()).map((preset) => preset.id), ['balanced', 'systems']);
});

test('story and user refreshes fall back to cached records while offline', async () => {
  const db = new MemoryDatabaseAdapter();
  const online = new ReaderRepository(db, new FakeGateway(), () => 5_000);
  await online.saveItems([story(1, 'Cached story')]);
  await online.getUser('alice');
  class OfflineGateway extends FakeGateway {
    override async getItem(): Promise<HnItem | null> { throw new Error('offline'); }
    override async getUser(): Promise<HnUser | null> { throw new Error('offline'); }
  }
  const offline = new ReaderRepository(db, new OfflineGateway(), () => 6_000);
  assert.equal((await offline.getStory(1, { refresh: true }))?.title, 'Cached story');
  assert.equal((await offline.getUser('alice', { refresh: true }))?.id, 'alice');
});

test('cached feed hydration batches item reads instead of issuing one query per story', async () => {
  class CountingAdapter extends MemoryDatabaseAdapter {
    itemGets = 0;
    itemBatchGets = 0;
    override async get<T>(table: string, key: string): Promise<T | undefined> {
      if (table === 'items') this.itemGets += 1;
      return super.get<T>(table, key);
    }
    override async getMany<T>(table: string, keys: readonly string[]) {
      if (table === 'items') this.itemBatchGets += 1;
      return super.getMany<T>(table, keys);
    }
  }

  const db = new CountingAdapter();
  const repo = new ReaderRepository(db, new FakeGateway(), () => 5_000);
  await repo.refreshFeed('top');
  db.itemGets = 0;
  db.itemBatchGets = 0;

  assert.deepEqual((await repo.getCachedFeed('top')).map((item) => item.id), [1, 2]);
  assert.equal(db.itemBatchGets, 1);
  assert.equal(db.itemGets, 0);
});

test('story snapshots are rate-limited and bounded to prevent unbounded local growth', async () => {
  let now = 5_000;
  const repo = new ReaderRepository(new MemoryDatabaseAdapter(), new FakeGateway(), () => now);
  await repo.refreshFeed('top', { limit: 1 });
  now = 5_500;
  await repo.refreshFeed('top', { limit: 1 });
  assert.equal((await repo.getStoryTimeline(1)).length, 1);

  for (let index = 1; index <= 260; index += 1) {
    now = 5_000 + index * 1_800;
    await repo.refreshFeed('top', { limit: 1 });
  }
  const timeline = await repo.getStoryTimeline(1);
  assert.equal(timeline.length, 256);
  assert.equal(timeline.at(-1)?.capturedAt, now);
});

test('refreshFeed archives one bounded snapshot per UTC day for local time travel', async () => {
  let now = Date.UTC(2026, 0, 1, 12) / 1_000;
  const gateway = new FakeGateway();
  const repo = new ReaderRepository(new MemoryDatabaseAdapter(), gateway, () => now);

  await repo.refreshFeed('top');
  gateway.feeds.set('top', [2]);
  now += 3_600;
  await repo.refreshFeed('top');

  let archive = await repo.listFeedArchive('top');
  assert.equal(archive.length, 1);
  assert.equal(archive[0]?.date, '2026-01-01');
  assert.deepEqual((await repo.getArchivedFeed('top', '2026-01-01')).stories.map((item) => item.id), [2]);

  for (let day = 1; day <= 370; day += 1) {
    now = Date.UTC(2026, 0, 1 + day, 12) / 1_000;
    await repo.refreshFeed('top', { limit: 1 });
  }
  archive = await repo.listFeedArchive('top');
  assert.equal(archive.length, 365);
  assert.equal(archive[0]?.date, '2027-01-06');
  assert.equal(archive.at(-1)?.date, '2026-01-07');
});

test('loadDiscussion can hydrate cached branches without issuing network requests', async () => {
  class CountingGateway extends FakeGateway {
    itemRequests = 0;
    override async getItems(ids: readonly number[]): Promise<HnItem[]> {
      this.itemRequests += ids.length;
      return super.getItems(ids);
    }
  }
  const gateway = new CountingGateway();
  const repo = new ReaderRepository(new MemoryDatabaseAdapter(), gateway, () => 5_000);
  const root = story(1, 'Story', [10]);
  await repo.saveItems([comment(10, 1, [11])]);
  const batches: number[][] = [];
  const comments = await repo.loadDiscussion(root, { cachedOnly: true, onBatch: (batch) => batches.push(batch.map((item) => item.id)) });
  assert.deepEqual([...comments.keys()], [10]);
  assert.deepEqual(batches, [[10]]);
  assert.equal(gateway.itemRequests, 0);
});

test('getFlaggedIds returns only currently saved item identifiers', async () => {
  const repo = new ReaderRepository(new MemoryDatabaseAdapter(), new FakeGateway(), () => 5_000);
  await repo.setBookmark(1, true);
  await repo.setBookmark(2, true);
  await repo.setBookmark(1, false);
  await repo.setQueue(10, true);
  assert.deepEqual([...await repo.getFlaggedIds('bookmarks')], [2]);
  assert.deepEqual([...await repo.getFlaggedIds('queue')], [10]);
});
