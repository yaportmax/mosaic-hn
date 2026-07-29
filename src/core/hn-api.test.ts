import test from 'node:test';
import assert from 'node:assert/strict';
import { HnClient, mapConcurrent } from './hn-api.ts';

test('mapConcurrent preserves order and never exceeds its limit', async () => {
  let active = 0;
  let maximum = 0;
  const output = await mapConcurrent([1, 2, 3, 4, 5], 2, async (value) => {
    active += 1;
    maximum = Math.max(maximum, active);
    await new Promise((resolve) => setTimeout(resolve, 4));
    active -= 1;
    return value * 2;
  });
  assert.deepEqual(output, [2, 4, 6, 8, 10]);
  assert.equal(maximum, 2);
});

test('HnClient deduplicates concurrent requests for the same resource', async () => {
  let calls = 0;
  const fetcher: typeof fetch = async () => {
    calls += 1;
    return new Response(JSON.stringify({ id: 1, type: 'story', title: 'A', time: 1 }), { status: 200 });
  };
  const client = new HnClient({ fetcher });
  const [a, b] = await Promise.all([client.getItem(1), client.getItem(1)]);
  assert.equal(calls, 1);
  assert.deepEqual(a, b);
});

test('HnClient returns an empty feed for malformed feed responses', async () => {
  const fetcher: typeof fetch = async () => new Response(JSON.stringify({ nope: true }), { status: 200 });
  const client = new HnClient({ fetcher });
  assert.deepEqual(await client.getFeedIds('top'), []);
});
