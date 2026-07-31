import { useLocalSearchParams } from 'expo-router';
import { ModuleGate } from '../../src/components/ModuleUnavailable.tsx';
import { UserScreen } from '../../src/features/user/UserScreen.tsx';
export default function UserRoute() { const { id } = useLocalSearchParams<{ id: string }>(); return <ModuleGate moduleId="discovery"><UserScreen id={String(id ?? '')} /></ModuleGate>; }
