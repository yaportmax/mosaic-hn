import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import type { DatabaseAdapter, KeyValueRecord } from './types.ts';

interface ValueRow { value: string }
interface KeyValueRow { key: string; value: string }

const INDEXED_TABLES = new Set(['items', 'notes', 'tags']);
const safeFtsQuery = (query: string): string => query.trim().split(/\s+/).map((term) => term.replace(/[^\p{L}\p{N}_.+-]/gu, '')).filter(Boolean).map((term) => `"${term.replace(/"/g, '""')}"*`).join(' AND ');

export class SQLiteDatabaseAdapter implements DatabaseAdapter {
  private readonly database: SQLiteDatabase;

  private constructor(database: SQLiteDatabase) {
    this.database = database;
  }

  static async open(name = 'mosaic-hn.db'): Promise<SQLiteDatabaseAdapter> {
    const database = await openDatabaseAsync(name);
    const adapter = new SQLiteDatabaseAdapter(database);
    await adapter.migrate();
    return adapter;
  }

  private async migrate(): Promise<void> {
    await this.database.execAsync(`
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = NORMAL;
      PRAGMA foreign_keys = ON;
      CREATE TABLE IF NOT EXISTS kv (
        table_name TEXT NOT NULL,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL,
        PRIMARY KEY (table_name, key)
      );
      CREATE INDEX IF NOT EXISTS kv_table_updated ON kv(table_name, updated_at DESC);
      CREATE VIRTUAL TABLE IF NOT EXISTS search_index USING fts5(
        table_name UNINDEXED,
        key UNINDEXED,
        body,
        tokenize='unicode61 remove_diacritics 2'
      );
      CREATE TABLE IF NOT EXISTS schema_meta (version INTEGER NOT NULL);
      INSERT INTO schema_meta(version) SELECT 1 WHERE NOT EXISTS (SELECT 1 FROM schema_meta);
    `);
  }

  async get<T>(table: string, key: string): Promise<T | undefined> {
    const row = await this.database.getFirstAsync<ValueRow>('SELECT value FROM kv WHERE table_name = ? AND key = ?', table, key);
    return row ? JSON.parse(row.value) as T : undefined;
  }

  async set<T>(table: string, key: string, value: T): Promise<void> {
    const serialized = JSON.stringify(value);
    await this.database.runAsync(
      `INSERT INTO kv(table_name, key, value, updated_at) VALUES (?, ?, ?, ?)
       ON CONFLICT(table_name, key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      table, key, serialized, Math.floor(Date.now() / 1000)
    );
    if (INDEXED_TABLES.has(table)) {
      await this.database.runAsync('DELETE FROM search_index WHERE table_name = ? AND key = ?', table, key);
      await this.database.runAsync('INSERT INTO search_index(table_name, key, body) VALUES (?, ?, ?)', table, key, serialized);
    }
  }

  async delete(table: string, key: string): Promise<void> {
    await this.database.runAsync('DELETE FROM kv WHERE table_name = ? AND key = ?', table, key);
    if (INDEXED_TABLES.has(table)) await this.database.runAsync('DELETE FROM search_index WHERE table_name = ? AND key = ?', table, key);
  }

  async scan<T>(table: string, prefix = ''): Promise<Array<KeyValueRecord<T>>> {
    const rows = prefix
      ? await this.database.getAllAsync<KeyValueRow>('SELECT key, value FROM kv WHERE table_name = ? AND key LIKE ? ORDER BY key', table, `${prefix}%`)
      : await this.database.getAllAsync<KeyValueRow>('SELECT key, value FROM kv WHERE table_name = ? ORDER BY key', table);
    return rows.map((row) => ({ key: row.key, value: JSON.parse(row.value) as T }));
  }

  async search<T>(table: string, query: string, limit = 100): Promise<Array<KeyValueRecord<T>>> {
    const ftsQuery = safeFtsQuery(query);
    if (!ftsQuery || !INDEXED_TABLES.has(table)) return [];
    try {
      const rows = await this.database.getAllAsync<KeyValueRow>(
        `SELECT kv.key, kv.value
         FROM search_index JOIN kv ON kv.table_name = search_index.table_name AND kv.key = search_index.key
         WHERE search_index MATCH ? AND search_index.table_name = ?
         ORDER BY bm25(search_index) LIMIT ?`,
        ftsQuery, table, Math.max(1, Math.trunc(limit))
      );
      return rows.map((row) => ({ key: row.key, value: JSON.parse(row.value) as T }));
    } catch {
      return [];
    }
  }

  async transaction<T>(work: (transaction: DatabaseAdapter) => Promise<T>): Promise<T> {
    let output!: T;
    await this.database.withTransactionAsync(async () => { output = await work(this); });
    return output;
  }

  async close(): Promise<void> { await this.database.closeAsync(); }
}
