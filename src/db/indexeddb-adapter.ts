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

function isClosingConnectionError(reason: unknown): boolean {
  const name = reason instanceof DOMException ? reason.name : '';
  const message = reason instanceof Error ? reason.message.toLowerCase() : String(reason).toLowerCase();
  return name === 'InvalidStateError'
    || message.includes('connection is closing')
    || message.includes('connection is closed')
    || message.includes('database connection is closing');
}

export class IndexedDBDatabaseAdapter extends MemoryDatabaseAdapter {
  private database: IDBDatabase | null;
  private opening: Promise<IDBDatabase> | null = null;
  private closed = false;

  private constructor(database: IDBDatabase, initial: Map<string, Map<string, unknown>>) {
    super(initial);
    this.database = database;
    this.watch(database);
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

  private watch(database: IDBDatabase): void {
    database.onversionchange = () => {
      database.close();
      if (this.database === database) this.database = null;
    };
    database.onclose = () => {
      if (this.database === database) this.database = null;
    };
  }

  private async ensureDatabase(): Promise<IDBDatabase> {
    if (this.closed) throw new Error('Browser storage is closed');
    if (this.database) return this.database;
    if (!this.opening) {
      this.opening = openDatabase().then((database) => {
        this.database = database;
        this.watch(database);
        return database;
      }).finally(() => { this.opening = null; });
    }
    return this.opening;
  }

  private discard(database: IDBDatabase): void {
    if (this.database === database) this.database = null;
    try { database.close(); } catch { /* The browser may already be closing it. */ }
  }

  private async runTransaction<T>(
    mode: IDBTransactionMode,
    work: (store: IDBObjectStore) => T | Promise<T>
  ): Promise<T> {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const database = await this.ensureDatabase();
      try {
        const transaction = database.transaction(STORE_NAME, mode);
        const result = await work(transaction.objectStore(STORE_NAME));
        await transactionDone(transaction);
        return result;
      } catch (reason) {
        if (attempt === 0 && isClosingConnectionError(reason)) {
          this.discard(database);
          continue;
        }
        throw reason;
      }
    }
    throw new Error('Browser storage could not be reopened');
  }

  override async set<T>(table: string, key: string, value: T): Promise<void> {
    await super.set(table, key, value);
    await this.runTransaction('readwrite', (store) => {
      store.put({ id: recordId(table, key), table, key, value: structuredClone(value) } satisfies StoredRecord);
    });
  }

  override async delete(table: string, key: string): Promise<void> {
    await super.delete(table, key);
    await this.runTransaction('readwrite', (store) => {
      store.delete(recordId(table, key));
    });
  }

  override async transaction<T>(work: (transaction: DatabaseAdapter) => Promise<T>): Promise<T> {
    const result = await super.transaction(work);
    await this.runTransaction('readwrite', (store) => {
      store.clear();
      for (const [tableName, records] of this.tables) {
        for (const [key, value] of records) {
          store.put({ id: recordId(tableName, key), table: tableName, key, value: structuredClone(value) } satisfies StoredRecord);
        }
      }
    });
    return result;
  }

  close(): void {
    this.closed = true;
    this.database?.close();
    this.database = null;
  }
}
