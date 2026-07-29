import { FEED_KINDS, type FeedKind, type HnItem, type HnUser } from './models.ts';
import { normalizeItem, normalizeUser } from './normalize.ts';

export interface HnClientOptions {
  baseUrl?: string;
  fetcher?: typeof fetch;
  concurrency?: number;
}

export async function mapConcurrent<T, R>(
  values: readonly T[],
  limit: number,
  mapper: (value: T, index: number) => Promise<R>
): Promise<R[]> {
  if (!Number.isInteger(limit) || limit < 1) throw new RangeError('Concurrency limit must be a positive integer');
  const output = new Array<R>(values.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, values.length) }, async () => {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= values.length) return;
      const value = values[index];
      if (value === undefined) continue;
      output[index] = await mapper(value, index);
    }
  });
  await Promise.all(workers);
  return output;
}

export class HnClient {
  readonly baseUrl: string;
  readonly concurrency: number;
  private readonly fetcher: typeof fetch;
  private readonly inFlight = new Map<string, Promise<unknown>>();

  constructor(options: HnClientOptions = {}) {
    this.baseUrl = (options.baseUrl ?? 'https://hacker-news.firebaseio.com/v0').replace(/\/$/, '');
    this.fetcher = options.fetcher ?? fetch;
    this.concurrency = Math.max(1, Math.trunc(options.concurrency ?? 12));
  }

  private async requestJson(path: string, signal?: AbortSignal): Promise<unknown> {
    const url = `${this.baseUrl}/${path.replace(/^\//, '')}`;
    const existing = this.inFlight.get(url);
    if (existing) return existing;
    const request = (async () => {
      const response = await this.fetcher(url, { signal, headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error(`Hacker News request failed (${response.status})`);
      return response.json() as Promise<unknown>;
    })();
    this.inFlight.set(url, request);
    try {
      return await request;
    } finally {
      this.inFlight.delete(url);
    }
  }

  async getFeedIds(feed: FeedKind, signal?: AbortSignal): Promise<number[]> {
    if (!FEED_KINDS.includes(feed)) return [];
    const endpoint: Record<FeedKind, string> = {
      top: 'topstories', new: 'newstories', best: 'beststories', ask: 'askstories', show: 'showstories', jobs: 'jobstories'
    };
    const raw = await this.requestJson(`${endpoint[feed]}.json`, signal);
    if (!Array.isArray(raw)) return [];
    return raw.filter((id): id is number => typeof id === 'number' && Number.isInteger(id) && id > 0);
  }

  async getItem(id: number, signal?: AbortSignal): Promise<HnItem | null> {
    if (!Number.isInteger(id) || id <= 0) return null;
    return normalizeItem(await this.requestJson(`item/${id}.json`, signal));
  }

  async getItems(ids: readonly number[], signal?: AbortSignal): Promise<HnItem[]> {
    const values = await mapConcurrent(ids, this.concurrency, (id) => this.getItem(id, signal));
    return values.filter((item): item is HnItem => item !== null);
  }

  async getUser(id: string, signal?: AbortSignal): Promise<HnUser | null> {
    const normalized = id.trim();
    if (!normalized) return null;
    return normalizeUser(await this.requestJson(`user/${encodeURIComponent(normalized)}.json`, signal));
  }

  async getMaxItemId(signal?: AbortSignal): Promise<number | null> {
    const raw = await this.requestJson('maxitem.json', signal);
    return typeof raw === 'number' && Number.isInteger(raw) && raw > 0 ? raw : null;
  }
}
