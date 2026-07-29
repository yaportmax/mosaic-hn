# Mosaic HN Theme SDK

Mosaic themes are declarative JSON packages. They can replace the visual shell, feed density, story presentation, comments, navigation, typography, motion, color, spacing, effects, and component variants without executing downloaded code.

## Authoring

1. Copy `example-theme.json`.
2. Give `manifest.id` a reverse-domain identifier that you control.
3. Change tokens and select supported layouts.
4. Run `npm run validate:themes` for bundled themes, or run the validator against your package when using the SDK as a workspace dependency.
5. Include an MIT-compatible or otherwise clearly stated license.
6. Submit the JSON, preview images, SHA-256 hash, and registry entry to the public theme registry repository.

## Safety boundary

Theme packages cannot add JavaScript, access app storage, issue requests, inject URLs, or define new trusted actions. The application owns data, navigation, external links, voting/reply handoff, and persistence. A theme only chooses validated tokens and trusted layout variants.

## Supported layouts

- Shell: `tabs`, `floating-tabs`, `sidebar`
- Feed: `compact`, `comfortable`, `cards`, `magazine`
- Story: `line`, `row`, `card`, `editorial`
- Comments: `threads`, `ledger`, `conversation`
- Navigation: `standard`, `floating`, `minimal`
- Metadata: `inline`, `stacked`, `footer`

Accessibility settings can force opaque surfaces, eliminate motion, thicken borders, and select high-contrast variants.
