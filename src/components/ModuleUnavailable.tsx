import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { useAppServices, useModuleEnabled } from '../app/AppServices.tsx';
import { moduleForId } from '../modules/runtime.ts';
import { Screen } from './Screen.tsx';
import { ScreenHeader } from './Header.tsx';
import { EmptyState } from './States.tsx';
import { Button } from './Button.tsx';

export function ModuleUnavailable({ moduleId }: { moduleId: string }) {
  const { modules } = useAppServices();
  const definition = moduleForId(moduleId);
  const enable = async () => {
    const next = await modules.setEnabled(moduleId, true);
    const route = definition?.route;
    if (route && next.enabled.includes(moduleId)) router.replace(route);
  };
  return <Screen edges={['top']}>
    <ScreenHeader title={definition?.name ?? 'Module unavailable'} subtitle="This feature is disabled in the current app setup" />
    <EmptyState icon={definition?.icon ?? 'grid-outline'} title={`${definition?.name ?? 'This module'} is off`} body="Its local data has been preserved. Enable the module to restore the feature exactly where you left it." actionLabel="Enable module" onAction={() => void enable()} />
    <View style={styles.actions}><Button label="Open Modules" icon="grid-outline" variant="secondary" onPress={() => router.push('/modules')} /></View>
  </Screen>;
}

export function ModuleGate({ moduleId, children }: { moduleId: string; children: ReactNode }) {
  return useModuleEnabled(moduleId) ? children : <ModuleUnavailable moduleId={moduleId} />;
}

const styles = StyleSheet.create({ actions: { paddingHorizontal: 24, paddingBottom: 40 } });
