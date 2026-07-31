# Next Agent Tasks

Execute in this order and record evidence for every gate.

## 1. Restore dependencies

```bash
node --version
npm --version
npm install
```

Commit the generated `package-lock.json`. Resolve dependency mismatches using Expo SDK 57-compatible versions rather than broad unverified upgrades.

## 2. Run complete static verification

```bash
npm run verify
npm run lint
npx expo-doctor
npx expo export --platform all
```

Fix every error and material warning. Do not suppress diagnostics without documenting why.

## 3. Run the app

```bash
npx expo start
```

Verify Android locally and iOS through a development build or macOS/Xcode environment. Exercise every bundled module, theme, layout, import/export flow, and offline transition.

## 4. Performance profiling

Validate:

- Cold and warm startup
- 60/120 Hz feed scrolling
- Deep comment threads
- Memory over long sessions
- Theme switching
- Module enable/disable transitions
- Background ranking/filter work
- Offline startup and reconnection

Record device models, OS versions, traces, and before/after metrics in `docs/PERFORMANCE_RESULTS.md`.

## 5. Accessibility testing

Test VoiceOver, TalkBack, dynamic type, high contrast, reduced motion, reduced transparency, keyboard navigation, touch targets, and screen-reader ordering.

## 6. Configure publishing

- Select final app name and verify store/trademark availability.
- Confirm bundle IDs and Android application ID.
- Create Expo/EAS project and update project IDs.
- Configure Apple Developer and Google Play credentials.
- Generate development, preview, and production builds.
- Complete privacy nutrition labels/data safety forms from actual behavior.

## 7. Beta releases

Ship TestFlight and Play internal-testing builds. Run real-device regression passes and collect crash/performance feedback. Fix issues before marking a release candidate final.

## 8. Public open-source release

Create the GitHub repository, push full history and tags, enable Issues/Discussions, add screenshots, publish theme authoring examples, and create a signed GitHub Release.
