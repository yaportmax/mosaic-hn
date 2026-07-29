import { useLocalSearchParams } from 'expo-router';
import { ModuleGate } from '../../src/components/ModuleUnavailable.tsx';
import { ThemeDetailScreen } from '../../src/features/themes/ThemeDetailScreen.tsx';
export default function ThemeRoute() { const { id } = useLocalSearchParams<{ id: string }>(); return <ModuleGate moduleId="themes"><ThemeDetailScreen id={String(id ?? '')} /></ModuleGate>; }
