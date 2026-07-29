import { ModuleGate } from '../src/components/ModuleUnavailable.tsx';
import { ArchiveScreen } from '../src/features/archive/ArchiveScreen.tsx';
export default function ArchiveRoute() { return <ModuleGate moduleId="archive"><ArchiveScreen /></ModuleGate>; }
