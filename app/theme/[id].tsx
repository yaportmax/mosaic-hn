import { useLocalSearchParams } from 'expo-router';
import { ThemeDetailScreen } from '../../src/features/themes/ThemeDetailScreen.tsx';
export default function ThemeRoute() { const { id } = useLocalSearchParams<{ id: string }>(); return <ThemeDetailScreen id={String(id ?? '')} />; }
