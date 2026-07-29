import { HnClient } from '../core/hn-api.ts';
import { ReaderRepository } from './reader-repository.ts';
import { SQLiteDatabaseAdapter } from './sqlite-adapter.ts';

export interface AppDatabase {
  adapter: SQLiteDatabaseAdapter;
  repository: ReaderRepository;
  close(): Promise<void>;
}

export async function openAppDatabase(): Promise<AppDatabase> {
  const adapter = await SQLiteDatabaseAdapter.open();
  const repository = new ReaderRepository(adapter, new HnClient({ concurrency: 12 }));
  return { adapter, repository, close: () => adapter.close() };
}
