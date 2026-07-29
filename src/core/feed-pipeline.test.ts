import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFeedView } from './feed-pipeline.ts';
import type { FeedPreset, FilterRule, Story } from './models.ts';

const story = (id: number, title: string, score: number): Story => ({
  id, kind: 'story', hnType: 'story', title, by: 'alice', time: 9_900, score,
  descendants: 2, kids: [], deleted: false, dead: false, domain: 'example.com'
});
const preset: FeedPreset = {
  id: 'test', name: 'Test', recencyHalfLifeHours: 12,
  weights: { recency: 0, score: 1, discussion: 0, growth: 0, preferred: 0, keyword: 0 },
  preferredDomains: [], preferredAuthors: [], preferredKeywords: []
};

test('buildFeedView hides matching stories and applies score adjustments deterministically', () => {
  const rules: FilterRule[] = [
    { id: 'hide', name: 'Hide Rust', enabled: true, conditions: [{ type: 'keyword', value: 'rust' }], action: { type: 'hide' } },
    { id: 'boost', name: 'Boost SQLite', enabled: true, conditions: [{ type: 'keyword', value: 'sqlite' }], action: { type: 'boost', amount: 50 } }
  ];
  const result = buildFeedView([story(1, 'Rust release', 100), story(2, 'SQLite internals', 1), story(3, 'Web platform', 20)], preset, rules, { nowSeconds: 10_000, feed: 'top' });
  assert.deepEqual(result.items.map((item) => item.story.id), [2, 3]);
  assert.deepEqual(result.hiddenStoryIds, [1]);
  assert.equal(result.items[0]?.ruleResult.scoreAdjustment, 50);
  assert.match(result.items[0]?.explanationText ?? '', /Boost SQLite/);
});

test('buildFeedView reports idempotent automation actions without mutating storage', () => {
  const rules: FilterRule[] = [
    { id: 'save', name: 'Save databases', enabled: true, conditions: [{ type: 'keyword', value: 'sqlite' }], action: { type: 'save' } },
    { id: 'tag', name: 'Tag databases', enabled: true, conditions: [{ type: 'keyword', value: 'sqlite' }], action: { type: 'tag', value: 'database' } }
  ];
  const result = buildFeedView([story(2, 'SQLite internals', 1)], preset, rules, { nowSeconds: 10_000, feed: 'top' });
  assert.deepEqual(result.automation, [{ itemId: 2, save: true, queue: false, tags: ['database'] }]);
});
