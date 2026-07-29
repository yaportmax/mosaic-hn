# Architecture

## Boundaries

Mosaic HN is split into independently testable units:

- `app/` contains Expo Router route composition only.
- `src/features/` owns screen-level behavior and presentation.
- `src/components/` contains trusted reusable UI primitives.
- `src/core/` contains deterministic parsing, ranking, filters, comment-tree logic, discovery, and export functions.
- `src/db/` contains the SQLite adapter and repositories.
- `src/state/` contains small external stores with immutable snapshots.
- `src/design/` resolves validated theme packages into runtime tokens and layouts.
- `theme-sdk/` is the public declarative theme contract.
- `themes/` contains bundled packages and the local registry.

Themes cannot import app modules, execute code, call network APIs, or access storage. They select bounded layouts and design tokens interpreted by trusted app components.

## Data flow

1. A screen requests cached data from `ReaderRepository`.
2. Cached stories render immediately when present.
3. A refresh calls the official Hacker News Firebase API.
4. Normalized items, feed IDs, and snapshots are committed to SQLite transactionally.
5. Pure feed ranking and rule evaluation create immutable view models.
6. FlashList renders stable keyed rows.
7. Local library actions update SQLite optimistically and never require a Mosaic service.

## Persistence

The SQLite adapter uses WAL mode, normal synchronous writes, a generic key/value table, and FTS5. Repository methods provide the domain contract so the storage layout can change without affecting screens.

Stored locally:

- Stories, comments, users, and feed caches.
- Locally observed score/rank/comment snapshots.
- Visits, bookmarks, queue entries, saved comments, notes, tags, collections, and hidden items.
- Feed presets, filter rules, preferences, and installed theme packages.

## Networking

Required endpoint family:

```text
https://hacker-news.firebaseio.com/v0/
```

Optional community registry endpoints must use HTTPS. Registry files and theme packages are static JSON. Package content is checked against the registry SHA-256 value before validation and installation.

## Failure behavior

- Feed refresh errors leave cached data visible.
- Story and profile refreshes return cached records when the network fails.
- Malformed API values are ignored or safely normalized.
- Theme installation is atomic and rejected on schema, compatibility, size, or contrast failures.
- Database transactions roll back on failure.
- Search, ranking, filters, and related-story discovery do not require a remote service.

## Platform behavior

Expo Router uses native stacks and system back gestures. Phone layouts use standard or floating tabs. Wide tablet layouts can use a left sidebar. Supported iOS versions with Liquid Glass render native glass surfaces when selected; other platforms receive the same tokens through opaque surfaces.

## Local feed archive

Each successful feed refresh replaces the snapshot for that feed and UTC date. The repository retains the newest 365 dates per feed and stores ordered story IDs rather than duplicating story records. Archive views resolve those IDs through batched local item reads, so they remain private and do not imply universal historical coverage.
