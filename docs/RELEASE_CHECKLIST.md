# Release checklist

## Automated source gates

- [x] Core domain tests cover normalization, networking, ranking, rules, comments, discovery, exports, repositories, preferences, themes, module configuration, module runtime composition, and capability ownership.
- [x] Built-in theme validation is automated.
- [x] Source integrity checks reject missing release files, unfinished markers, telemetry packages, excluded hosted-intelligence dependencies, incomplete module routes, and missing recovery contracts.
- [x] GitHub Actions is configured to run tests, strict dependency-aware TypeScript checking, theme validation, source verification, Expo Doctor, and production export after publication.

## Publisher setup

- [ ] Create or connect the EAS project and let Expo write its project identifier.
- [ ] Confirm the publisher-controlled identifier `com.maxyaport.mosaichn` is available in Apple Developer and Google Play.
- [ ] Configure Apple Developer and Google Play signing credentials.
- [ ] Confirm the final product name and repository URL.
- [ ] Host the optional public community registry or leave it unset for the first release.

## Physical-device validation

- [ ] Run the matrix and budgets in `docs/PERFORMANCE.md` using production builds.
- [ ] Test VoiceOver, TalkBack, Dynamic Type/font scaling, high contrast, reduced motion, and reduced transparency.
- [ ] Test cold start, cached warm start, airplane mode, poor network, interrupted refresh, and database migration.
- [ ] Test iPhone 60 Hz and 120 Hz scrolling and Android low/mid-range scrolling.
- [ ] Capture cold-start and steady-state memory traces across repeated feed/story/comment navigation.
- [ ] Test every built-in theme in light, dark, and applicable high-contrast modes.
- [ ] Import malformed, oversized, incompatible, low-contrast, and hash-mismatched theme packages.
- [ ] Enable and disable every non-required module and confirm all owned navigation, commands, settings, gestures, queries, writes, and network work follow the active setup.
- [ ] Verify dependency cascades, required recovery modules, hidden placements, home-screen changes, Tab/More ordering, phone overflow, and wide-tablet sidebar behavior.
- [ ] Import malformed, oversized, unsupported-version, unknown-module, dependency-incomplete, and no-visible-tab module setups and confirm deterministic recovery.
- [ ] Re-enable disabled modules and confirm retained library, archive, ranking, automation, theme, comment, and discovery state returns without data loss.

## Store material

- [ ] Capture final screenshots on required phone and tablet sizes.
- [ ] Review app description, subtitle, keywords, content rating, support URL, privacy policy, and copyright.
- [ ] Complete App Store privacy details and Google Play Data Safety from `docs/PRIVACY.md`.
- [ ] Confirm Hacker News/Y Combinator attribution and absence of implied affiliation.
- [ ] Run a TestFlight and Play internal-testing cycle before public rollout.

## Final commands

```bash
npm install
npm run verify
npx expo-doctor
npx expo export --platform ios --output-dir dist/ios
npx expo export --platform android --output-dir dist/android
npx eas-cli build --platform all --profile production
```
