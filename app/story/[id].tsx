import { useLocalSearchParams } from 'expo-router';
import { StoryScreen } from '../../src/features/story/StoryScreen.tsx';
export default function StoryRoute() { const { id } = useLocalSearchParams<{ id: string }>(); return <StoryScreen id={Number(id)} />; }
