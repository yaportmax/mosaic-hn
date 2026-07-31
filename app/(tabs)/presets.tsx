import { ModuleGate } from '../../src/components/ModuleUnavailable.tsx';
import { PresetScreen } from '../../src/features/presets/PresetScreen.tsx';

export default function PresetsTabRoute() {
  return <ModuleGate moduleId="algorithms"><PresetScreen /></ModuleGate>;
}
