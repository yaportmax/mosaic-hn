# Project Conversation Record

This is a focused reconstruction of the product conversation relevant to Mosaic HN. It excludes unrelated personal conversations and private model reasoning.

## Platform decision

**User:** Wants a really good free open-source Hacker News iOS Swift-native reader and asks whether it can be built on Windows.

**Decision:** Native Swift/iOS requires Xcode and macOS for the iOS SDK, Simulator, signing, TestFlight, and App Store builds. A cross-platform approach allows Windows-first development.

**User:** Asks about an app that runs on both iPhone and Android.

**Decision:** React Native + Expo + TypeScript selected over a Swift-only app. Expo EAS can build iOS remotely from Windows, though a Mac remains useful for advanced iOS debugging.

**User:** Asks how much worse React Native/Expo is than Swift on iPhone.

**Decision:** For a Hacker News reader, a well-built Expo app should be close enough that most users will not notice, while Swift retains an edge in platform-perfect polish, startup, memory, and immediate access to new Apple APIs.

## Customization vision

**User:** Wants fully and deeply customizable themes and layouts: full Liquid Glass, entirely different visual systems, large cards, compact lines, extensive colors, layouts, and component options.

**Decision:** Build layered customization:

- Layout presets and structure
- Visual tokens and effects
- Component variants
- Platform-specific rendering and native glass where available

Use a constrained schema rather than an unrestricted runtime page builder so themes remain safe, fast, testable, and App Store-compatible.

**User:** Requires everything to be open source, with community themes submitted to a theme marketplace. Themes should be extensive enough to act as whole new visual wrappers.

**Decision:** Two extension levels:

1. Instant marketplace themes using declarative manifests/layout/tokens/assets.
2. Full executable code changes through forks or reviewed contributions compiled into releases.

Core rule: themes control presentation; trusted app core controls data, storage, actions, and platform access.

## Feature expansion

Features requested/accepted:

- Advanced comment explorer and minimap
- Local transparent custom feed algorithms
- Story timelines and locally observed history
- Excellent offline mode
- Deep filters and automation
- Topic/domain/company/user discovery
- Command palette, gestures, keyboard support, configurable navigation
- Collections, notes, tags, Markdown/JSON exports
- Local-only default and optional future open sync
- Time travel based on locally retained feed snapshots

AI tools were specifically excluded because they would add external dependencies.

## Performance requirement

**User:** “Buttery smooth app control and general navigation and controls are required.”

**Decision:** Performance is architectural, not cosmetic. Theme/module customization must not be allowed to compromise scrolling or navigation responsiveness. Ranking and data processing run away from the UI path; large lists use virtualization; disabled modules stop background work.

## Full-build request

**User:** Requests everything be fully built and made final-release ready.

**Result:** A broad Expo/React Native release candidate was produced with source tests, release docs, CI configuration, EAS profiles, theme SDK, module SDK, SQLite/local-first architecture, and release verification artifacts. Because package registry access and signing/device infrastructure were unavailable, the result was explicitly labeled a release candidate rather than a final signed store binary.

## Modularity request

**User:** Wants users to add/remove modules and customize the app exactly as desired.

**Decision and implementation direction:** Add a manifest-driven module registry with persistent enable/disable state, dependency-safe toggles, tab/more/hidden placement, ordering, configurable home module, setup import/export, default recovery, and behavioral gates. Feed and Module Manager remain non-removable recovery modules. Runtime-downloaded executable third-party modules remain prohibited; code modules are open-source contributions compiled into releases.

## Handoff request

**User:** Wants a single complete folder or a new GitHub repository suitable for Codex or Claude Code to finish and deploy.

**This package:** Contains full source, full Git history, tags, project context, conversation reconstruction, agent instructions, release artifacts, and deployment checklist.
