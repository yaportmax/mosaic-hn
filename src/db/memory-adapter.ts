import type { DatabaseAdapter, KeyValueRecord } from './types.ts';

const cloneTables = (source: Map<string, Map<string, unknown>>): Map<string, Map<string, unknown>> => {
  const copy = new Map<string, Map<string, unknown>>();
  for (const [table, records] of source) copy.set(table, new Map([...records].map(([key, value]) => [key, structuredClone(value)])));
  return copy;
};

export class MemoryDatabaseAdapter implements DatabaseAdapter {
  private tables: Map<string, Map<string, unknown>>;

  constructor(initial?: Map<string, Map<string, unknown>>) {
    this.tables = initial ? cloneTables(initial) : new Map();
  }

  private table(name: string): Map<string, unknown> {
    let table = this.tables.get(name);
    if (!table) { table = new Map(); this.tables.set(name, table); }
    return table;
  }

  async get<T>(table: string, key: string): Promise<T | undefined> {
    const value = this.table(table).get(key);
    return value === undefined ? undefined : structuredClone(value) as T;
  }

  async set<T>(table: string, key: string, value: T): Promise<void> {
    this.table(table).set(key, structuredClone(value));
  }

  async delete(table: string, key: string): Promise<void> { this.table(table).delete(key); }

  async scan<T>(table: string, prefix = ''): Promise<Array<KeyValueRecord<T>>> {
    return [...this.table(table).entries()]
      .filter(([key]) => key.startsWith(prefix))
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => ({ key, value: structuredClone(value) as T }));
  }

  async search<T>(table: string, query: string, limit = 100): Promise<Array<KeyValueRecord<T>>> {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return [];
    const records = await this.scan<T>(table);
    return records.filter((record) => JSON.stringify(record.value).toLowerCase().includes(normalized)).slice(0, limit);
  }

  async transaction<T>(work: (transaction: DatabaseAdapter) => Promise<T>): Promise<T> {
    const staged = new MemoryDatabaseAdapter(this.tables);
    const result = await work(staged);
    this.tables = cloneTables(staged.tables);
    return result;
  }
}
