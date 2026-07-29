import { useLocalSearchParams } from 'expo-router';
import { UserScreen } from '../../src/features/user/UserScreen.tsx';
export default function UserRoute() { const { id } = useLocalSearchParams<{ id: string }>(); return <UserScreen id={String(id ?? '')} />; }
