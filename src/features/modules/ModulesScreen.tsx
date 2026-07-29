import { ScrollView, StyleSheet } from 'react-native';
import { BUILTIN_MODULES } from '../../../module-sdk/registry.ts';
import { useAppServices, useModuleConfiguration } from '../../app/AppServices.tsx';
import { Screen } from '../../components/Screen.tsx';
import { ScreenHeader } from '../../components/Header.tsx';
import { Section } from '../../components/Section.tsx';
import { Surface } from '../../components/Surface.tsx';
import { SettingRow } from '../../components/SettingRow.tsx';

export function ModulesScreen() {
  const configuration = useModuleConfiguration();
  const { modules } = useAppServices();
  const navigation = BUILTIN_MODULES.filter((module) => module.kind === 'navigation');
  const capabilities = BUILTIN_MODULES.filter((module) => module.kind === 'capability');
  return <Screen edges={['top']}>
    <ScreenHeader title="Modules" subtitle="Build your own version of Mosaic HN" />
    <ScrollView contentContainerStyle={styles.content}>
      <Section title="App modules" caption="Disabled modules keep their local data and can be restored at any time.">
        <Surface style={styles.group}>{navigation.map((module) => <SettingRow key={module.id} icon={module.icon} title={module.name} detail={module.required ? `${module.description} Required for recovery.` : module.description} value={configuration.enabled.includes(module.id)} onValueChange={module.required ? undefined : (enabled) => void modules.setEnabled(module.id, enabled)} />)}</Surface>
      </Section>
      <Section title="Capabilities" caption="Capabilities change behavior without adding a navigation destination.">
        <Surface style={styles.group}>{capabilities.map((module) => <SettingRow key={module.id} icon={module.icon} title={module.name} detail={module.description} value={configuration.enabled.includes(module.id)} onValueChange={(enabled) => void modules.setEnabled(module.id, enabled)} />)}</Surface>
      </Section>
    </ScrollView>
  </Screen>;
}

const styles = StyleSheet.create({ content: { padding: 14, paddingBottom: 120, gap: 24 }, group: { paddingHorizontal: 14, paddingBottom: 4 } });
