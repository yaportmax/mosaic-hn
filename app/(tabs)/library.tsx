import { ModuleGate } from '../../src/components/ModuleUnavailable.tsx';
import { LibraryScreen } from '../../src/features/library/LibraryScreen.tsx';
export default function LibraryRoute() { return <ModuleGate moduleId="library"><LibraryScreen /></ModuleGate>; }
