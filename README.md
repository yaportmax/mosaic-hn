# Mosaic HN

Mosaic HN is a free, open-source Hacker News reader for iPhone, iPad, and Android. It is built with Expo and React Native, stores personal data locally, and reads public stories and discussions from the official Hacker News API.

[Open the interactive iPhone preview](https://mosaic-hn-phone.yaportmax.chatgpt.site/)

## Features

- Top, New, Best, Ask, Show, and Jobs feeds.
- Full Hacker News discussions with threaded comments and useful thread filters.
- Search across downloaded stories, comments, authors, and domains.
- A local Library for saved stories, Read later, history, and reading lists.
- Custom feed ranking with understandable controls:
  - Age `0` ignores age and includes all cached stories.
  - Age `1` uses a balanced freshness model.
  - Age `2` sorts strictly newest first.
  - Point and comment influence use real point and comment caps.
  - Trend, source, author, and keyword boosts use Off, Normal, or Strong.
- Six built-in themes plus a custom theme editor with a live, expandable preview.
- Light and dark appearance overrides, high contrast, reduced motion, reduced transparency, and haptic preferences.
- Configurable gesture shortcuts for opening, saving, sharing, hiding, or adding a story to Read later.
- Local-first persistence with SQLite on native platforms and IndexedDB on the web preview.
- JSON import and export for saved local data.
- No ads, analytics, subscription, Mosaic account, or proprietary backend.

## Navigation

The primary mobile navigation contains four destinations:

- Feed
- Search
- Library
- Settings

Themes, appearance, feed customization, accessibility, Hacker News account links, privacy, and data tools are organized under Settings.

## Hacker News account boundaries

The official Hacker News API is read-only. Reading works without an account. Mosaic HN opens the official Hacker News website for signing in, voting, replying, and submitting.

## Technology

- Expo SDK 57
- React Native 0.86
- React 19.2
- Expo Router
- Hermes and the React Native New Architecture
- FlashList 2
- Expo SQLite with FTS5
- React Native Gesture Handler and Reanimated
- Native Liquid Glass where supported, with a deterministic fallback

## Developer architecture

Mosaic HN retains the original user-facing module system contracts and declarative registry for capability ownership, dependency checks, compatibility, and future extension. The current shipped interface intentionally exposes four stable destinations instead of the earlier module manager.

## Run locally

Requirements: Node.js 22.14 or newer, npm, and an Expo development environment.

```bash
npm install
npx expo-doctor
npm run verify
npx expo start
```

For a native development client:

```bash
npx expo run:android

# macOS with Xcode
npx expo run:ios
```

Windows can be the primary development machine. Local iOS compilation and the iOS Simulator require macOS. EAS Build can create signed iOS builds after an Apple account and EAS project are configured.

## Verification

```bash
npm run verify
```

The verification suite covers core behavior, ranking, storage, state, themes, module contracts, TypeScript, theme registry integrity, and the checked-in source tree.

Production bundles can be exported with:

```bash
npx expo export --platform web
npx expo export --platform ios
npx expo export --platform android
```

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Modules](docs/MODULES.md)
- [Privacy](docs/PRIVACY.md)
- [Performance](docs/PERFORMANCE.md)
- [Theme authoring](docs/THEME_AUTHORING.md)
- [Release checklist](docs/RELEASE_CHECKLIST.md)
- [Verification report](docs/VERIFICATION_REPORT.md)
- [Contributing](CONTRIBUTING.md)
- [Security](SECURITY.md)

## License

MIT. Hacker News is operated by Y Combinator and is not affiliated with Mosaic HN.
