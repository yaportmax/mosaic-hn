import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Comment, CommentRow, Story, StorySnapshot } from '../core/models.ts';
import { commentJumpTargets, flattenComments, type CommentJumpKind } from '../core/comments.ts';
import { findRelatedStories, type RelatedStory } from '../core/related.ts';
import { useAppServices, useModuleEnabled, usePreferences } from '../app/AppServices.tsx';
import { createStoryCapabilityPlan } from '../modules/capabilities.ts';

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
  const commentsEnabled = useModuleEnabled('comments');
  const discoveryEnabled = useModuleEnabled('discovery');
  const libraryEnabled = useModuleEnabled('library');
  const archiveEnabled = useModuleEnabled('archive');
  const capabilityPlan = useMemo(() => createStoryCapabilityPlan({
    comments: commentsEnabled,
    discovery: discoveryEnabled,
    library: libraryEnabled,
    archive: archiveEnabled
  }), [archiveEnabled, commentsEnabled, discoveryEnabled, libraryEnabled]);
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
      capabilityPlan.loadTimeline ? database.repository.getStoryTimeline(current.id) : Promise.resolve([]),
      capabilityPlan.loadRelated ? database.repository.getAllCachedStories() : Promise.resolve([]),
      capabilityPlan.loadSavedComments ? database.repository.getSavedCommentIds() : Promise.resolve(new Set<number>()),
      capabilityPlan.loadLibrary ? database.repository.getNote(current.id) : Promise.resolve(null),
      capabilityPlan.loadLibrary ? database.repository.getTags(current.id) : Promise.resolve([]),
      capabilityPlan.loadLibrary ? database.repository.isBookmarked(current.id) : Promise.resolve(false),
      capabilityPlan.loadLibrary ? database.repository.isQueued(current.id) : Promise.resolve(false)
    ]);
    setTimeline(snapshots);
    setRelated(capabilityPlan.loadRelated ? findRelatedStories(current, allStories).slice(0, 8) : []);
    setSaved(savedIds);
    setNote(noteValue?.body ?? '');
    setTags(tagValues);
    setBookmarked(isBookmarked);
    setQueued(isQueued);
  }, [capabilityPlan, database.repository]);

  const loadComments = useCallback(async (current: Story, cachedOnly = false) => {
    if (!capabilityPlan.loadComments || current.kids.length === 0) { setComments(new Map()); setCommentsLoading(false); return; }
    setCommentsLoading(true);
    try {
      const result = await database.repository.loadDiscussion(current, {
        batchSize: 24,
        cachedOnly,
        onBatch(batch) { setComments((existing) => { const next = new Map(existing); for (const comment of batch) next.set(comment.id, comment); return next; }); }
      });
      setComments(new Map(result));
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

  const rows = useMemo(() => capabilityPlan.loadComments && story ? flattenComments(story.kids, comments, { opUser: story.by, seenBefore: previousVisit, collapsedIds: collapsed, savedIds: saved, maxDepth: preferences.commentMaxDepth ?? undefined }) : [], [capabilityPlan.loadComments, story, comments, previousVisit, collapsed, saved, preferences.commentMaxDepth]);

  const toggleCollapsed = useCallback((commentId: number) => { if (!capabilityPlan.loadComments) return; setCollapsed((existing) => { const next = new Set(existing); if (next.has(commentId)) next.delete(commentId); else next.add(commentId); return next; }); }, [capabilityPlan.loadComments]);
  const toggleSavedComment = useCallback(async (commentId: number) => { if (!capabilityPlan.loadSavedComments) return; const enabled = await database.repository.toggleSavedComment(commentId); setSaved((existing) => { const next = new Set(existing); if (enabled) next.add(commentId); else next.delete(commentId); return next; }); }, [capabilityPlan.loadSavedComments, database.repository]);
  const toggleBookmark = useCallback(async () => { if (!capabilityPlan.loadLibrary) return; const enabled = await database.repository.toggleBookmark(id); setBookmarked(enabled); }, [capabilityPlan.loadLibrary, database.repository, id]);
  const toggleQueue = useCallback(async () => { if (!capabilityPlan.loadLibrary) return; const enabled = await database.repository.toggleQueue(id); setQueued(enabled); }, [capabilityPlan.loadLibrary, database.repository, id]);
  const saveNote = useCallback(async (body: string) => { if (!capabilityPlan.loadLibrary) return; await database.repository.saveNote(id, body); setNote(body.trim()); }, [capabilityPlan.loadLibrary, database.repository, id]);
  const saveTags = useCallback(async (values: string[]) => { if (!capabilityPlan.loadLibrary) return; await database.repository.setTags(id, values); setTags(await database.repository.getTags(id)); }, [capabilityPlan.loadLibrary, database.repository, id]);
  const jumpTargets = useCallback((kind: CommentJumpKind) => commentJumpTargets(rows, kind), [rows]);

  return { story, rows, timeline, related, note, tags, bookmarked, queued, loading, commentsLoading, error, previousVisit, toggleCollapsed, toggleSavedComment, jumpTargets, toggleBookmark, toggleQueue, saveNote, saveTags, refresh };
}
