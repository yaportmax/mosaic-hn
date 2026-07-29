import test from 'node:test';
import assert from 'node:assert/strict';
import { findRelatedStories, tokenize } from './related.ts';
import type { Story } from './models.ts';

const s = (id: number, title: string, domain = 'example.com'): Story => ({ id, kind: 'story', hnType: 'story', title, by: 'a', time: 1, score: 1, descendants: 0, kids: [], deleted: false, dead: false, domain });

test('tokenize removes common noise and normalizes words', () => {
  assert.deepEqual(tokenize('The SQLite databases, database!'), ['sqlite', 'databases', 'database']);
});

test('findRelatedStories favors meaningful title overlap and excludes target', () => {
  const target = s(1, 'SQLite query planner internals', 'sqlite.org');
  const results = findRelatedStories(target, [target, s(2, 'Inside the SQLite query planner', 'blog.example'), s(3, 'Gardening with tomatoes')]);
  assert.equal(results[0]?.story.id, 2);
  assert.equal(results.some((entry) => entry.story.id === 1), false);
});
