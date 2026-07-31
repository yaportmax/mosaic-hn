import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_FEED_PRESET, rankStories } from './ranking.ts';
import type { Story } from './models.ts';

const makeStory = (overrides: Partial<Story>): Story => ({
  id: 1, kind: 'story', hnType: 'story', title: 'Story', by: 'alice', time: 1_000,
  score: 10, descendants: 2, kids: [], deleted: false, dead: false, domain: 'example.com', ...overrides
});

test('rankStories is deterministic and uses id as final tie breaker', () => {
  const stories = [makeStory({ id: 2 }), makeStory({ id: 1 })];
  const ranked = rankStories(stories, DEFAULT_FEED_PRESET, { nowSeconds: 2_000 });
  assert.deepEqual(ranked.map((entry) => entry.story.id), [1, 2]);
});

test('rankStories boosts preferred domains and explains the boost', () => {
  const preferred = makeStory({ id: 2, domain: 'github.com' });
  const ordinary = makeStory({ id: 1, domain: 'example.com' });
  const preset = { ...DEFAULT_FEED_PRESET, preferredDomains: ['github.com'], weights: { ...DEFAULT_FEED_PRESET.weights, preferred: 2 } };
  const ranked = rankStories([ordinary, preferred], preset, { nowSeconds: 2_000 });
  assert.equal(ranked[0]?.story.id, 2);
  assert.ok(ranked[0]?.explanations.some((line) => line.code === 'preferred-domain'));
});

test('rankStories uses locally observed growth without requiring a remote service', () => {
  const fast = makeStory({ id: 1, score: 30 });
  const slow = makeStory({ id: 2, score: 30 });
  const preset = { ...DEFAULT_FEED_PRESET, weights: { ...DEFAULT_FEED_PRESET.weights, growth: 4 } };
  const ranked = rankStories([slow, fast], preset, {
    nowSeconds: 2_000,
    snapshots: new Map([[1, { itemId: 1, capturedAt: 1_900, score: 10, descendants: 0, rank: 20 }], [2, { itemId: 2, capturedAt: 1_900, score: 29, descendants: 0, rank: 20 }]])
  });
  assert.equal(ranked[0]?.story.id, 1);
});

test('recency mode 2 sorts strictly newest first', () => {
  const oldPopular = makeStory({ id: 1, time: 1_000, score: 1_000, descendants: 500 });
  const newQuiet = makeStory({ id: 2, time: 2_000, score: 1, descendants: 0 });
  const preset = { ...DEFAULT_FEED_PRESET, weights: { ...DEFAULT_FEED_PRESET.weights, recency: 2 } };
  const ranked = rankStories([oldPopular, newQuiet], preset, { nowSeconds: 3_000 });
  assert.deepEqual(ranked.map((entry) => entry.story.id), [2, 1]);
  assert.equal(ranked[0]?.rankScore, newQuiet.time);
});

test('recency mode 0 removes age while point and comment caps use real counts', () => {
  const oldPopular = makeStory({ id: 1, time: 1_000, score: 500, descendants: 200 });
  const newQuiet = makeStory({ id: 2, time: 10_000, score: 25, descendants: 5 });
  const preset = {
    ...DEFAULT_FEED_PRESET,
    weights: { ...DEFAULT_FEED_PRESET.weights, recency: 0, score: 500, discussion: 200, growth: 0, preferred: 0, keyword: 0 }
  };
  const ranked = rankStories([newQuiet, oldPopular], preset, { nowSeconds: 11_000 });
  assert.equal(ranked[0]?.story.id, 1);
  assert.ok(ranked[0]?.explanations.some((line) => line.label === 'Points up to 500'));
  assert.ok(ranked[0]?.explanations.some((line) => line.label === 'Comments up to 200'));
  assert.ok(ranked.every((entry) => !entry.explanations.some((line) => line.code === 'recency')));
});
