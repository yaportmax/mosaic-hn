# Verification report

**Project:** Mosaic HN 1.0.0
**Verification date:** July 29, 2026
**Framework target:** Expo SDK 57 / React Native 0.86
**Candidate:** `v1.0.0-rc.2` modular source release
**Status:** Source release candidate. Signed store binaries are not represented as verified.

## Fresh verification evidence

The release-candidate tree was checked with `npm run verify` after the modular-app implementation and documentation changes:

- **86 automated tests passed; 0 failed, skipped, cancelled, or marked unfinished.**
- Module tests cover registry validation, required recovery modules, dependency closure and cascades, placement/order repair, visible-tab recovery, home routing, bounded setup import/export, persisted configuration, runtime composition, capability ownership, gesture ownership, data-work gating, official-order fallback, and disabled-automation bypass.
- Strict TypeScript checking passed for the dependency-free core, repository contracts, state stores, module SDK/runtime, theme SDK, and validation scripts.
- TypeScript/TSX source parsing passed across the application tree.
- All six bundled theme packages passed schema, compatibility, contrast, layout, and metadata validation.
- All six bundled marketplace entries passed identifier and SHA-256 integrity validation.
- Source verification confirmed **61 required release files**, resolvable relative imports, declared external packages, mobile identifiers, complete module registry/route guards/recovery contracts, safe Liquid Glass guards, complete theme-layout usage, bounded persistence, and CI release gates.
- `git diff --check` passed and the unfinished-marker scan found no product-source unfinished implementation markers.

The repository contains **166** source, test, documentation, configuration, and release-material files before generated archives.

## Modular-system boundaries confirmed

- Feed and Modules are required recovery modules; configuration normalization restores required modules, dependency closure, one visible tab, and a valid home route.
- Users can enable or disable non-required modules, choose Tab/More/Hidden placement, independently order Tab and More, select the home module, restore defaults, and export/import complete setups.
- Disabled modules stop their owned visible actions, commands, gesture choices, queries, writes, network work, and background work rather than only hiding a screen.
- Disabling Comments, Discovery, Library, Time Travel, Feed Algorithms, Filters & Automation, or Themes preserves existing local data and preferences for later restoration.
- Setup imports are declarative JSON, version checked, size bounded to 1,000,000 bytes, record bounded to 256 entries, normalized against the installed registry, and unable to execute code.
- Unknown module identifiers are ignored safely. Functional source modules remain reviewed, compiled application code; arbitrary executable community modules are not downloaded at runtime.

## Dependency-installation result in this environment

A fresh isolated `npm install --ignore-scripts --no-audit --no-fund --package-lock=false` was attempted after the source checks. It exited with status 1 because the sandbox forces npm through an internal Artifactory registry that returned:

```text
E404 Not Found ... /npm-public/@expo%2fvector-icons
'@expo/vector-icons@^15.0.2' is not in this registry.
```

This is an environment package-registry limitation, not a passing dependency build. Consequently, this report does **not** claim that the following dependency-aware gates ran locally:

- Lockfile generation.
- Full Expo-aware application TypeScript checking against installed package declarations.
- ESLint against installed Expo packages.
- `expo-doctor`.
- Metro production exports.
- EAS native builds.

The included GitHub Actions workflow runs the dependency-aware type check, Expo Doctor, and iOS/Android production exports when the source is published in an environment with npm access.

## Checks requiring publisher credentials or devices

The following remain external release gates and cannot be certified from this Linux sandbox:

- Apple and Google signing, EAS project linkage, and signed native builds.
- App Store Connect and Google Play submission/review.
- Physical-device frame pacing, cold start, memory, accessibility, backgrounding, rotation, split view, poor-network, and module-toggle testing.
- Availability of the final product name and `com.maxyaport.mosaichn` identifiers.

The publisher-facing steps and device matrix are in `docs/RELEASE_CHECKLIST.md` and `docs/PERFORMANCE.md`.

## Product boundaries confirmed

- Hacker News is the only required network service.
- The optional theme marketplace is a static HTTPS registry; bundled and file-imported themes remain usable without it.
- Theme packages are declarative JSON, size bounded, HTTPS-only, schema validated, and SHA-256 checked. They cannot execute code or directly access network/storage APIs.
- Module setup exchange is local and declarative. New executable feature modules are added through the MIT-licensed source tree and a reviewed app release, not through runtime code download.
- There is no proprietary account, subscription, advertising, analytics, crash reporting, AI service, or downloaded executable plug-in system.
- Hacker News voting, replies, and account actions open trusted Hacker News web pages because the official API is read-only.
- Comment scores and universal historical front pages are not fabricated; timelines and time travel use local observations.

## Publisher decisions

- Confirm the working public name **Mosaic HN** and final icon treatment.
- Verify Apple Developer and Google Play identifier availability.
- Publish the source repository, then replace or confirm repository/support URLs.
- Generate and commit a lockfile from a working npm environment.
- Complete dependency-aware CI, signed builds, the physical-device matrix, TestFlight/Play internal testing, and store review before calling a binary a final public release.

## Packaged-artifact verification

The tagged artifacts were independently checked after packaging:

- Annotated tag `v1.0.0-rc.2` resolves to commit `1d363aef0fb0fd0ad7502547fc56d00696350b22`.
- The source ZIP passed full compressed-data integrity testing and contains that commit identifier in its archive comment.
- The ZIP was extracted into a new temporary directory and `npm run verify` passed again with 86 tests and all source gates.
- The Git bundle passed `git bundle verify`, reported complete history, cloned into a new repository, passed `git fsck --full`, and checked out the expected tagged commit.
- The source ZIP, Git bundle, report, and full verification log are covered by the accompanying SHA-256 manifest.
