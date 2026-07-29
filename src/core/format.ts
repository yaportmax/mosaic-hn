import type { FeedKind, Story } from './models.ts';

export function formatCompactNumber(value: number): string {
  const number = Math.max(0, Math.trunc(value));
  if (number < 1_000) return String(number);
  if (number < 1_000_000) return `${(number / 1_000).toFixed(number < 10_000 ? 1 : 0).replace(/\.0$/, '')}k`;
  return `${(number / 1_000_000).toFixed(number < 10_000_000 ? 1 : 0).replace(/\.0$/, '')}m`;
}

export function formatNumber(value: number, compact = true): string {
  const number = Math.max(0, Math.trunc(Number.isFinite(value) ? value : 0));
  return compact ? formatCompactNumber(number) : new Intl.NumberFormat().format(number);
}

export function formatRelativeTime(unixSeconds: number, nowSeconds = Math.floor(Date.now() / 1000)): string {
  const delta = Math.max(0, nowSeconds - unixSeconds);
  if (delta < 45) return 'now';
  if (delta < 3_600) return `${Math.floor(delta / 60)}m`;
  if (delta < 86_400) return `${Math.floor(delta / 3_600)}h`;
  if (delta < 2_592_000) return `${Math.floor(delta / 86_400)}d`;
  if (delta < 31_536_000) return `${Math.floor(delta / 2_592_000)}mo`;
  return `${Math.floor(delta / 31_536_000)}y`;
}

export const FEED_LABELS: Record<FeedKind, string> = {
  top: 'Top', new: 'New', best: 'Best', ask: 'Ask', show: 'Show', jobs: 'Jobs'
};

export function storyTypeLabel(story: Story): string | null {
  if (story.hnType === 'job') return 'JOB';
  if (/^ask hn:/i.test(story.title)) return 'ASK';
  if (/^show hn:/i.test(story.title)) return 'SHOW';
  if (story.hnType === 'poll') return 'POLL';
  return null;
}

export const hnItemUrl = (id: number): string => `https://news.ycombinator.com/item?id=${id}`;
export const hnUserUrl = (id: string): string => `https://news.ycombinator.com/user?id=${encodeURIComponent(id)}`;
