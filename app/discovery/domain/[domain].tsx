import { useLocalSearchParams } from 'expo-router';
import { DomainScreen } from '../../../src/features/discovery/DomainScreen.tsx';
export default function DomainRoute() { const { domain } = useLocalSearchParams<{ domain: string }>(); return <DomainScreen domain={decodeURIComponent(String(domain ?? ''))} />; }
