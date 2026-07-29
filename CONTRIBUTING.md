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
- Add or update tests for domain, repository, module, theme, and state changes.
- Validate all themes and run Expo-aware TypeScript checking.
- Include before/after captures for visual changes.
- Avoid proprietary backends, tracking, advertising, remote executable theme code, and remote executable module code.
- Document schema changes and preserve backward compatibility where practical.

## Theme contributions

Use the static package format in `docs/THEME_AUTHORING.md`. Every submitted theme must identify its author, semantic version, minimum app version, and license, and must pass validation and accessibility contrast checks.

## Module contributions

Read `docs/MODULES.md` before changing the built-in module registry. Functional modules are trusted source code compiled into a reviewed application release; the portable setup format never downloads executable JavaScript or native code.

A new navigation module normally requires:

- A validated definition in `module-sdk/registry.ts` with stable ownership, dependencies, placement, route, icon, and keywords.
- A focused screen under `src/features/` and a static destination under `app/`.
- A `ModuleGate` on direct and secondary entry points.
- Capability checks around every owned command, setting, gesture, query, write, network request, and visible action.
- Tests covering registry validation, configuration normalization, dependency cascades, recovery, and behavioral gating.
- Updates to `docs/MODULES.md`, `docs/ARCHITECTURE.md`, release checks, and `scripts/verify-source.mjs`.

Capability modules follow the same ownership rules but expose no navigation route. Disabling a module must stop its owned work without deleting retained local state. Avoid unrelated cross-module dependencies; declare every required module explicitly.
