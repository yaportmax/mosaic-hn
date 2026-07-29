import { useCallback, useEffect, useState } from 'react';
import type { CollectionRecord, Comment, Story } from '../core/models.ts';
import { useAppServices, useModuleEnabled } from '../app/AppServices.tsx';

export interface LibraryData {
  bookmarks: Story[];
  queue: Story[];
  history: Story[];
  collections: CollectionRecord[];
  savedComments: Comment[];
  loading: boolean;
  refresh(): Promise<void>;
}

export function useLibraryData(): LibraryData {
  const { database } = useAppServices();
  const commentsEnabled = useModuleEnabled('comments');
  const [bookmarks, setBookmarks] = useState<Story[]>([]);
  const [queue, setQueue] = useState<Story[]>([]);
  const [history, setHistory] = useState<Story[]>([]);
  const [collections, setCollections] = useState<CollectionRecord[]>([]);
  const [savedComments, setSavedComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [savedStories, queuedStories, recent, folders, commentIds] = await Promise.all([
      database.repository.getFlaggedStories('bookmarks'), database.repository.getFlaggedStories('queue'), database.repository.getRecentHistory(), database.repository.listCollections(), commentsEnabled ? database.repository.getSavedCommentIds() : Promise.resolve(new Set<number>())
    ]);
    const comments = commentsEnabled ? (await database.repository.getItems([...commentIds])).filter((item): item is Comment => item.kind === 'comment') : [];
    setBookmarks(savedStories); setQueue(queuedStories); setHistory(recent); setCollections(folders); setSavedComments(comments); setLoading(false);
  }, [commentsEnabled, database.repository]);

  useEffect(() => { void refresh(); }, [refresh]);
  return { bookmarks, queue, history, collections, savedComments, loading, refresh };
}
