import { useLocalSearchParams } from 'expo-router';
import { ModuleGate } from '../../src/components/ModuleUnavailable.tsx';
import { ThemeStudioScreen } from '../../src/features/themes/ThemeStudioScreen.tsx';
export default function ThemeStudioRoute() { const { id } = useLocalSearchParams<{ id?: string }>(); return <ModuleGate moduleId="themes"><ThemeStudioScreen id={id ? String(id) : undefined} /></ModuleGate>; }
