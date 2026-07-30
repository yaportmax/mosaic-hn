import { Platform } from 'react-native';
import { HnClient } from '../core/hn-api.ts';
import { MemoryDatabaseAdapter } from './memory-adapter.ts';
import { IndexedDBDatabaseAdapter } from './indexeddb-adapter.ts';
import { ReaderRepository } from './reader-repository.ts';
import { SQLiteDatabaseAdapter } from './sqlite-adapter.ts';
import type { DatabaseAdapter } from './types.ts';

export interface AppDatabase {
  adapter: DatabaseAdapter;
  repository: ReaderRepository;
  close(): Promise<void>;
}

export async function openAppDatabase(): Promise<AppDatabase> {
  if (Platform.OS === 'web') {
    const adapter = typeof indexedDB === 'undefined'
      ? new MemoryDatabaseAdapter()
      : await IndexedDBDatabaseAdapter.open().catch(() => new MemoryDatabaseAdapter());
    const repository = new ReaderRepository(adapter, new HnClient({ concurrency: 12 }));
    return { adapter, repository, close: async () => { if (adapter instanceof IndexedDBDatabaseAdapter) adapter.close(); } };
  }
  const adapter = await SQLiteDatabaseAdapter.open();
  const repository = new ReaderRepository(adapter, new HnClient({ concurrency: 12 }));
  return { adapter, repository, close: () => adapter.close() };
}
