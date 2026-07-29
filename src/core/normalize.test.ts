import test from 'node:test';
import assert from 'node:assert/strict';
import { extractDomain, htmlToPlainText, normalizeItem, normalizeUser } from './normalize.ts';

test('extractDomain removes www and lowercases host', () => {
  assert.equal(extractDomain('https://WWW.Example.COM/a?b=1'), 'example.com');
  assert.equal(extractDomain(undefined), null);
  assert.equal(extractDomain('not a url'), null);
});

test('htmlToPlainText preserves readable paragraphs and decodes entities', () => {
  assert.equal(htmlToPlainText('Hello &amp; <b>world</b><p>Next&nbsp;line</p>'), 'Hello & world\n\nNext line');
});

test('normalizeItem creates a defensive story and ignores malformed payloads', () => {
  const story = normalizeItem({ id: 42, type: 'story', title: ' Test ', by: 'max', time: 100, score: 12, descendants: 3, kids: [2, 3], url: 'https://example.com/x' });
  assert.ok(story && story.kind === 'story');
  assert.equal(story.title, 'Test');
  assert.equal(story.domain, 'example.com');
  assert.deepEqual(story.kids, [2, 3]);
  assert.equal(normalizeItem({ id: 'bad' }), null);
});

test('normalizeItem creates comments without pretending they have scores', () => {
  const comment = normalizeItem({ id: 9, type: 'comment', parent: 42, by: 'reader', time: 101, text: 'Hi', kids: [] });
  assert.ok(comment && comment.kind === 'comment');
  assert.equal('score' in comment, false);
});

test('normalizeUser clamps invalid values and removes malformed submitted ids', () => {
  assert.deepEqual(normalizeUser({ id: 'alice', created: 5, karma: 8, about: '<b>Hi</b>', submitted: [1, 'x', 2] }), {
    id: 'alice', created: 5, karma: 8, about: 'Hi', submitted: [1, 2]
  });
});
