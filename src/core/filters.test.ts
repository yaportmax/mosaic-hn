import test from 'node:test';
import assert from 'node:assert/strict';
import { applyRules, evaluateRule, safeRegex } from './filters.ts';
import type { FilterRule, Story } from './models.ts';

const story: Story = { id: 1, kind: 'story', hnType: 'story', title: 'SQLite internals', by: 'alice', time: 1_000, score: 50, descendants: 20, kids: [], deleted: false, dead: false, domain: 'example.com' };

test('evaluateRule requires every condition and returns a readable explanation', () => {
  const rule: FilterRule = { id: 'r1', name: 'Databases', enabled: true, action: { type: 'boost', amount: 2 }, conditions: [{ type: 'keyword', value: 'sqlite' }, { type: 'minScore', value: 20 }] };
  const result = evaluateRule(story, rule, { nowSeconds: 2_000, feed: 'top' });
  assert.equal(result.matched, true);
  assert.match(result.explanation, /Databases/);
});

test('safeRegex rejects oversized or invalid patterns instead of throwing', () => {
  assert.equal(safeRegex('['), null);
  assert.equal(safeRegex('x'.repeat(300)), null);
  assert.ok(safeRegex('sql.*ite', 'i'));
});

test('applyRules combines hide, boost, tag, save, and queue actions deterministically', () => {
  const rules: FilterRule[] = [
    { id: 'b', name: 'boost', enabled: true, action: { type: 'boost', amount: 3 }, conditions: [{ type: 'keyword', value: 'sqlite' }] },
    { id: 't', name: 'tag', enabled: true, action: { type: 'tag', value: 'database' }, conditions: [{ type: 'domain', value: 'example.com' }] },
    { id: 's', name: 'save', enabled: true, action: { type: 'save' }, conditions: [{ type: 'author', value: 'alice' }] }
  ];
  const result = applyRules(story, rules, { nowSeconds: 2_000, feed: 'top' });
  assert.equal(result.scoreAdjustment, 3);
  assert.deepEqual(result.tags, ['database']);
  assert.equal(result.save, true);
  assert.equal(result.hidden, false);
});
