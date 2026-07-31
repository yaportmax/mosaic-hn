# Mosaic HN Project Context

## Original goal

Build a high-quality, free, fully open-source Hacker News reader that works on iPhone and Android and can primarily be developed from Windows. React Native with Expo was selected because it supports one codebase, native controls, Windows-first development, EAS cloud builds, and platform-specific native modules when needed.

## Core differentiator

Mosaic HN is not just a themed client. It is an open-source Hacker News interface platform where users can substantially change:

- Entire visual themes and design systems
- Feed density and layout
- Story-card composition
- Navigation shell and tab placement
- Comment-tree presentation
- Gestures and shortcuts
- Feed ranking and filtering
- Enabled product modules

Themes may look like completely distinct Hacker News applications: Liquid Glass, terminal, paper, classic, neon, compact lines, large cards, and future community designs.

## Safety boundary

The App Store build must not download arbitrary executable JavaScript or native code. Marketplace themes and setup packs are declarative JSON and static assets. New executable modules are contributed through the open-source repository, reviewed, and compiled into an app release. Forks can add arbitrary code.

## Required user experience

- Buttery-smooth app control, navigation, gestures, and 60/120 Hz scrolling
- Offline-first, cached-first behavior
- Instant-feeling transitions and minimal visible loading
- Native-feeling iOS and Android behavior
- Strong iPad support
- Accessibility, reduced motion, and reduced transparency support
- No account, subscription, ads, analytics, or proprietary backend required

## Included product scope

### Core feeds

Top, New, Best, Ask, Show, Jobs, plus custom local ranking presets.

### Comments

Threaded comments, collapsing by branch/depth, minimap, OP and selected-user highlighting, new-comment markers, saved comments, reading progress, and jump navigation.

### Reading and storage

Offline article/comment caching, bookmarks, reading queue, notes, tags, collections, history, full-text search, JSON backup/restore, and Markdown export.

### Feed customization

Transparent local ranking with adjustable recency, score, discussion, velocity, topic, author, domain, and keyword weights. Local filters and automation can hide, boost, demote, save, queue, or tag matching stories.

### Discovery

Topic/domain/user pages, related historical discussions, locally observed story timelines, score/comment growth, and time travel based on locally captured snapshots.

### Theme system

Six bundled themes, multiple layouts and component variants, theme studio, import/export, platform overrides, accessibility variants, and a static marketplace protocol with validation and SHA-256 verification.

### Module system

Users can enable/disable modules, move modules among Tabs/More/Hidden, reorder them, set the home screen, export/import setups, and restore defaults. Feed and Module Manager are required recovery modules. Disabling a module must stop its associated work but preserve its data.

## Explicitly excluded

- AI assistant, summarization, or features requiring paid/external model services
- Proprietary account service
- Mandatory cloud sync
- Downloaded executable themes or modules
- Fabricated comment scores or undocumented third-party HN archives

## Current status

The source release candidate is tagged `v1.0.0-rc.2`. Core source tests and static verification passed in the original environment, but npm dependency installation was blocked there. Treat the repository as an advanced release candidate, not a certified store-ready app.
