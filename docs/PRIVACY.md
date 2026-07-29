# Privacy

Mosaic HN does not operate an account system or application backend.

## Data that stays on the device

- Reading history and position.
- Bookmarks, queue entries, saved comments, collections, notes, and tags.
- Cached Hacker News content and locally observed story snapshots.
- Feed algorithms, filters, gestures, module configuration, navigation placement/order, and installed themes.

The application does not include advertising, analytics, tracking SDKs, device identifiers, or cross-app tracking.

## Network requests

The app contacts the official Hacker News API to retrieve public Hacker News data. External article links open only after a user action. A user may configure an optional HTTPS static theme registry; the app then downloads its registry file and user-selected JSON theme packages.

No local search query, note, tag, rule, collection, module setup, or reading history is transmitted by Mosaic HN.

## Exports

Library, theme, and module-setup exports are initiated by the user through the platform share sheet. A module setup contains only declarative module identifiers, enablement, placement, ordering, and the selected home module. It does not include reading history, library content, executable code, credentials, or device identifiers.

Import files are size bounded and validated before they are merged, installed, or applied. Disabling a module retains its existing local data so it can be restored later; it does not transmit or erase that data.

## Platform declarations

The app does not use non-exempt encryption, health data, contacts, location, camera, microphone, photos, advertising identifiers, or background tracking. Platform privacy declarations must be rechecked whenever a dependency or feature changes.
