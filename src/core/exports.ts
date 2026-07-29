import type { LibraryExportV1 } from './models.ts';

const assertArray = (value: unknown, key: string): unknown[] => {
  if (!Array.isArray(value)) throw new Error(`Invalid library export: ${key} must be an array`);
  return value;
};

export function exportLibraryJson(payload: LibraryExportV1): string {
  return JSON.stringify(payload, null, 2);
}

export function importLibraryJson(text: string): LibraryExportV1 {
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { throw new Error('Invalid JSON'); }
  if (!parsed || typeof parsed !== 'object') throw new Error('Invalid library export');
  const record = parsed as Record<string, unknown>;
  if (record.version !== 1) throw new Error(`Unsupported library export version: ${String(record.version)}`);
  if (typeof record.exportedAt !== 'number' || !Number.isFinite(record.exportedAt)) throw new Error('Invalid library export: exportedAt');
  for (const key of ['bookmarks', 'queue', 'savedComments', 'collections', 'notes', 'tags', 'presets', 'rules']) assertArray(record[key], key);
  return parsed as LibraryExportV1;
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
