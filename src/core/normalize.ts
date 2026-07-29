import type { Comment, HnItem, HnItemRaw, HnUser, Story } from './models.ts';

const entityMap: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", '#39': "'", nbsp: ' '
};

const asFiniteNumber = (value: unknown, fallback = 0): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

const asNonNegativeInteger = (value: unknown, fallback = 0): number => {
  const number = asFiniteNumber(value, fallback);
  return number >= 0 ? Math.trunc(number) : fallback;
};

const asString = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : fallback;

const asIdArray = (value: unknown): number[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is number => typeof entry === 'number' && Number.isInteger(entry) && entry > 0);
};

export function extractDomain(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return hostname.startsWith('www.') ? hostname.slice(4) : hostname || null;
  } catch {
    return null;
  }
}

export function htmlToPlainText(input: string | undefined | null): string {
  if (!input) return '';
  const withBreaks = input
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\s*\/p\s*>/gi, '\n\n')
    .replace(/<\s*p(?:\s[^>]*)?>/gi, '')
    .replace(/<\s*li(?:\s[^>]*)?>/gi, '• ')
    .replace(/<\s*\/li\s*>/gi, '\n');
  const withoutTags = withBreaks.replace(/<[^>]*>/g, '');
  return withoutTags
    .replace(/&([a-zA-Z]+|#\d+|#x[0-9a-fA-F]+);/g, (match, entity: string) => {
      if (entity in entityMap) return entityMap[entity] ?? match;
      if (entity.startsWith('#x')) {
        const code = Number.parseInt(entity.slice(2), 16);
        return Number.isFinite(code) ? String.fromCodePoint(code) : match;
      }
      if (entity.startsWith('#')) {
        const code = Number.parseInt(entity.slice(1), 10);
        return Number.isFinite(code) ? String.fromCodePoint(code) : match;
      }
      return match;
    })
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function normalizeItem(raw: HnItemRaw | unknown): HnItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const source = raw as HnItemRaw;
  if (typeof source.id !== 'number' || !Number.isInteger(source.id) || source.id <= 0) return null;
  const type = asString(source.type);
  const deleted = source.deleted === true;
  const dead = source.dead === true;
  const by = asString(source.by, deleted ? '[deleted]' : '[unknown]').trim() || (deleted ? '[deleted]' : '[unknown]');
  const time = asNonNegativeInteger(source.time);
  const kids = asIdArray(source.kids);

  if (type === 'comment') {
    if (typeof source.parent !== 'number' || !Number.isInteger(source.parent) || source.parent <= 0) return null;
    const comment: Comment = {
      id: source.id,
      kind: 'comment',
      hnType: 'comment',
      parent: source.parent,
      by,
      time,
      text: htmlToPlainText(asString(source.text)),
      kids,
      deleted,
      dead
    };
    return comment;
  }

  if (type === 'story' || type === 'job' || type === 'poll' || type === 'pollopt') {
    const url = asString(source.url).trim();
    const text = htmlToPlainText(asString(source.text));
    const story: Story = {
      id: source.id,
      kind: 'story',
      hnType: type,
      title: asString(source.title, type === 'job' ? 'Untitled job' : 'Untitled story').trim() || 'Untitled story',
      by,
      time,
      score: asNonNegativeInteger(source.score),
      descendants: asNonNegativeInteger(source.descendants),
      kids,
      deleted,
      dead,
      domain: extractDomain(url || undefined)
    };
    if (url) story.url = url;
    if (text) story.text = text;
    if (typeof source.parent === 'number' && Number.isInteger(source.parent) && source.parent > 0) story.parent = source.parent;
    if (typeof source.poll === 'number' && Number.isInteger(source.poll) && source.poll > 0) story.poll = source.poll;
    const parts = asIdArray(source.parts);
    if (parts.length > 0) story.parts = parts;
    return story;
  }
  return null;
}

export function normalizeUser(raw: unknown): HnUser | null {
  if (!raw || typeof raw !== 'object') return null;
  const source = raw as Record<string, unknown>;
  const id = asString(source.id).trim();
  if (!id) return null;
  return {
    id,
    created: asNonNegativeInteger(source.created),
    karma: asNonNegativeInteger(source.karma),
    about: htmlToPlainText(asString(source.about)),
    submitted: asIdArray(source.submitted)
  };
}
