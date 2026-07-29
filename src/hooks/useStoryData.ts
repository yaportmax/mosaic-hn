import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Comment, CommentRow, Story, StorySnapshot } from '../core/models.ts';
import { commentJumpTargets, flattenComments, type CommentJumpKind } from '../core/comments.ts';
import { findRelatedStories, type RelatedStory } from '../core/related.ts';
import { useAppServices, usePreferences } from '../app/AppServices.tsx';

export interface StoryDataState {
  story: Story | null;
  rows: CommentRow[];
  timeline: StorySnapshot[];
  related: RelatedStory[];
  note: string;
  tags: string[];
  bookmarked: boolean;
  queued: boolean;
  loading: boolean;
  commentsLoading: boolean;
  error: string | null;
  previousVisit?: number;
  toggleCollapsed(id: number): void;
  toggleSavedComment(id: number): Promise<void>;
  jumpTargets(kind: CommentJumpKind): number[];
  toggleBookmark(): Promise<void>;
  toggleQueue(): Promise<void>;
  saveNote(body: string): Promise<void>;
  saveTags(tags: string[]): Promise<void>;
  refresh(): Promise<void>;
}

export function useStoryData(id: number): StoryDataState {
  const { database } = useAppServices();
  const preferences = usePreferences();
  const [story, setStory] = useState<Story | null>(null);
  const [comments, setComments] = useState<Map<number, Comment>>(new Map());
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
  const [saved, setSaved] = useState<Set<number>>(new Set());
  const [timeline, setTimeline] = useState<StorySnapshot[]>([]);
  const [related, setRelated] = useState<RelatedStory[]>([]);
  const [note, setNote] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [bookmarked, setBookmarked] = useState(false);
  const [queued, setQueued] = useState(false);
  const [previousVisit, setPreviousVisit] = useState<number | undefined>();
  const [loading, setLoading] = useState(true);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hydrateLocal = useCallback(async (current: Story) => {
    const [snapshots, allStories, savedIds, noteValue, tagValues, isBookmarked, isQueued] = await Promise.all([
      database.repository.getStoryTimeline(current.id), database.repository.getAllCachedStories(), database.repository.getSavedCommentIds(),
      database.repository.getNote(current.id), database.repository.getTags(current.id), database.repository.isBookmarked(current.id), database.repository.isQueued(current.id)
    ]);
    setTimeline(snapshots);
    setRelated(findRelatedStories(current, allStories).slice(0, 8));
    setSaved(savedIds);
    setNote(noteValue?.body ?? '');
    setTags(tagValues);
    setBookmarked(isBookmarked);
    setQueued(isQueued);
  }, [database.repository]);

  const loadComments = useCallback(async (current: Story, cachedOnly = false) => {
    if (current.kids.length === 0) { setComments(new Map()); return; }
    setCommentsLoading(true);
    try {
      const result = await database.repository.loadDiscussion(current, {
        batchSize: 24,
        cachedOnly,
        onBatch(batch) { setComments((existing) => { const next = new Map(existing); for (const comment of batch) next.set(comment.id, comment); return next; }); }
      });
      setComments(new Map(result));
    } finally { setCommentsLoading(false); }
  }, [database.repository]);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const current = await database.repository.getStory(id, { refresh: true });
      if (!current) throw new Error('This story is unavailable or was removed');
      setStory(current);
      await Promise.all([hydrateLocal(current), loadComments(current, false)]);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'The story could not be loaded'); }
    finally { setLoading(false); }
  }, [database.repository, id, hydrateLocal, loadComments, preferences.preloadComments]);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const current = await database.repository.getStory(id);
        if (!active || !current) { if (active) setError('This story is unavailable or was removed'); return; }
        setStory(current);
        const prior = await database.repository.recordVisit(id);
        if (active) setPreviousVisit(prior);
        await Promise.all([hydrateLocal(current), loadComments(current, !preferences.preloadComments)]);
        if (active) setLoading(false);
      } catch (reason) { if (active) { setError(reason instanceof Error ? reason.message : 'The story could not be loaded'); setLoading(false); } }
    })();
    return () => { active = false; };
  }, [database.repository, id, hydrateLocal, loadComments, preferences.preloadComments]);

  const rows = useMemo(() => story ? flattenComments(story.kids, comments, { opUser: story.by, seenBefore: previousVisit, collapsedIds: collapsed, savedIds: saved, maxDepth: preferences.commentMaxDepth ?? undefined }) : [], [story, comments, previousVisit, collapsed, saved, preferences.commentMaxDepth]);

  const toggleCollapsed = useCallback((commentId: number) => setCollapsed((existing) => { const next = new Set(existing); if (next.has(commentId)) next.delete(commentId); else next.add(commentId); return next; }), []);
  const toggleSavedComment = useCallback(async (commentId: number) => { const enabled = await database.repository.toggleSavedComment(commentId); setSaved((existing) => { const next = new Set(existing); if (enabled) next.add(commentId); else next.delete(commentId); return next; }); }, [database.repository]);
  const toggleBookmark = useCallback(async () => { const enabled = await database.repository.toggleBookmark(id); setBookmarked(enabled); }, [database.repository, id]);
  const toggleQueue = useCallback(async () => { const enabled = await database.repository.toggleQueue(id); setQueued(enabled); }, [database.repository, id]);
  const saveNote = useCallback(async (body: string) => { await database.repository.saveNote(id, body); setNote(body.trim()); }, [database.repository, id]);
  const saveTags = useCallback(async (values: string[]) => { await database.repository.setTags(id, values); setTags(await database.repository.getTags(id)); }, [database.repository, id]);
  const jumpTargets = useCallback((kind: CommentJumpKind) => commentJumpTargets(rows, kind), [rows]);

  return { story, rows, timeline, related, note, tags, bookmarked, queued, loading, commentsLoading, error, previousVisit, toggleCollapsed, toggleSavedComment, jumpTargets, toggleBookmark, toggleQueue, saveNote, saveTags, refresh };
}
