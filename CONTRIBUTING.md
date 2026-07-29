# Contributing

Contributions are accepted through GitHub issues and pull requests.

## Development

```bash
npm install
npm run verify
npx expo start
```

Keep core behavior deterministic and covered by a failing test before implementation. UI changes must preserve cached-first behavior, accessibility, platform back gestures, and the performance contract.

## Pull requests

- Keep changes focused and explain user-visible behavior.
- Add or update tests for domain, repository, theme, and state changes.
- Validate all themes and run Expo-aware TypeScript checking.
- Include before/after captures for visual changes.
- Avoid proprietary backends, tracking, advertising, and remote executable theme code.
- Document schema changes and preserve backward compatibility where practical.

## Theme contributions

Use the static package format in `docs/THEME_AUTHORING.md`. Every submitted theme must identify its author, semantic version, minimum app version, and license, and must pass validation and accessibility contrast checks.
