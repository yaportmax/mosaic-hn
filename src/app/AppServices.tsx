import { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { openAppDatabase, type AppDatabase } from '../db/database.ts';
import { BUILTIN_THEMES } from '../design/builtins.ts';
import { APP_VERSION } from '../design/constants.ts';
import { ThemeManager } from '../design/theme-manager.ts';
import { PreferencesController, type AppPreferences } from '../state/preferences.ts';
import { ModuleConfigurationController } from '../state/modules.ts';
import type { ModuleConfigurationV1 } from '../../module-sdk/types.ts';
import { DEFAULT_MODULE_CONFIGURATION } from '../../module-sdk/configuration.ts';

export interface AppServices {
  database: AppDatabase;
  preferences: PreferencesController;
  themes: ThemeManager;
  modules: ModuleConfigurationController;
}

const ServicesContext = createContext<AppServices | null>(null);

export function AppServicesProvider({ children }: { children: ReactNode }) {
  const [services, setServices] = useState<AppServices | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let active = true;
    let database: AppDatabase | null = null;
    let closed = false;
    const closeDatabase = async (): Promise<void> => {
      if (!database || closed) return;
      closed = true;
      await database.close();
    };
    void (async () => {
      try {
        database = await openAppDatabase();
        if (!active) { await closeDatabase(); return; }
        const preferences = new PreferencesController(database.adapter);
        await preferences.load();
        if (!active) { await closeDatabase(); return; }
        const modules = new ModuleConfigurationController(database.adapter);
        const loadedModules = await modules.load();
        if (JSON.stringify(loadedModules) !== JSON.stringify(DEFAULT_MODULE_CONFIGURATION)) await modules.reset();
        if (!active) { await closeDatabase(); return; }
        const themes = new ThemeManager(database.adapter, BUILTIN_THEMES, APP_VERSION);
        setServices({ database, preferences, themes, modules });
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason : new Error('Mosaic HN could not start'));
      }
    })();
    return () => { active = false; void closeDatabase().catch(() => undefined); };
  }, []);

  const value = useMemo(() => services, [services]);
  if (error) return <View style={styles.center}><Text style={styles.errorTitle}>Mosaic HN could not start</Text><Text style={styles.errorBody}>{error.message}</Text></View>;
  if (!value) return <View style={styles.center}><ActivityIndicator size="large" /><Text style={styles.loading}>Opening your local library…</Text></View>;
  return <ServicesContext.Provider value={value}>{children}</ServicesContext.Provider>;
}

export function useAppServices(): AppServices {
  const value = useContext(ServicesContext);
  if (!value) throw new Error('AppServicesProvider is missing');
  return value;
}

export function usePreferences(): AppPreferences {
  const { preferences } = useAppServices();
  return useSyncExternalStore(preferences.subscribe, preferences.getSnapshot, preferences.getSnapshot);
}

export function useModuleConfiguration(): ModuleConfigurationV1 {
  const { modules } = useAppServices();
  return useSyncExternalStore(modules.subscribe, modules.getSnapshot, modules.getSnapshot);
}

export function useModuleEnabled(id: string): boolean {
  return useModuleConfiguration().enabled.includes(id);
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 28, backgroundColor: '#0E0E10' },
  loading: { color: '#C8C8CE', fontSize: 15 },
  errorTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '700' },
  errorBody: { color: '#C8C8CE', fontSize: 15, textAlign: 'center' }
});
