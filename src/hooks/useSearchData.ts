import { useEffect, useMemo, useState } from 'react';
import type { HnItem, Story } from '../core/models.ts';
import { useAppServices } from '../app/AppServices.tsx';

export interface DomainCount { domain: string; count: number }

export function useSearchData(query: string) {
  const { database } = useAppServices();
  const [results, setResults] = useState<HnItem[]>([]);
  const [domains, setDomains] = useState<DomainCount[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    void database.repository.getAllCachedStories().then((stories) => {
      if (!active) return;
      const counts = new Map<string, number>();
      for (const story of stories) if (story.domain) counts.set(story.domain, (counts.get(story.domain) ?? 0) + 1);
      setDomains([...counts].map(([domain, count]) => ({ domain, count })).sort((a, b) => b.count - a.count || a.domain.localeCompare(b.domain)).slice(0, 30));
    });
    return () => { active = false; };
  }, [database.repository]);

  useEffect(() => {
    let active = true;
    const normalized = query.trim();
    if (!normalized) { setResults([]); setLoading(false); return; }
    setLoading(true);
    const timer = setTimeout(() => {
      void database.repository.searchItems(normalized, 120).then((items) => { if (active) setResults(items); }).finally(() => { if (active) setLoading(false); });
    }, 180);
    return () => { active = false; clearTimeout(timer); };
  }, [database.repository, query]);

  const stories = useMemo(() => results.filter((item): item is Story => item.kind === 'story'), [results]);
  const comments = useMemo(() => results.filter((item) => item.kind === 'comment'), [results]);
  return { results, stories, comments, domains, loading };
}
