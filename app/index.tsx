import { Redirect } from 'expo-router';
import { useModuleConfiguration } from '../src/app/AppServices.tsx';
import { getHomeModule } from '../src/modules/runtime.ts';
export default function IndexRoute() {
  const configuration = useModuleConfiguration();
  return <Redirect href={getHomeModule(configuration).route ?? '/(tabs)'} />;
}
