import type {
  CollectionRecord,
  FeedKind,
  FeedPreset,
  FeedWeights,
  FilterCondition,
  FilterRule,
  LibraryBookmark,
  LibraryExportV1,
  NoteRecord,
  QueueEntry,
  RuleAction,
  SavedComment,
  Story,
  TagRecord
} from './models.ts';
import { FEED_KINDS } from './models.ts';
import { safeRegex } from './filters.ts';

const MAX_IMPORT_BYTES = 5_000_000;
const MAX_LIST_RECORDS = 50_000;
const MAX_STRUCTURED_RECORDS = 5_000;
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const STORY_TYPES = new Set<Story['hnType']>(['story', 'job', 'poll', 'pollopt']);
const FEEDS = new Set<FeedKind>(FEED_KINDS);
const WEIGHT_KEYS: Array<keyof FeedWeights> = ['recency', 'score', 'discussion', 'growth', 'preferred', 'keyword'];

function fail(path: string, message: string): never {
  throw new Error(`Invalid library export: ${path} ${message}`);
}

function record(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(path, 'must be an object');
  return value as Record<string, unknown>;
}

function array(value: unknown, path: string, maximum = MAX_LIST_RECORDS): unknown[] {
  if (!Array.isArray(value)) fail(path, 'must be an array');
  if (value.length > maximum) fail(path, `exceeds the ${maximum.toLocaleString()} record limit`);
  return value;
}

function integer(value: unknown, path: string, minimum = 0, maximum = Number.MAX_SAFE_INTEGER): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < minimum || value > maximum) fail(path, `must be an integer between ${minimum} and ${maximum}`);
  return value;
}

function finite(value: unknown, path: string, minimum: number, maximum: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < minimum || value > maximum) fail(path, `must be between ${minimum} and ${maximum}`);
  return value;
}

function text(value: unknown, path: string, maximum: number, allowEmpty = false): string {
  if (typeof value !== 'string') fail(path, 'must be text');
  const normalized = value.trim();
  if (!allowEmpty && !normalized) fail(path, 'cannot be empty');
  if (normalized.length > maximum) fail(path, `exceeds ${maximum} characters`);
  return normalized;
}

function identifier(value: unknown, path: string): string {
  const normalized = text(value, path, 128);
  if (!ID_PATTERN.test(normalized)) fail(path, 'contains unsupported characters');
  return normalized;
}

function normalizeTimestampEntry(value: unknown, path: string): LibraryBookmark {
  const source = record(value, path);
  return { itemId: integer(source.itemId, `${path}.itemId`, 1), createdAt: integer(source.createdAt, `${path}.createdAt`) };
}

function newestByItemId<T extends LibraryBookmark | QueueEntry | SavedComment>(values: readonly T[]): T[] {
  const byItem = new Map<number, T>();
  for (const value of values) {
    const existing = byItem.get(value.itemId);
    if (!existing || value.createdAt >= existing.createdAt) byItem.set(value.itemId, value);
  }
  return [...byItem.values()].sort((a, b) => a.itemId - b.itemId);
}

function stringList(value: unknown, path: string, maximumEntries = 100, maximumLength = 128): string[] {
  const values = array(value, path, maximumEntries).map((entry, index) => text(entry, `${path}[${index}]`, maximumLength).toLowerCase());
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function normalizeCollection(value: unknown, path: string): CollectionRecord {
  const source = record(value, path);
  const createdAt = integer(source.createdAt, `${path}.createdAt`);
  const updatedAt = integer(source.updatedAt, `${path}.updatedAt`);
  if (updatedAt < createdAt) fail(`${path}.updatedAt`, 'cannot be earlier than createdAt');
  const itemIds = array(source.itemIds, `${path}.itemIds`, 10_000).map((entry, index) => integer(entry, `${path}.itemIds[${index}]`, 1));
  return { id: identifier(source.id, `${path}.id`), name: text(source.name, `${path}.name`, 120), createdAt, updatedAt, itemIds: [...new Set(itemIds)] };
}

function normalizeNote(value: unknown, path: string): NoteRecord {
  const source = record(value, path);
  return { itemId: integer(source.itemId, `${path}.itemId`, 1), body: text(source.body, `${path}.body`, 100_000), updatedAt: integer(source.updatedAt, `${path}.updatedAt`) };
}

function normalizeTag(value: unknown, path: string): TagRecord {
  const source = record(value, path);
  return { itemId: integer(source.itemId, `${path}.itemId`, 1), tags: stringList(source.tags, `${path}.tags`, 100, 64) };
}

function normalizePreset(value: unknown, path: string): FeedPreset {
  const source = record(value, path);
  const rawWeights = record(source.weights, `${path}.weights`);
  const weights = Object.fromEntries(WEIGHT_KEYS.map((key) => [key, finite(rawWeights[key], `${path}.weights.${key}`, 0, 10)])) as unknown as FeedWeights;
  return {
    id: identifier(source.id, `${path}.id`),
    name: text(source.name, `${path}.name`, 120),
    weights,
    recencyHalfLifeHours: finite(source.recencyHalfLifeHours, `${path}.recencyHalfLifeHours`, 0.25, 720),
    preferredDomains: stringList(source.preferredDomains, `${path}.preferredDomains`),
    preferredAuthors: stringList(source.preferredAuthors, `${path}.preferredAuthors`),
    preferredKeywords: stringList(source.preferredKeywords, `${path}.preferredKeywords`)
  };
}

function normalizeCondition(value: unknown, path: string): FilterCondition {
  const source = record(value, path);
  const type = source.type;
  if (type === 'keyword' || type === 'domain' || type === 'author') return { type, value: text(source.value, `${path}.value`, 256) };
  if (type === 'regex') {
    const pattern = text(source.value, `${path}.value`, 256);
    const flags = source.flags === undefined ? undefined : text(source.flags, `${path}.flags`, 6, true);
    if (!safeRegex(pattern, flags ?? '')) fail(`${path}.value`, 'is not a supported safe regular expression');
    return flags ? { type, value: pattern, flags } : { type, value: pattern };
  }
  if (type === 'storyType') {
    if (typeof source.value !== 'string' || !STORY_TYPES.has(source.value as Story['hnType'])) fail(`${path}.value`, 'is not a supported story type');
    return { type, value: source.value as Story['hnType'] };
  }
  if (type === 'minScore') return { type, value: finite(source.value, `${path}.value`, 0, 1_000_000_000) };
  if (type === 'maxAgeHours') return { type, value: finite(source.value, `${path}.value`, 0, 876_000) };
  if (type === 'feed') {
    if (typeof source.value !== 'string' || !FEEDS.has(source.value as FeedKind)) fail(`${path}.value`, 'is not a supported feed');
    return { type, value: source.value as FeedKind };
  }
  fail(`${path}.type`, 'is not supported');
}

function normalizeAction(value: unknown, path: string): RuleAction {
  const source = record(value, path);
  const type = source.type;
  if (type === 'hide' || type === 'save' || type === 'queue') return { type };
  if (type === 'boost' || type === 'demote') return { type, amount: finite(source.amount, `${path}.amount`, 0, 1_000) };
  if (type === 'tag') return { type, value: text(source.value, `${path}.value`, 64).toLowerCase() };
  fail(`${path}.type`, 'is not supported');
}

function normalizeRule(value: unknown, path: string): FilterRule {
  const source = record(value, path);
  if (typeof source.enabled !== 'boolean') fail(`${path}.enabled`, 'must be true or false');
  const conditions = array(source.conditions, `${path}.conditions`, 20).map((entry, index) => normalizeCondition(entry, `${path}.conditions[${index}]`));
  if (conditions.length === 0) fail(`${path}.conditions`, 'must contain at least one condition');
  return { id: identifier(source.id, `${path}.id`), name: text(source.name, `${path}.name`, 120), enabled: source.enabled, conditions, action: normalizeAction(source.action, `${path}.action`) };
}

function ensureUniqueIds<T extends { id: string }>(values: readonly T[], path: string): T[] {
  const ids = new Set<string>();
  for (const value of values) {
    if (ids.has(value.id)) fail(path, `contains duplicate id ${value.id}`);
    ids.add(value.id);
  }
  return [...values];
}

export function exportLibraryJson(payload: LibraryExportV1): string {
  return JSON.stringify(payload, null, 2);
}

export function importLibraryJson(value: string): LibraryExportV1 {
  if (new TextEncoder().encode(value).byteLength > MAX_IMPORT_BYTES) fail('', `exceeds the ${MAX_IMPORT_BYTES.toLocaleString()} byte limit`);
  let parsed: unknown;
  try { parsed = JSON.parse(value); } catch { throw new Error('Invalid JSON'); }
  const source = record(parsed, 'root');
  if (source.version !== 1) throw new Error(`Unsupported library export version: ${String(source.version)}`);
  const exportedAt = integer(source.exportedAt, 'exportedAt');
  const bookmarks = newestByItemId(array(source.bookmarks, 'bookmarks').map((entry, index) => normalizeTimestampEntry(entry, `bookmarks[${index}]`)));
  const queue = newestByItemId(array(source.queue, 'queue').map((entry, index) => normalizeTimestampEntry(entry, `queue[${index}]`)));
  const savedComments = newestByItemId(array(source.savedComments, 'savedComments').map((entry, index) => normalizeTimestampEntry(entry, `savedComments[${index}]`)));
  const collections = ensureUniqueIds(array(source.collections, 'collections', MAX_STRUCTURED_RECORDS).map((entry, index) => normalizeCollection(entry, `collections[${index}]`)), 'collections');
  const notesByItem = new Map<number, NoteRecord>();
  for (const note of array(source.notes, 'notes').map((entry, index) => normalizeNote(entry, `notes[${index}]`))) {
    const existing = notesByItem.get(note.itemId);
    if (!existing || note.updatedAt >= existing.updatedAt) notesByItem.set(note.itemId, note);
  }
  const tagsByItem = new Map<number, Set<string>>();
  for (const tag of array(source.tags, 'tags').map((entry, index) => normalizeTag(entry, `tags[${index}]`))) {
    const merged = tagsByItem.get(tag.itemId) ?? new Set<string>();
    for (const value of tag.tags) merged.add(value);
    tagsByItem.set(tag.itemId, merged);
  }
  const tags = [...tagsByItem].map(([itemId, values]) => ({ itemId, tags: [...values].sort((a, b) => a.localeCompare(b)) })).sort((a, b) => a.itemId - b.itemId);
  const presets = ensureUniqueIds(array(source.presets, 'presets', MAX_STRUCTURED_RECORDS).map((entry, index) => normalizePreset(entry, `presets[${index}]`)), 'presets');
  const rules = ensureUniqueIds(array(source.rules, 'rules', MAX_STRUCTURED_RECORDS).map((entry, index) => normalizeRule(entry, `rules[${index}]`)), 'rules');
  return {
    version: 1,
    exportedAt,
    bookmarks,
    queue,
    savedComments,
    collections,
    notes: [...notesByItem.values()].sort((a, b) => a.itemId - b.itemId),
    tags,
    presets,
    rules
  };
}

const escapeMarkdown = (value: string): string => value.replace(/([\\[\]_*`])/g, '\\$1').replace(/\r?\n/g, ' ');

export interface MarkdownCollection {
  name: string;
  items: Array<{ id: number; title: string; note?: string }>;
}

export function exportCollectionMarkdown(collection: MarkdownCollection): string {
  const lines = [`# ${escapeMarkdown(collection.name)}`, ''];
  for (const item of collection.items) {
    lines.push(`- [${escapeMarkdown(item.title)}](https://news.ycombinator.com/item?id=${item.id})`);
    if (item.note?.trim()) lines.push(`  - ${escapeMarkdown(item.note.trim())}`);
  }
  return `${lines.join('\n')}\n`;
}
