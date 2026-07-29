# Modular App System Design

## Goal

Turn Mosaic HN's internal feature boundaries into a user-facing module system. Users can enable or disable nonessential modules, choose where enabled modules appear, reorder them, choose a home module, and export or import complete app setups. The module manager and recovery entry points must always remain reachable.

## Architecture

`src/modules/` owns a trusted runtime registry. Each built-in module declares its identifier, label, description, icon, route, supported placements, default placement, dependencies, whether it is required, and the commands it contributes. Screens remain in `src/features/`; the registry describes and composes them rather than importing screen implementations.

`ModuleConfigurationController` persists a normalized `ModuleConfigurationV1` independently from general preferences. Normalization rejects unknown identifiers, repairs dependency violations, prevents a zero-navigation state, keeps required system modules enabled, and selects a valid home module. React reads it through an external store.

Expo Router continues to statically register routes, while `MosaicTabBar` renders only modules configured for the tab placement. A Modules screen manages enablement, placement, ordering, and the home module. Hidden modules can still be reached when another enabled module explicitly links to them; disabled modules receive a guarded unavailable screen rather than silently loading.

## Module classes

- **Required system modules:** Feed and Modules. They cannot be disabled. Modules is always reachable from Settings and the command palette, even when not placed in navigation.
- **Navigation modules:** Search, Library, Archive, Feed Algorithms, Automation, Themes, and Settings. They may be placed in the tab bar, the More menu, or hidden.
- **Capability modules:** Comments and Discovery. They have no top-level navigation entry, but can be enabled or disabled and gate their corresponding UI.

## User controls

Users can:

- Enable or disable every nonrequired module.
- Assign navigation modules to Tabs, More, or Hidden.
- Reorder tab and More modules independently.
- Choose any enabled navigation module as the app's home module.
- Restore the default setup.
- Export and import a versioned setup JSON file.
- Install a complete setup supplied by a future static marketplace without executable code.

Disabling a module preserves its local data and settings. Re-enabling it restores the prior data.

## Safety and compatibility

Module packages are declarative data interpreted by trusted app code. They cannot import JavaScript, call arbitrary APIs, access storage directly, or introduce new native permissions. Unlimited code modules remain possible through forks or reviewed source contributions included in an app release.

Configuration imports have byte, identifier, record-count, and version limits. Unknown modules are ignored on migration, required modules are restored, dependency closure is applied, and malformed imports are rejected atomically.

## UI behavior

The Modules screen groups modules into Active navigation, Available modules, and Capabilities. Each module card exposes enablement, placement, dependency information, and ordering controls. A More destination lists enabled modules assigned to More. The command palette is generated from the same registry, preventing duplicated navigation metadata.

If a route is opened while its module is disabled, a consistent screen explains that the module is off and provides an Enable action plus a link to Modules. If Comments is disabled, story content remains available but comment fetching and rendering are skipped. If Discovery is disabled, domain/user/related-story exploration entry points are removed.

## Testing

Pure tests cover registry validity, dependency closure, required modules, placement normalization, zero-navigation recovery, home-module selection, import/export, and controller persistence. Source verification checks that every registered navigation module has a route and that documentation identifies the app as modular.
