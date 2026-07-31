import { ModuleGate } from '../../src/components/ModuleUnavailable.tsx';
import { SearchScreen } from '../../src/features/search/SearchScreen.tsx';
export default function SearchRoute() { return <ModuleGate moduleId="search"><SearchScreen /></ModuleGate>; }
