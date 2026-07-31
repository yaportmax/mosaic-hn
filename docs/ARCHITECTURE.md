# Architecture

## Boundaries

Mosaic HN is split into independently testable units:

- `app/` contains static Expo Router route composition and route guards only.
- `module-sdk/` contains the public built-in module contract, registry, configuration normalization, setup import/export, dependencies, placement, ordering, and recovery rules.
- `src/modules/` converts registry/configuration data into runtime navigation and capability decisions.
- `src/features/` owns screen-level behavior and presentation, including the module manager.
- `src/components/` contains trusted reusable UI primitives and registry-driven navigation surfaces.
- `src/core/` contains deterministic parsing, ranking, filters, comment-tree logic, discovery, gesture ownership, and export functions.
- `src/db/` contains the SQLite adapter and repositories.
- `src/state/` contains small external stores with immutable snapshots, including persisted module configuration.
- `src/design/` resolves validated theme packages into runtime tokens and layouts.
- `theme-sdk/` is the public declarative theme contract.
- `themes/` contains bundled packages and the local registry.

Themes cannot import application modules, execute code, call network APIs, or access storage. They select bounded layouts and design tokens interpreted by trusted app components.

Functional modules are compiled, reviewed application code. Runtime module setup is declarative: it selects which installed modules are enabled, where navigation modules appear, their ordering, and the home destination. Setup files cannot add executable code.

## Module composition

1. `ModuleConfigurationController` loads `settings/modules-v1` from local storage.
2. `normalizeModuleConfiguration()` validates known identifiers, restores required recovery modules, closes dependencies, repairs placement/order, and guarantees at least one visible tab.
3. `src/modules/runtime.ts` derives the active tabs, More entries, home route, and command destinations from the registry.
4. Static Expo Router files render only when their owning module is active; direct routes use `ModuleGate` to prevent bypassing configuration.
5. Capability checks remove owned actions and skip owned queries, writes, and network work.
6. Configuration changes publish immutable snapshots, so the shell and affected screens update together.

Feed and Modules are required. Modules remains reachable through a direct recovery route and the command palette even when its normal placement is hidden. Unknown module identifiers in imported setups are ignored, allowing configuration files to survive registry changes safely.

## Data flow

1. An enabled screen requests cached data from `ReaderRepository`.
2. Cached stories render immediately when present.
3. A refresh calls the official Hacker News Firebase API.
4. Normalized items and feed IDs are committed to SQLite transactionally.
5. Time Travel and Feed Algorithms independently opt into the snapshots they own.
6. Pure ranking and automation functions create immutable view models only when their modules are active; otherwise official source ordering and unfiltered stories are preserved.
7. FlashList renders stable keyed rows.
8. Local library actions update SQLite optimistically only when Library is active and never require a Mosaic service.

## Persistence

The SQLite adapter uses WAL mode, normal synchronous writes, a generic key/value table, and FTS5. Repository methods provide the domain contract so the storage layout can change without affecting screens.

Stored locally:

- Stories, comments, users, and feed caches.
- Locally observed score/rank/comment snapshots when an enabled module requires them.
- Visits, bookmarks, queue entries, saved comments, notes, tags, collections, and hidden items.
- Feed presets, filter rules, preferences, installed theme packages, and module configuration.

Disabling a module stops new work owned by that module but does not delete existing local data. Re-enabling it restores access to the retained state.

## Networking

Required endpoint family:

```text
https://hacker-news.firebaseio.com/v0/
```

Optional community theme registry endpoints must use HTTPS. Registry files and theme packages are static JSON. Package content is checked against the registry SHA-256 value before validation and installation.

Module configuration and setup import/export require no network service. Mosaic HN does not download executable feature modules.

## Failure behavior

- Feed refresh errors leave cached data visible.
- Story and profile refreshes return cached records when the network fails.
- Malformed API values are ignored or safely normalized.
- Module setup import is rejected when malformed, unsupported, oversized, or over its record bounds.
- Module normalization restores required modules, dependencies, a visible tab, and a valid home destination.
- Theme installation is atomic and rejected on schema, compatibility, size, or contrast failures.
- Database transactions roll back on failure.
- Search, ranking, filters, related-story discovery, and module setup do not require a remote Mosaic service.

## Platform behavior

Expo Router uses native stacks and system back gestures. Registry-derived navigation modules can appear in phone tabs, the More destination, or a wide-tablet sidebar. Supported iOS versions with Liquid Glass render native glass surfaces when selected; other platforms receive the same tokens through opaque surfaces.

The route graph is static for native reliability and deep linking, while module configuration controls whether each route is reachable and whether its behavior runs. This avoids dynamic code loading without sacrificing user-controlled composition.

## Local feed archive

When Time Travel is enabled, each successful feed refresh replaces the snapshot for that feed and UTC date. The repository retains the newest 365 dates per feed and stores ordered story IDs rather than duplicating story records. Archive views resolve those IDs through batched local item reads, so they remain private and do not imply universal historical coverage.

When Time Travel is disabled, daily archive writes stop. Story snapshots remain active only when Feed Algorithms requires ranking-growth observations.
