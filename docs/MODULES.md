# Modules

Mosaic HN is both internally modular and user-configurable at runtime. Feature ownership is explicit: a module controls its navigation entry, commands, settings, data work, and visible actions. Disabling a module removes its behavior rather than merely hiding one screen.

## Built-in modules

| Module | Kind | Default placement | Responsibility |
| --- | --- | --- | --- |
| Feed | Required navigation | Tab | Official Hacker News feeds, refresh, cache, and story navigation. |
| Search | Navigation | Tab | Local full-text search across available cached content. |
| Library | Navigation | Tab | Bookmarks, queue, notes, tags, collections, and saved comments when Comments is enabled. |
| Time Travel | Navigation | More | Locally observed daily feed archives and story-position history. |
| Feed Algorithms | Navigation | More | Transparent local ranking presets and adjustable weights. |
| Filters & Automation | Navigation | More | Local hide, boost, demote, save, queue, and tagging rules. |
| Themes | Navigation | Tab | Built-in themes, declarative community themes, and the theme studio. |
| Settings | Navigation | Tab | Reading, gesture, accessibility, data, and application preferences. |
| Modules | Required navigation | More | Module enablement, placement, order, home screen, and setup exchange. |
| Comments | Capability | Hidden | Comment loading, threading, collapse controls, markers, and minimap. |
| Discovery | Capability | Hidden | User and domain pages, related stories, and contextual links. |

Navigation modules can be placed in the tab bar, the More destination, or hidden while remaining enabled. Capability modules do not own a destination; they add bounded behavior to other screens.

## Customizing the app

The Modules screen supports:

- Enabling or disabling every non-required module.
- Choosing Tab, More, or Hidden placement for each navigation module.
- Ordering Tab and More independently.
- Selecting any enabled navigation module as the home screen.
- Restoring the complete default setup.
- Exporting or importing a portable setup file.

Feed and Modules are required recovery modules. Configuration normalization restores required modules, enables declared dependencies, repairs invalid placements and ordering, and guarantees at least one visible tab. This means even malformed or hand-edited setup files cannot remove the route back to module management.

## Behavioral ownership

A disabled module stops the work it owns:

- Disabling Comments prevents comment-tree loading and removes comment-specific search, saving, and presentation.
- Disabling Discovery stops related-story scans and removes user/domain navigation.
- Disabling Library removes save, queue, notes, tags, collection actions, and their gesture choices.
- Disabling Time Travel stops daily archive writes and hides archive views and story timelines.
- Disabling Feed Algorithms preserves official Hacker News ordering and avoids ranking-preset and ranking-snapshot work.
- Disabling Filters & Automation bypasses filtering and automation rules, including hide, boost, demote, save, queue, and tag actions.
- Disabling Themes removes theme-management routes while retaining the currently resolved visual configuration.

Disabling a module does not delete its existing local data or preferences. Re-enabling it restores access to that state.

## Portable setup format

A module setup is declarative JSON containing only versioned identifiers, placement, ordering, and the selected home module:

```json
{
  "version": 1,
  "enabled": ["feed", "search", "themes", "modules", "comments"],
  "placements": {
    "feed": "tab",
    "search": "tab",
    "themes": "more",
    "modules": "more",
    "comments": "hidden"
  },
  "tabOrder": ["feed", "search"],
  "moreOrder": ["themes", "modules"],
  "homeModuleId": "feed"
}
```

Imports are size bounded, record bounded, schema checked, normalized against the installed registry, and ignore unknown module identifiers. Setup files cannot execute code, access storage, or make network requests.

## Adding modules to the source

Built-in functional modules are trusted application code and ship through a reviewed Mosaic HN release. A source contribution normally includes:

1. A `ModuleDefinition` in `module-sdk/registry.ts`.
2. A focused implementation under `src/features/` and any pure contracts under `src/core/`.
3. A static Expo Router destination for a navigation module.
4. Runtime guards for every owned action, command, setting, query, and write.
5. Unit tests for registry normalization, dependencies, data-work gating, and recovery behavior.
6. Source-verification and documentation updates.

The in-app exchange format intentionally does not download arbitrary JavaScript or native code. Unlimited code-level customization remains available by forking the MIT-licensed repository or by contributing a new built-in module for review. Declarative themes and portable module setups can be exchanged independently without rebuilding the app.
