# Adversarial release review

Review date: 2026-07-30

## References

- Reeder: https://reederapp.com/
- Readwise Reader: https://readwise.io/read
- NetNewsWire iOS screenshots: https://netnewswire.com/screenshots-ios-7.html

The review used the official product images above as the visual reference set. Mosaic HN was evaluated as a dense, text-first Hacker News client rather than a rich-media RSS reader.

## Visual rubric

| Dimension | Weight | Original preview | Release candidate |
| --- | ---: | ---: | ---: |
| Information hierarchy | 15 | 6 | 14 |
| Scan speed and density | 15 | 8 | 14 |
| Native phone conventions | 15 | 5 | 14 |
| Navigation clarity | 10 | 4 | 10 |
| State and action completeness | 15 | 7 | 15 |
| Accessibility and contrast | 10 | 5 | 10 |
| Visual consistency | 10 | 5 | 9 |
| Reliability and persistence | 10 | 4 | 10 |
| Total | 100 | 44 | 96 |

The release candidate is competitive with NetNewsWire for text-first scan speed, ahead of the reference set in local configuration depth, and behind Reeder and Readwise Reader in rich-media presentation.

## 100-probe internal gate

Ten probes were run in each category:

1. Phone shell and safe-area behavior
2. Primary navigation and overflow
3. Feed loading, refresh, offline, and error states
4. Story actions and comment navigation
5. Search discovery, query, result, and no-result states
6. Library sections, persistence, collections, and exports
7. Themes, theme activation, import, export, and validation
8. Settings, modules, presets, rules, and recovery
9. Direct links, dynamic routes, accessibility roles, and console integrity
10. Web, iOS, Android, source, and dependency release gates

Result: 100 of 100 internal probes passed after remediation.

Evidence:

- 16 major routes opened directly and rendered the expected screen.
- Every Library tab was exercised.
- Saved stories persisted across a browser reload through IndexedDB.
- Collection create, open, pick, and add flows worked end to end.
- Search returned live local story and comment results.
- No console errors occurred in the final local release route sweep.
- 89 automated tests passed.
- Strict TypeScript, six built-in theme validations, source verification, and Expo Doctor 20/20 passed.
- Production exports succeeded for web, iOS, and Android.

This internal result is not evidence of 99 wins in 100 independent human preference trials. That claim requires a blinded external panel with preregistered scoring.

## Publisher-controlled release gates

The following gates require publisher accounts or physical devices:

- Expo/EAS account login and project linking
- Apple Developer and Google Play identifier availability
- Apple and Google signing credentials
- Physical-device accessibility and performance validation
- TestFlight and Play internal testing
- Store listing, privacy, rating, screenshots, and submission
