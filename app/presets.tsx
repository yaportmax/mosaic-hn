import { ModuleGate } from '../src/components/ModuleUnavailable.tsx';
import { PresetScreen } from '../src/features/presets/PresetScreen.tsx';
export default function PresetsRoute() { return <ModuleGate moduleId="algorithms"><PresetScreen /></ModuleGate>; }
