import { useCallback, useEffect, useState } from 'react';
import type { CollectionRecord, Comment, Story } from '../core/models.ts';
import { useAppServices } from '../app/AppServices.tsx';

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
  const [bookmarks, setBookmarks] = useState<Story[]>([]);
  const [queue, setQueue] = useState<Story[]>([]);
  const [history, setHistory] = useState<Story[]>([]);
  const [collections, setCollections] = useState<CollectionRecord[]>([]);
  const [savedComments, setSavedComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [savedStories, queuedStories, recent, folders, commentIds] = await Promise.all([
      database.repository.getFlaggedStories('bookmarks'), database.repository.getFlaggedStories('queue'), database.repository.getRecentHistory(), database.repository.listCollections(), database.repository.getSavedCommentIds()
    ]);
    const comments = (await database.repository.getItems([...commentIds])).filter((item): item is Comment => item.kind === 'comment');
    setBookmarks(savedStories); setQueue(queuedStories); setHistory(recent); setCollections(folders); setSavedComments(comments); setLoading(false);
  }, [database.repository]);

  useEffect(() => { void refresh(); }, [refresh]);
  return { bookmarks, queue, history, collections, savedComments, loading, refresh };
}
