import test from 'node:test';
import assert from 'node:assert/strict';
import { formatNumber, formatTimeAgo } from './format.ts';

test('formatNumber uses compact notation only when requested', () => {
  assert.equal(formatNumber(1_234, true), '1.2k');
  assert.equal(formatNumber(1_234, false), '1,234');
});

test('formatNumber normalizes negative and fractional counters', () => {
  assert.equal(formatNumber(-4, false), '0');
  assert.equal(formatNumber(12.9, false), '12');
});

test('formatTimeAgo keeps the current moment grammatical', () => {
  assert.equal(formatTimeAgo(1_000, 1_020), 'now');
  assert.equal(formatTimeAgo(1_000, 1_045), '1m ago');
  assert.equal(formatTimeAgo(1_000, 1_120), '2m ago');
});
