import test from 'node:test';
import assert from 'node:assert/strict';
import { createStoryCapabilityPlan } from './capabilities.ts';

test('createStoryCapabilityPlan maps module enablement to owned data work', () => {
  assert.deepEqual(createStoryCapabilityPlan({ comments: true, discovery: true, library: true, archive: true }), {
    loadComments: true,
    loadRelated: true,
    loadTimeline: true,
    loadLibrary: true,
    loadSavedComments: true
  });

  assert.deepEqual(createStoryCapabilityPlan({ comments: false, discovery: false, library: false, archive: false }), {
    loadComments: false,
    loadRelated: false,
    loadTimeline: false,
    loadLibrary: false,
    loadSavedComments: false
  });
});

test('saved comment state requires both Comments and Library modules', () => {
  assert.equal(createStoryCapabilityPlan({ comments: true, discovery: false, library: false, archive: true }).loadSavedComments, false);
  assert.equal(createStoryCapabilityPlan({ comments: false, discovery: false, library: true, archive: true }).loadSavedComments, false);
});
