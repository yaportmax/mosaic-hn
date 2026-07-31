import { ModuleGate } from '../../src/components/ModuleUnavailable.tsx';
import { RulesScreen } from '../../src/features/rules/RulesScreen.tsx';
export default function RulesTabRoute() { return <ModuleGate moduleId="automation"><RulesScreen /></ModuleGate>; }
