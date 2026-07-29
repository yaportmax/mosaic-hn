import { ModuleGate } from '../src/components/ModuleUnavailable.tsx';
import { RulesScreen } from '../src/features/rules/RulesScreen.tsx';
export default function RulesRoute() { return <ModuleGate moduleId="automation"><RulesScreen /></ModuleGate>; }
