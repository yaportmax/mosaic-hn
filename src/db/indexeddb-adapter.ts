import { MemoryDatabaseAdapter } from './memory-adapter.ts';
import type { DatabaseAdapter } from './types.ts';

interface StoredRecord {
  id: string;
  table: string;
  key: string;
  value: unknown;
}

const DATABASE_NAME = 'mosaic-hn';
const STORE_NAME = 'records';
const DATABASE_VERSION = 1;
const recordId = (table: string, key: string): string => `${table}\u0000${key}`;

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Browser storage request failed'));
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error ?? new Error('Browser storage transaction was cancelled'));
    transaction.onerror = () => reject(transaction.error ?? new Error('Browser storage transaction failed'));
  });
}

async function openDatabase(): Promise<IDBDatabase> {
  const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
  request.onupgradeneeded = () => {
    if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
  };
  return requestResult(request);
}

export class IndexedDBDatabaseAdapter extends MemoryDatabaseAdapter {
  private constructor(private readonly database: IDBDatabase, initial: Map<string, Map<string, unknown>>) {
    super(initial);
  }

  static async open(): Promise<IndexedDBDatabaseAdapter> {
    const database = await openDatabase();
    const transaction = database.transaction(STORE_NAME, 'readonly');
    const records = await requestResult(transaction.objectStore(STORE_NAME).getAll()) as StoredRecord[];
    await transactionDone(transaction);
    const tables = new Map<string, Map<string, unknown>>();
    for (const record of records) {
      let table = tables.get(record.table);
      if (!table) { table = new Map(); tables.set(record.table, table); }
      table.set(record.key, record.value);
    }
    return new IndexedDBDatabaseAdapter(database, tables);
  }

  override async set<T>(table: string, key: string, value: T): Promise<void> {
    await super.set(table, key, value);
    const transaction = this.database.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put({ id: recordId(table, key), table, key, value: structuredClone(value) } satisfies StoredRecord);
    await transactionDone(transaction);
  }

  override async delete(table: string, key: string): Promise<void> {
    await super.delete(table, key);
    const transaction = this.database.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).delete(recordId(table, key));
    await transactionDone(transaction);
  }

  override async transaction<T>(work: (transaction: DatabaseAdapter) => Promise<T>): Promise<T> {
    const result = await super.transaction(work);
    const transaction = this.database.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.clear();
    for (const [tableName, records] of this.tables) {
      for (const [key, value] of records) {
        store.put({ id: recordId(tableName, key), table: tableName, key, value: structuredClone(value) } satisfies StoredRecord);
      }
    }
    await transactionDone(transaction);
    return result;
  }

  close(): void {
    this.database.close();
  }
}
