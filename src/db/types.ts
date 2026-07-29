export interface KeyValueRecord<T> { key: string; value: T }

export interface DatabaseAdapter {
  get<T>(table: string, key: string): Promise<T | undefined>;
  set<T>(table: string, key: string, value: T): Promise<void>;
  delete(table: string, key: string): Promise<void>;
  scan<T>(table: string, prefix?: string): Promise<Array<KeyValueRecord<T>>>;
  search?<T>(table: string, query: string, limit?: number): Promise<Array<KeyValueRecord<T>>>;
  transaction<T>(work: (transaction: DatabaseAdapter) => Promise<T>): Promise<T>;
}
