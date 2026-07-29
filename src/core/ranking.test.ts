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
