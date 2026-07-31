import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryDatabaseAdapter } from './memory-adapter.ts';

test('memory adapter transactions roll back on failure', async () => {
  const db = new MemoryDatabaseAdapter();
  await assert.rejects(db.transaction(async (tx) => {
    await tx.set('settings', 'theme', 'classic');
    throw new Error('stop');
  }));
  assert.equal(await db.get('settings', 'theme'), undefined);
});

test('memory adapter supports atomic table records and prefix scans', async () => {
  const db = new MemoryDatabaseAdapter();
  await db.set('items', 'story:1', { id: 1 });
  await db.set('items', 'story:2', { id: 2 });
  await db.set('items', 'comment:3', { id: 3 });
  assert.deepEqual(await db.scan<{ id: number }>('items', 'story:'), [{ key: 'story:1', value: { id: 1 } }, { key: 'story:2', value: { id: 2 } }]);
});

test('memory adapter batch reads preserve requested unique order and omit missing records', async () => {
  const db = new MemoryDatabaseAdapter();
  await db.set('items', 'a', { id: 1 });
  await db.set('items', 'b', { id: 2 });

  assert.deepEqual(await db.getMany<{ id: number }>('items', ['b', 'missing', 'a', 'b']), [
    { key: 'b', value: { id: 2 } },
    { key: 'a', value: { id: 1 } }
  ]);
});
