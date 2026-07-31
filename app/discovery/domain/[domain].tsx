import { useLocalSearchParams } from 'expo-router';
import { ModuleGate } from '../../../src/components/ModuleUnavailable.tsx';
import { DomainScreen } from '../../../src/features/discovery/DomainScreen.tsx';
export default function DomainRoute() { const { domain } = useLocalSearchParams<{ domain: string }>(); return <ModuleGate moduleId="discovery"><DomainScreen domain={decodeURIComponent(String(domain ?? ''))} /></ModuleGate>; }
