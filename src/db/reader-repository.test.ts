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
  now = 6_000;
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
