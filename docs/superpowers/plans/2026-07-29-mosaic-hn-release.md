# Mosaic HN Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a store-oriented open-source Expo app implementing a local-first Hacker News reader and safe declarative theme ecosystem.

**Architecture:** Expo Router owns native navigation; SQLite repositories own persistence; pure core modules own API normalization, ranking, filtering, comment trees, discovery, export, and theme validation. FlashList renders immutable view models; small external stores isolate preference updates.

**Tech Stack:** Expo SDK 56, React Native 0.85, React 19.2, TypeScript, Expo Router, Expo SQLite, FlashList v2, Reanimated, Gesture Handler, Expo Glass Effect, Haptics, FileSystem, Sharing, and DocumentPicker.

## Tasks

- [ ] Repository/release configuration, documentation, CI, assets, and store metadata.
- [ ] Core HN models, defensive normalization, API client, ranking, filters, rules, related stories, comments, and export/import using test-first development.
- [ ] Declarative theme SDK, validation, resolution, hash verification, six built-ins, registry, CLI, and authoring guide.
- [ ] SQLite schema, migrations, repositories, in-memory contract adapter, cached-first data flow, snapshots, FTS, and library persistence.
- [ ] App bootstrap, theme/preferences stores, connectivity, feeds, story/comments, user, search, discovery, library, collections, filters, presets, settings, marketplace, and theme studio UI.
- [ ] Performance/offline polish, gestures, accessibility, Maestro flows, verification scripts, release checklist, and source archive.
