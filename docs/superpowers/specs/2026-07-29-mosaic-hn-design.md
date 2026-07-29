# Mosaic HN Design Specification

Mosaic HN is a free, MIT-licensed, local-first Hacker News reader for iOS, Android, iPad, and web. Its defining feature is a safe declarative theme/layout platform capable of making one installation look and behave like substantially different Hacker News clients.

## Principles

- No Mosaic account, proprietary backend, analytics, ads, subscription, or AI.
- The official Hacker News Firebase API is the only required network service.
- An optional static public GitHub registry distributes declarative themes; local import always works.
- Cached content, settings, feeds, filters, themes, bookmarks, collections, notes, and history live on-device.
- Themes control presentation but cannot execute code, perform network requests, or directly access storage.
- Navigation and direct manipulation must remain responsive; cached data renders before refresh work.
- Accessibility preferences override decorative theme choices.

## Platform

Expo SDK 56, React Native 0.85, React 19.2, Hermes, New Architecture, iOS 16.4+, Android 7+, API 36, responsive iPad/tablet support.

## Included capabilities

- Top, New, Best, Ask, Show, Jobs, and user-defined locally ranked feeds.
- Deterministic ranking explanations, filters, automation rules, and configurable gestures.
- Cached-first story and comment reading; branch collapse; OP/new/saved highlights; minimap and jump controls.
- Local FTS search, related stories, domain/author/topic views, locally observed story timelines, and local archive dates.
- Bookmarks, queue, saved comments, history, notes, tags, collections, JSON import/export, and Markdown export.
- Six built-in themes, four feed layouts, three comment layouts, theme studio, marketplace/import, schema validation, compatibility checks, and accessibility audits.
- Native Liquid Glass on supported iOS versions with graceful non-glass fallbacks.
- FlashList, native stack navigation, Reanimated gestures, stable immutable view models, SQLite WAL/batching, and bounded API concurrency.

## Truth constraints

The HN API is read-only and does not expose comment scores. Voting/reply actions open trusted HN web pages. Universal historical front pages and arbitrary third-party article extraction are not claimed. Historical views are limited to data archived by the installation.

## Release gates

Pure core tests, theme validation, strict TypeScript, source-integrity checks, dependency/Expo Doctor checks, production EAS builds, physical-device performance checks, VoiceOver/TalkBack, Dynamic Type/font scaling, reduced motion/transparency, high contrast, offline/poor-network behavior, iPad split view and keyboard checks, and publisher-provided store signing/metadata.
