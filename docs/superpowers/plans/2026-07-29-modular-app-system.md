# Modular App System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a safe, local, user-facing module system that controls feature enablement, placement, ordering, home navigation, and setup portability.

**Architecture:** A pure module SDK and built-in registry define trusted capabilities. A persisted external-store controller normalizes user configuration and exposes it to Expo Router, navigation, settings, commands, and feature gates. Static routes remain compiled into the app; configuration controls visibility and access.

**Tech Stack:** TypeScript 6, React Native 0.86, Expo Router 57, node:test, local key/value persistence.

## Global Constraints

- No new hosted service, proprietary backend, account, analytics, AI, or executable downloaded module code.
- Feed and Modules remain enabled and recoverable.
- Disabling modules preserves local data.
- Module setup files are versioned, validated, bounded, and portable JSON.
- Existing themes and library exports remain backward compatible.

---

### Task 1: Pure module contract and normalization

**Files:**
- Create: `module-sdk/types.ts`
- Create: `module-sdk/registry.ts`
- Create: `module-sdk/configuration.ts`
- Create: `module-sdk/configuration.test.ts`
- Modify: `tsconfig.core.json`
- Modify: `package.json`

**Interfaces:**
- Produces: `ModuleDefinition`, `ModuleConfigurationV1`, `BUILTIN_MODULES`, `normalizeModuleConfiguration`, `exportModuleConfiguration`, `importModuleConfiguration`.

- [ ] Write failing tests for required modules, dependency closure, placement/order repair, valid home selection, and import bounds.
- [ ] Run the module tests and confirm failures are caused by missing implementation.
- [ ] Implement the types, registry validation, configuration normalization, and import/export.
- [ ] Run the module tests and full core tests.
- [ ] Commit the pure module layer.

### Task 2: Persistence and application services

**Files:**
- Create: `src/state/modules.ts`
- Create: `src/state/modules.test.ts`
- Modify: `src/app/AppServices.tsx`
- Modify: `tsconfig.core.json`

**Interfaces:**
- Consumes: `ModuleConfigurationV1`, `normalizeModuleConfiguration`.
- Produces: `ModuleConfigurationController`, `useModuleConfiguration`, `useModuleEnabled`.

- [ ] Write failing tests for load, update, reset, and imported setup persistence.
- [ ] Run the tests and confirm expected failures.
- [ ] Implement the controller and React service hooks.
- [ ] Run module-state and full core tests.
- [ ] Commit persisted module state.

### Task 3: Registry-driven navigation

**Files:**
- Create: `src/modules/runtime.ts`
- Create: `src/components/MoreModulesScreen.tsx`
- Create: `src/components/ModuleUnavailable.tsx`
- Create: `app/(tabs)/more.tsx`
- Create: `app/(tabs)/archive.tsx`
- Create: `app/(tabs)/presets.tsx`
- Create: `app/(tabs)/rules.tsx`
- Create: `app/(tabs)/modules.tsx`
- Modify: `app/(tabs)/_layout.tsx`
- Modify: `src/components/MosaicTabBar.tsx`
- Modify: `app/index.tsx`

**Interfaces:**
- Consumes: registry and module configuration.
- Produces: registry-derived tabs, More navigation, guarded route rendering, and home redirect.

- [ ] Add registry lookup and route-guard helpers.
- [ ] Register all navigation routes statically.
- [ ] Render only configured tab modules and conditionally expose More.
- [ ] Redirect root to the configured home module.
- [ ] Run source type parsing and core verification.
- [ ] Commit registry-driven navigation.

### Task 4: Module manager and setup portability

**Files:**
- Create: `src/features/modules/ModulesScreen.tsx`
- Create: `app/modules.tsx`
- Modify: `src/app/file-exchange.ts`
- Modify: `src/features/settings/SettingsScreen.tsx`
- Modify: `src/features/settings/CommandPaletteScreen.tsx`

**Interfaces:**
- Consumes: `ModuleConfigurationController`, module registry, JSON import/export functions.
- Produces: module enable/disable, placement, ordering, home selection, reset, and setup import/export UI.

- [ ] Build module cards with dependency-aware enablement and placement controls.
- [ ] Add independent ordering controls for Tabs and More.
- [ ] Add home-module selection and default reset.
- [ ] Add setup JSON import/export using native document exchange.
- [ ] Generate command-palette module entries from the registry.
- [ ] Run source parsing and verification.
- [ ] Commit module management UI.

### Task 5: Capability gates

**Files:**
- Modify: `src/features/story/StoryScreen.tsx`
- Modify: `src/components/StoryCard.tsx`
- Modify: `src/components/CommentRow.tsx`
- Modify: `src/features/discovery/DomainScreen.tsx`
- Modify: `src/features/user/UserScreen.tsx`
- Modify: `src/features/feed/FeedScreen.tsx`

**Interfaces:**
- Consumes: `useModuleEnabled`.
- Produces: comments and discovery behavior that actually turns off when their modules are disabled.

- [ ] Skip comment preload and rendering when Comments is disabled.
- [ ] Remove or neutralize domain/user discovery entry points when Discovery is disabled.
- [ ] Hide ranking, automation, library, and theme actions when their modules are disabled.
- [ ] Verify navigation never targets disabled modules.
- [ ] Commit feature gates.

### Task 6: Documentation, integrity checks, and release package

**Files:**
- Modify: `README.md`
- Modify: `docs/ARCHITECTURE.md`
- Create: `docs/MODULES.md`
- Modify: `docs/PRIVACY.md`
- Modify: `docs/RELEASE_CHECKLIST.md`
- Modify: `scripts/verify-source.mjs`
- Modify: `CONTRIBUTING.md`

**Interfaces:**
- Produces: documented module authoring rules and automated source-integrity coverage.

- [ ] Update the feature list to lead with modularity.
- [ ] Document built-in modules, placements, setup portability, safety boundaries, and contribution path.
- [ ] Extend source verification to require module files and route coverage.
- [ ] Run the entire verification suite.
- [ ] Inspect the final diff for unfinished markers and inconsistent copy.
- [ ] Commit, tag the new release candidate, and package source plus Git bundle with checksums.
