import { ModuleGate } from '../../src/components/ModuleUnavailable.tsx';
import { SettingsScreen } from '../../src/features/settings/SettingsScreen.tsx';
export default function SettingsRoute() { return <ModuleGate moduleId="settings"><SettingsScreen /></ModuleGate>; }
