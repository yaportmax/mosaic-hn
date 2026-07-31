import assert from 'node:assert/strict';
import test from 'node:test';
import { foregroundFor } from './contrast.ts';

test('chooses dark text for bright accents', () => {
  assert.equal(foregroundFor('#FF8A4C'), '#101012');
  assert.equal(foregroundFor('#FFD60A'), '#101012');
});

test('chooses light text for dark accents', () => {
  assert.equal(foregroundFor('#0057B8'), '#FFFFFF');
  assert.equal(foregroundFor('#171719'), '#FFFFFF');
});
