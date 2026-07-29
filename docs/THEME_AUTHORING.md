# Theme authoring

A Mosaic HN theme is a declarative JSON package. It can produce a substantially different application shell while remaining inspectable and safe.

## Package shape

```json
{
  "manifest": {
    "id": "com.example.paper-dark",
    "name": "Paper Dark",
    "author": "Example Author",
    "version": "1.0.0",
    "minAppVersion": "1.0.0",
    "license": "MIT",
    "description": "Editorial layout with restrained motion"
  },
  "tokens": {
    "light": {},
    "dark": {},
    "highContrastLight": {},
    "highContrastDark": {}
  },
  "layout": {
    "shell": "floating-tabs",
    "feed": "magazine",
    "story": "editorial",
    "comments": "conversation",
    "navigation": "floating",
    "metadata": "footer"
  }
}
```

Start with `theme-sdk/example-theme.json` or duplicate a bundled theme.

## Layout values

- Shell: `tabs`, `floating-tabs`, `sidebar`
- Feed: `compact`, `comfortable`, `cards`, `magazine`
- Story: `line`, `row`, `card`, `editorial`
- Comments: `threads`, `ledger`, `conversation`
- Navigation: `standard`, `floating`, `minimal`
- Metadata: `inline`, `stacked`, `footer`

## Tokens

Every scheme defines:

- Colors: background, surface, text, muted text, accent, border, success, warning, and danger.
- Typography: system/rounded/serif/monospace family, scale, title weight, and body weight.
- Spacing: base unit and density.
- Shape: corner radius and border width.
- Effects: glass eligibility, blur amount, and shadow strength.
- Motion: duration scale and spring damping.

The runtime applies accessibility overrides after package resolution. A theme cannot force motion or transparency when the user has disabled it.

## Validation

```bash
npm run validate:themes
```

Validation enforces identifiers, semantic versions, compatibility, package size, enum values, numeric ranges, required tokens, and readable text contrast. Invalid packages are never partially installed.

## Static marketplace

A marketplace is an HTTPS JSON document:

```json
{
  "version": 1,
  "updatedAt": "2026-07-29T00:00:00Z",
  "themes": [
    {
      "id": "com.example.paper-dark",
      "version": "1.0.0",
      "name": "Paper Dark",
      "author": "Example Author",
      "downloadUrl": "./paper-dark.json",
      "sha256": "64-lowercase-hex-characters",
      "minAppVersion": "1.0.0"
    }
  ]
}
```

`downloadUrl` may be absolute HTTPS or relative to the registry URL. Compute SHA-256 over the exact downloaded JSON text. Mosaic HN verifies the digest, parses the package, runs full validation, and then writes it atomically.

## Submission model

Community maintainers can accept pull requests containing a theme JSON file, preview assets, license information, and a registry entry. Because the marketplace is static, it can be mirrored or self-hosted without application-server code.

## Security boundary

Themes cannot execute JavaScript, ship native modules, read files, access SQLite, issue network requests, alter trusted actions, or bypass accessibility settings. Developers who need arbitrary behavior can fork the MIT-licensed application and distribute a separate build.
