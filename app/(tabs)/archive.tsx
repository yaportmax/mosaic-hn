import { Redirect } from 'expo-router';
import { ModuleGate } from '../../src/components/ModuleUnavailable.tsx';

export default function ArchiveTabRoute() {
  return <ModuleGate moduleId="archive"><Redirect href="/settings" /></ModuleGate>;
}
