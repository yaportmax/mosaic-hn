import { useLocalSearchParams } from 'expo-router';
import { CollectionScreen } from '../../src/features/library/CollectionScreen.tsx';
export default function CollectionRoute() { const { id } = useLocalSearchParams<{ id: string }>(); return <CollectionScreen id={String(id ?? '')} />; }
