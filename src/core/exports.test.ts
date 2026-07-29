import test from 'node:test';
import assert from 'node:assert/strict';
import { exportLibraryJson, exportCollectionMarkdown, importLibraryJson } from './exports.ts';

test('library JSON export is stable and round trips supported records', () => {
  const payload = { version: 1 as const, exportedAt: 123, bookmarks: [{ itemId: 1, createdAt: 10 }], queue: [], savedComments: [], collections: [], notes: [], tags: [], presets: [], rules: [] };
  const text = exportLibraryJson(payload);
  assert.deepEqual(importLibraryJson(text), payload);
});

test('importLibraryJson rejects unknown versions', () => {
  assert.throws(() => importLibraryJson('{"version":99}'), /Unsupported/);
});

test('Markdown export escapes headings and includes canonical HN links', () => {
  const text = exportCollectionMarkdown({ name: 'Research', items: [{ id: 42, title: 'A [link]', note: 'Read this' }] });
  assert.ok(text.includes('A \\[link\\]'));
  assert.match(text, /news\.ycombinator\.com\/item\?id=42/);
});
