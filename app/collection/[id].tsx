import { useLocalSearchParams } from 'expo-router';
import { ModuleGate } from '../../src/components/ModuleUnavailable.tsx';
import { CollectionScreen } from '../../src/features/library/CollectionScreen.tsx';
export default function CollectionRoute() { const { id } = useLocalSearchParams<{ id: string }>(); return <ModuleGate moduleId="library"><CollectionScreen id={String(id ?? '')} /></ModuleGate>; }
