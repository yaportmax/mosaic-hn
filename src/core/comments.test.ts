import test from 'node:test';
import assert from 'node:assert/strict';
import { commentJumpTargets, flattenComments } from './comments.ts';
import type { Comment } from './models.ts';

const comment = (id: number, parent: number, kids: number[] = [], by = 'alice', time = 10): Comment => ({ id, kind: 'comment', hnType: 'comment', parent, by, time, text: `c${id}`, kids, deleted: false, dead: false });
const comments = new Map<number, Comment>([[1, comment(1, 99, [2, 3], 'op')], [2, comment(2, 1, [4], 'bob', 20)], [3, comment(3, 1, [], 'cara', 30)], [4, comment(4, 2, [], 'op', 40)]]);

test('flattenComments computes depth, subtree size, OP and new markers', () => {
  const rows = flattenComments([1], comments, { opUser: 'op', seenBefore: 25, collapsedIds: new Set() });
  assert.deepEqual(rows.map((row) => [row.comment.id, row.depth, row.subtreeSize]), [[1, 0, 4], [2, 1, 2], [4, 2, 1], [3, 1, 1]]);
  assert.equal(rows[0]?.isOp, true);
  assert.equal(rows[2]?.isNew, true);
});

test('flattenComments hides descendants of collapsed branches and guards cycles', () => {
  const cyclic = new Map(comments);
  cyclic.set(4, comment(4, 2, [1], 'op', 40));
  const rows = flattenComments([1], cyclic, { collapsedIds: new Set([2]) });
  assert.deepEqual(rows.map((row) => row.comment.id), [1, 2, 3]);
});

test('commentJumpTargets finds OP, new, saved, and large-subtree rows', () => {
  const rows = flattenComments([1], comments, { opUser: 'op', seenBefore: 25, collapsedIds: new Set(), savedIds: new Set([2]) });
  assert.deepEqual(commentJumpTargets(rows, 'op'), [0, 2]);
  assert.deepEqual(commentJumpTargets(rows, 'new'), [2, 3]);
  assert.deepEqual(commentJumpTargets(rows, 'saved'), [1]);
});
