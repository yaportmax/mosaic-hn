# Mosaic HN

Mosaic HN is a free, MIT-licensed Hacker News reader for iPhone, iPad, and Android. It is local-first, has no Mosaic account or proprietary backend, and treats themes as complete declarative visual wrappers rather than simple color palettes.

## What is included

- Top, New, Best, Ask, Show, and Jobs feeds from the official Hacker News API.
- Cached-first loading, SQLite WAL storage, full-text search, and offline discussion access.
- Local time travel through one observed snapshot per feed per UTC day, retained for up to 365 days.
- Transparent local feed algorithms with adjustable recency, points, discussion, growth, domain, author, and keyword weights.
- Local filters and automation that can hide, boost, demote, save, queue, or tag stories.
- Threaded comments with branch collapse, OP/new/saved highlighting, jump controls, and a minimap.
- Bookmarks, reading queue, saved comments, notes, tags, history, collections, JSON import/export, and Markdown collection export.
- Six substantially different built-in themes: Mosaic, Liquid, Classic, Paper, Terminal, and Neon.
- Four feed layouts, three comment layouts, multiple navigation shells, platform overrides, accessibility variants, and a complete theme studio.
- A safe community marketplace format based on static JSON registries and SHA-256 verified theme packages.
- Configurable swipe, double-tap, long-press, tab order, command palette, iPad sidebar, and keyboard-friendly navigation.
- No ads, analytics, subscription, cloud account, or downloaded executable theme code.

## Technology

- Expo SDK 57
- React Native 0.86 and React 19.2
- Expo Router native navigation
- Hermes and the React Native New Architecture
- FlashList 2 for feeds and comments
- Expo SQLite with FTS5
- Reanimated and Gesture Handler
- Native Liquid Glass on supported iOS versions with a deterministic fallback elsewhere

## Run locally

Requirements: Node.js 22.14 or newer, npm, and an Expo development environment.

```bash
npm install
npx expo-doctor
npm run verify
npx expo start
```

For a development client:

```bash
npx expo run:android
# macOS with Xcode:
npx expo run:ios
```

Windows can be the primary development machine. Local iOS compilation and the iOS Simulator require macOS, while EAS Build can create signed iOS builds remotely after an Apple account and EAS project are configured.

## Verification

```bash
npm test
npm run typecheck:core
npm run validate:themes
npm run verify:source
```

With dependencies installed, the release CI additionally runs strict Expo-aware TypeScript checking, Expo Doctor, and a production export.

## Theme development

Read [`docs/THEME_AUTHORING.md`](docs/THEME_AUTHORING.md) and [`theme-sdk/README.md`](theme-sdk/README.md). A marketplace theme is data, not executable code. It can replace layout choices, typography, color systems, surfaces, effects, spacing, motion, feed rows, comment presentation, and navigation style while the app retains control of network, storage, and trusted actions.

Validate all bundled themes:

```bash
npm run validate:themes
```

## Hacker News API boundaries

The official API is read-only. Mosaic HN opens Hacker News web pages for voting, replying, and account actions. The API does not expose comment scores, so the app never invents them. Historical timelines and time-travel views are based on snapshots captured by the local installation rather than an undeclared archive service.

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Privacy](docs/PRIVACY.md)
- [Performance](docs/PERFORMANCE.md)
- [Theme authoring](docs/THEME_AUTHORING.md)
- [Release checklist](docs/RELEASE_CHECKLIST.md)
- [Verification report](docs/VERIFICATION_REPORT.md)
- [Contributing](CONTRIBUTING.md)
- [Security](SECURITY.md)

## License

MIT. Hacker News is operated by Y Combinator and is not affiliated with Mosaic HN.
