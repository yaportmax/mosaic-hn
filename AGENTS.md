# Agent Handoff: Mosaic HN

This repository is intended to be handed directly to Codex, Claude Code, or another coding agent.

## Mission

Finish validating, polishing, signing, and publishing Mosaic HN as a free, MIT-licensed Hacker News reader for iOS, iPadOS, and Android.

## Product principles

1. Buttery-smooth navigation, scrolling, gestures, and controls are non-negotiable.
2. The app is local-first and useful without accounts, subscriptions, analytics, ads, or proprietary cloud services.
3. Users can radically customize themes, layouts, navigation, gestures, feeds, and enabled modules.
4. Marketplace themes and shared setup packs are declarative data, never downloaded executable code.
5. Executable feature modules are open-source code reviewed and compiled into releases.
6. Disabled modules must stop their network, storage, command, gesture, and rendering work while preserving user data.
7. Do not add an AI assistant or any feature requiring external paid services.
8. Use the official Hacker News API honestly; do not invent unavailable data such as comment scores.

## Start here

Read in this order:

1. `docs/handoff/PROJECT_CONTEXT.md`
2. `docs/handoff/PROJECT_CONVERSATION.md`
3. `docs/ARCHITECTURE.md`
4. `docs/MODULES.md`
5. `docs/PERFORMANCE.md`
6. `docs/RELEASE_CHECKLIST.md`
7. `docs/VERIFICATION_REPORT.md`

Then run:

```bash
npm install
npx expo-doctor
npm run verify
npx expo export --platform all
```

## Immediate release blockers

- Generate and commit `package-lock.json` in a networked environment.
- Confirm every dependency resolves against Expo SDK 57.
- Run full dependency-aware TypeScript, lint, Expo Doctor, Metro export, and native builds.
- Configure EAS project IDs, Apple signing, Android signing, bundle identifiers, store records, and privacy disclosures.
- Test on at least one 120 Hz iPhone, one older iPhone, one iPad, and one lower-end Android phone.
- Profile feed and comment scrolling, memory, startup, offline behavior, and module enable/disable transitions.
- Complete TestFlight and Play internal-test passes before public release.

## Engineering constraints

- Node.js >= 22.14.
- Expo SDK 57 / React Native 0.86 / React 19.2 unless a verified upgrade is intentionally performed.
- Preserve the module registry and declarative theme boundaries.
- No WebView-based app shell.
- No hidden telemetry.
- Keep accessibility and reduced-motion/transparency behavior working.
- Add tests before changing core behavior.
- Do not claim release readiness without fresh device and build evidence.

## Useful commands

```bash
npm test
npm run typecheck:core
npm run typecheck:source
npm run validate:themes
npm run verify:source
npm run verify
npx expo-doctor
npx expo export --platform all
```

## Git state

The repository includes full Git history and tags through `v1.0.0-rc.2`. Continue on a new branch. Do not rewrite the existing history unless explicitly requested.

## Publishing this handoff repository

The repository was prepared with complete source, history, tags, and agent context. To publish it to the already-created GitHub repository:

### Windows PowerShell

```powershell
powershell -ExecutionPolicy Bypass -File scripts/publish-existing-github.ps1
```

### macOS/Linux

```bash
./scripts/publish-existing-github.sh
```

The scripts target `https://github.com/yaportmax/mosaic-hn.git`, rename the current branch to `main`, push the complete history, and push all tags.
