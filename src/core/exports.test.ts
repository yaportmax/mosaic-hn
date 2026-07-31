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

test('importLibraryJson rejects malformed nested records and unsafe rules', () => {
  const base = { version: 1, exportedAt: 123, bookmarks: [], queue: [], savedComments: [], collections: [], notes: [], tags: [], presets: [], rules: [] };
  assert.throws(() => importLibraryJson(JSON.stringify({ ...base, bookmarks: [{ itemId: -1, createdAt: 10 }] })), /bookmarks\[0\]\.itemId/);
  assert.throws(() => importLibraryJson(JSON.stringify({ ...base, presets: [{ id: 'bad', name: 'Bad', weights: { recency: -1, score: 1, discussion: 1, growth: 1, preferred: 1, keyword: 1 }, recencyHalfLifeHours: 12, preferredDomains: [], preferredAuthors: [], preferredKeywords: [] }] })), /presets\[0\]\.weights\.recency/);
  assert.throws(() => importLibraryJson(JSON.stringify({ ...base, rules: [{ id: 'rule', name: 'Unsafe', enabled: true, conditions: [{ type: 'regex', value: '(a+)+$' }], action: { type: 'hide' } }] })), /rules\[0\]\.conditions\[0\]\.value/);
});

test('importLibraryJson normalizes benign duplicates and tag casing', () => {
  const payload = importLibraryJson(JSON.stringify({
    version: 1, exportedAt: 123,
    bookmarks: [{ itemId: 7, createdAt: 10 }, { itemId: 7, createdAt: 12 }],
    queue: [], savedComments: [], collections: [], notes: [],
    tags: [{ itemId: 7, tags: [' Database ', 'database', 'READING'] }], presets: [], rules: []
  }));
  assert.deepEqual(payload.bookmarks, [{ itemId: 7, createdAt: 12 }]);
  assert.deepEqual(payload.tags, [{ itemId: 7, tags: ['database', 'reading'] }]);
});
