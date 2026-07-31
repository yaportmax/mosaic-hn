import type { Comment, CommentRow } from './models.ts';

export interface FlattenCommentOptions {
  opUser?: string;
  seenBefore?: number;
  collapsedIds?: ReadonlySet<number>;
  savedIds?: ReadonlySet<number>;
  maxDepth?: number;
}

function computeSubtreeSizes(rootIds: readonly number[], comments: ReadonlyMap<number, Comment>): Map<number, number> {
  const memo = new Map<number, number>();
  const visit = (id: number, path: Set<number>): number => {
    const cached = memo.get(id);
    if (cached !== undefined) return cached;
    if (path.has(id)) return 0;
    const comment = comments.get(id);
    if (!comment) return 0;
    const nextPath = new Set(path);
    nextPath.add(id);
    let size = 1;
    for (const childId of comment.kids) size += visit(childId, nextPath);
    memo.set(id, size);
    return size;
  };
  for (const id of rootIds) visit(id, new Set());
  return memo;
}

export function flattenComments(
  rootIds: readonly number[],
  comments: ReadonlyMap<number, Comment>,
  options: FlattenCommentOptions = {}
): CommentRow[] {
  const collapsed = options.collapsedIds ?? new Set<number>();
  const saved = options.savedIds ?? new Set<number>();
  const subtreeSizes = computeSubtreeSizes(rootIds, comments);
  const rows: CommentRow[] = [];
  const walk = (id: number, depth: number, path: Set<number>): void => {
    if (path.has(id)) return;
    const comment = comments.get(id);
    if (!comment) return;
    const nextPath = new Set(path);
    nextPath.add(id);
    const availableChildren = comment.kids.filter((childId) => comments.has(childId));
    const isCollapsed = collapsed.has(id) || (options.maxDepth !== undefined && depth >= options.maxDepth);
    rows.push({
      comment,
      depth,
      subtreeSize: subtreeSizes.get(id) ?? 1,
      isOp: Boolean(options.opUser && comment.by === options.opUser),
      isNew: options.seenBefore !== undefined && comment.time > options.seenBefore,
      isSaved: saved.has(id),
      hasChildren: comment.kids.length > 0,
      isCollapsed,
      missingChildCount: Math.max(0, comment.kids.length - availableChildren.length)
    });
    if (isCollapsed) return;
    for (const childId of availableChildren) walk(childId, depth + 1, nextPath);
  };
  for (const rootId of rootIds) walk(rootId, 0, new Set());
  return rows;
}

export type CommentJumpKind = 'op' | 'new' | 'saved' | 'large';
export function commentJumpTargets(rows: readonly CommentRow[], kind: CommentJumpKind): number[] {
  const output: number[] = [];
  rows.forEach((row, index) => {
    const match = kind === 'op' ? row.isOp : kind === 'new' ? row.isNew : kind === 'saved' ? row.isSaved : row.subtreeSize >= 8;
    if (match) output.push(index);
  });
  return output;
}
