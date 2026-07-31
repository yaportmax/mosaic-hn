# Performance contract

Smooth interaction is a product requirement, not an optional optimization.

## Implementation rules

- Use native-stack transitions and system back gestures.
- Render feeds and flattened comment trees with FlashList 2.
- Keep stable item IDs, memoized row components, immutable view models, and stable callbacks.
- Run network requests with bounded concurrency and deduplicate identical in-flight requests.
- Use cached-first rendering and transactionally batch SQLite writes.
- Keep gesture recognition and direct-manipulation animations on the native UI runtime through Gesture Handler and Reanimated.
- Avoid synchronous network work and unbounded tree recursion.
- Disable or shorten decorative motion when the platform or user requests reduced motion.
- Disable glass and transparency when reduced transparency is active.

## Release budgets

Measure production builds on physical devices. The target budgets are:

- Cached feed content visible within 250 ms after the app JavaScript runtime is ready.
- Tap-to-navigation feedback within 100 ms.
- No sustained JavaScript task longer than 16 ms while scrolling.
- 60 Hz devices maintain at least 58 rendered frames per second during normal feed scrolling.
- 120 Hz iPhones maintain at least 110 rendered frames per second during normal feed scrolling.
- Less than 1% visibly dropped frames across a 60-second feed and comment-scroll trace.
- A 500-story custom re-rank completes without blocking a visible interaction frame.
- A 3,000-comment cached tree opens progressively and remains scrollable while missing branches load.
- Warm navigation never displays a full-screen spinner when cached data exists.
- Record cold-start and steady-state memory before release; investigate any sustained growth across ten feed/story navigation cycles.
- Re-run the memory trace after every Expo, Hermes, Reanimated, or Worklets upgrade.

## Physical test matrix

- One current 120 Hz iPhone.
- One older 60 Hz iPhone supported by iOS 16.4.
- One current high-end Android phone.
- One low- or mid-range Android phone.
- One iPad in portrait, landscape, split view, and hardware-keyboard use.

Test with normal network, high latency, packet loss, airplane mode, large text, VoiceOver/TalkBack, reduced motion, reduced transparency, high contrast, and screen rotation.

## Storage bounds

Story timelines are capped at 256 observations, captured no more than once every 30 minutes. Feed time-travel archives are capped at 365 UTC dates per feed, with one snapshot replacing earlier captures on the same date.
