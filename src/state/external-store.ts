export interface ExternalStore<T> {
  getSnapshot(): T;
  subscribe(listener: () => void): () => void;
  setState(updater: T | ((state: T) => T)): void;
}

export function createExternalStore<T>(initialState: T): ExternalStore<T> {
  let state = initialState;
  const listeners = new Set<() => void>();
  return {
    getSnapshot: () => state,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    setState(updater) {
      const next = typeof updater === 'function' ? (updater as (value: T) => T)(state) : updater;
      if (Object.is(next, state)) return;
      state = next;
      for (const listener of [...listeners]) listener();
    }
  };
}
