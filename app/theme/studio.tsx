import { useLocalSearchParams } from 'expo-router';
import { ThemeStudioScreen } from '../../src/features/themes/ThemeStudioScreen.tsx';
export default function ThemeStudioRoute() { const { id } = useLocalSearchParams<{ id?: string }>(); return <ThemeStudioScreen id={id ? String(id) : undefined} />; }
