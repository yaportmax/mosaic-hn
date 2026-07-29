# Verification report

**Project:** Mosaic HN 1.0.0  
**Verification date:** July 29, 2026  
**Framework target:** Expo SDK 57 / React Native 0.86  
**Status:** Source release candidate. Signed store binaries are not represented as verified.

## Fresh verification evidence

The release-candidate tree was checked with `npm run verify` after the final source changes:

- **68 automated tests passed; 0 failed, skipped, cancelled, or marked unfinished.**
- Strict TypeScript checking passed for the dependency-free core, repository contracts, state stores, theme SDK, and validation scripts.
- TypeScript/TSX source parsing passed across the application tree.
- All six bundled theme packages passed schema, compatibility, contrast, layout, and metadata validation.
- All six bundled marketplace entries passed identifier and SHA-256 integrity validation.
- Source verification confirmed 41 required release files, resolvable relative imports, declared external packages, mobile identifiers, safe Liquid Glass guards, complete theme-layout usage, bounded persistence, and CI release gates.
- `git diff --check` passed and the unfinished-marker scan found no product-source unfinished implementation markers.

The repository contains 149 source, test, documentation, configuration, and release-material files before generated archives.

## Dependency-installation result in this environment

A fresh `npm install --no-audit --no-fund` was attempted after the source checks. It exited with status 1 because the sandbox forces npm through an internal Artifactory registry that returned:

```text
E404 Not Found ... /npm-public/@expo%2fvector-icons
'@expo/vector-icons@^15.0.2' is not in this registry.
```

This is an environment package-registry limitation, not a passing dependency build. Consequently, this report does **not** claim that the following dependency-aware gates ran locally:

- Lockfile generation.
- Full Expo-aware application TypeScript checking.
- ESLint against installed Expo packages.
- `expo-doctor`.
- Metro production exports.
- EAS native builds.

The included GitHub Actions workflow runs the dependency-aware type check, Expo Doctor, and iOS/Android production exports when the source is published in an environment with npm access.

## Checks requiring publisher credentials or devices

The following remain external release gates and cannot be certified from this Linux sandbox:

- Apple and Google signing, EAS project linkage, and signed native builds.
- App Store Connect and Google Play submission/review.
- Physical-device frame pacing, cold start, memory, accessibility, backgrounding, rotation, split view, and poor-network testing.
- Availability of the final product name and `com.maxyaport.mosaichn` identifiers.

The publisher-facing steps and device matrix are in `docs/RELEASE_CHECKLIST.md` and `docs/PERFORMANCE.md`.

## Product boundaries confirmed

- Hacker News is the only required network service.
- The optional theme marketplace is a static HTTPS registry; bundled and file-imported themes remain usable without it.
- Marketplace packages are declarative JSON, size bounded, HTTPS-only, schema validated, and SHA-256 checked. They cannot execute code or directly access network/storage APIs.
- There is no proprietary account, subscription, advertising, analytics, crash reporting, AI service, or downloaded executable plug-in system.
- Hacker News voting, replies, and account actions open trusted Hacker News web pages because the official API is read-only.
- Comment scores and universal historical front pages are not fabricated; timelines and time travel use local observations.

## Publisher decisions

- Confirm the working public name **Mosaic HN** and final icon treatment.
- Verify Apple Developer and Google Play identifier availability.
- Publish the source repository, then replace or confirm repository/support URLs.
- Generate and commit a lockfile from a working npm environment.
- Complete dependency-aware CI, signed builds, the physical-device matrix, TestFlight/Play internal testing, and store review before calling a binary a final public release.
