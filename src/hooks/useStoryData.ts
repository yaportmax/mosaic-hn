import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Comment, CommentRow, Story } from '../core/models.ts';
import { commentJumpTargets, flattenComments, type CommentJumpKind } from '../core/comments.ts';
import { useAppServices, useModuleEnabled, usePreferences } from '../app/AppServices.tsx';
import { createStoryCapabilityPlan } from '../modules/capabilities.ts';

export interface StoryDataState {
  story: Story | null;
  rows: CommentRow[];
  bookmarked: boolean;
  queued: boolean;
  loading: boolean;
  commentsLoading: boolean;
  commentsError: string | null;
  error: string | null;
  previousVisit?: number;
  toggleCollapsed(id: number): void;
  toggleSavedComment(id: number): Promise<void>;
  jumpTargets(kind: CommentJumpKind): number[];
  toggleBookmark(): Promise<void>;
  toggleQueue(): Promise<void>;
  refresh(): Promise<void>;
}

export function useStoryData(id: number): StoryDataState {
  const { database } = useAppServices();
  const preferences = usePreferences();
  const commentsEnabled = useModuleEnabled('comments');
  const libraryEnabled = useModuleEnabled('library');
  const capabilityPlan = useMemo(() => createStoryCapabilityPlan({
    comments: commentsEnabled,
    discovery: false,
    library: libraryEnabled,
    archive: false
  }), [commentsEnabled, libraryEnabled]);
  const [story, setStory] = useState<Story | null>(null);
  const [comments, setComments] = useState<Map<number, Comment>>(new Map());
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
  const [saved, setSaved] = useState<Set<number>>(new Set());
  const [bookmarked, setBookmarked] = useState(false);
  const [queued, setQueued] = useState(false);
  const [previousVisit, setPreviousVisit] = useState<number | undefined>();
  const [loading, setLoading] = useState(true);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hydrateLocal = useCallback(async (current: Story) => {
    const [savedIds, isBookmarked, isQueued] = await Promise.all([
      capabilityPlan.loadSavedComments ? database.repository.getSavedCommentIds() : Promise.resolve(new Set<number>()),
      capabilityPlan.loadLibrary ? database.repository.isBookmarked(current.id) : Promise.resolve(false),
      capabilityPlan.loadLibrary ? database.repository.isQueued(current.id) : Promise.resolve(false)
    ]);
    setSaved(savedIds);
    setBookmarked(isBookmarked);
    setQueued(isQueued);
  }, [capabilityPlan, database.repository]);

  const loadComments = useCallback(async (current: Story, cachedOnly = false) => {
    if (!capabilityPlan.loadComments || current.kids.length === 0) { setComments(new Map()); setCommentsLoading(false); return; }
    setCommentsLoading(true);
    setCommentsError(null);
    try {
      const result = await database.repository.loadDiscussion(current, {
        batchSize: 24,
        cachedOnly,
        onBatch(batch) { setComments((existing) => { const next = new Map(existing); for (const comment of batch) next.set(comment.id, comment); return next; }); }
      });
      setComments(new Map(result));
    } catch (reason) {
      setCommentsError(reason instanceof Error ? reason.message : 'The discussion could not be loaded');
    } finally { setCommentsLoading(false); }
  }, [capabilityPlan.loadComments, database.repository]);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const current = await database.repository.getStory(id, { refresh: true });
      if (!current) throw new Error('This story is unavailable or was removed');
      setStory(current);
      await Promise.all([hydrateLocal(current), loadComments(current, false)]);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'The story could not be loaded'); }
    finally { setLoading(false); }
  }, [database.repository, id, hydrateLocal, loadComments]);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const current = await database.repository.getStory(id, { refresh: true });
        if (!active || !current) { if (active) setError('This story is unavailable or was removed'); return; }
        setStory(current);
        const prior = await database.repository.recordVisit(id);
        if (active) setPreviousVisit(prior);
        await Promise.all([hydrateLocal(current), loadComments(current, false)]);
        if (active) setLoading(false);
      } catch (reason) { if (active) { setError(reason instanceof Error ? reason.message : 'The story could not be loaded'); setLoading(false); } }
    })();
    return () => { active = false; };
  }, [database.repository, id, hydrateLocal, loadComments]);

  const rows = useMemo(() => capabilityPlan.loadComments && story ? flattenComments(story.kids, comments, { opUser: story.by, seenBefore: previousVisit, collapsedIds: collapsed, savedIds: saved, maxDepth: preferences.commentMaxDepth ?? undefined }) : [], [capabilityPlan.loadComments, story, comments, previousVisit, collapsed, saved, preferences.commentMaxDepth]);

  const toggleCollapsed = useCallback((commentId: number) => { if (!capabilityPlan.loadComments) return; setCollapsed((existing) => { const next = new Set(existing); if (next.has(commentId)) next.delete(commentId); else next.add(commentId); return next; }); }, [capabilityPlan.loadComments]);
  const toggleSavedComment = useCallback(async (commentId: number) => { if (!capabilityPlan.loadSavedComments) return; const enabled = await database.repository.toggleSavedComment(commentId); setSaved((existing) => { const next = new Set(existing); if (enabled) next.add(commentId); else next.delete(commentId); return next; }); }, [capabilityPlan.loadSavedComments, database.repository]);
  const toggleBookmark = useCallback(async () => { if (!capabilityPlan.loadLibrary) return; const enabled = await database.repository.toggleBookmark(id); setBookmarked(enabled); }, [capabilityPlan.loadLibrary, database.repository, id]);
  const toggleQueue = useCallback(async () => { if (!capabilityPlan.loadLibrary) return; const enabled = await database.repository.toggleQueue(id); setQueued(enabled); }, [capabilityPlan.loadLibrary, database.repository, id]);
  const jumpTargets = useCallback((kind: CommentJumpKind) => commentJumpTargets(rows, kind), [rows]);

  return { story, rows, bookmarked, queued, loading, commentsLoading, commentsError, error, previousVisit, toggleCollapsed, toggleSavedComment, jumpTargets, toggleBookmark, toggleQueue, refresh };
}
