import { Alert, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BUILTIN_MODULES } from '../../../module-sdk/registry.ts';
import { DEFAULT_MODULE_CONFIGURATION, exportModuleConfiguration, importModuleConfiguration } from '../../../module-sdk/configuration.ts';
import type { ModuleDefinition, ModulePlacement } from '../../../module-sdk/types.ts';
import { useAppServices, useModuleConfiguration } from '../../app/AppServices.tsx';
import { pickTextFile, shareTextFile } from '../../app/file-exchange.ts';
import { confirmAction } from '../../app/dialogs.ts';
import { enabledDependents } from '../../modules/runtime.ts';
import { Screen } from '../../components/Screen.tsx';
import { ScreenHeader } from '../../components/Header.tsx';
import { Section } from '../../components/Section.tsx';
import { Surface } from '../../components/Surface.tsx';
import { ThemedText } from '../../components/ThemedText.tsx';
import { Chip } from '../../components/Chip.tsx';
import { Button } from '../../components/Button.tsx';
import { useThemeRuntime } from '../../design/ThemeProvider.tsx';

const PLACEMENT_LABELS: Record<ModulePlacement, string> = { tab: 'Tab', more: 'More', hidden: 'Hidden' };

function ModuleCard({ definition }: { definition: ModuleDefinition }) {
  const configuration = useModuleConfiguration();
  const { modules } = useAppServices();
  const { theme } = useThemeRuntime();
  const enabled = configuration.enabled.includes(definition.id);
  const placement = configuration.placements[definition.id] ?? definition.defaultPlacement;
  const order = placement === 'tab' ? configuration.tabOrder : placement === 'more' ? configuration.moreOrder : [];
  const index = order.indexOf(definition.id);
  const dependents = enabledDependents(configuration, definition.id);
  const dependencyNames = definition.dependencies.map((id) => BUILTIN_MODULES.find((candidate) => candidate.id === id)?.name ?? id);

  const toggle = (next: boolean) => {
    if (definition.required && !next) return;
    if (!next && dependents.length > 0) {
      confirmAction({
        title: `Disable ${definition.name}?`,
        message: `This also disables ${dependents.map((module) => module.name).join(', ')} because ${dependents.length === 1 ? 'it depends' : 'they depend'} on ${definition.name}. Local data is preserved.`,
        confirmLabel: 'Disable',
        destructive: true,
        onConfirm: () => modules.setEnabled(definition.id, false)
      });
      return;
    }
    void modules.setEnabled(definition.id, next);
  };

  return <Surface style={styles.moduleCard}>
    <View style={styles.moduleHeader}>
      <View style={[styles.moduleIcon, { backgroundColor: `${theme.tokens.colors.accent}18` }]}><Ionicons name={definition.icon as never} size={22} color={theme.tokens.colors.accent} /></View>
      <View style={styles.moduleCopy}>
        <View style={styles.titleLine}><ThemedText variant="headline">{definition.name}</ThemedText>{definition.required ? <ThemedText variant="caption" style={{ color: theme.tokens.colors.accent, fontWeight: '800' }}>REQUIRED</ThemedText> : null}{configuration.homeModuleId === definition.id ? <ThemedText variant="caption" style={{ color: theme.tokens.colors.success, fontWeight: '800' }}>HOME</ThemedText> : null}</View>
        <ThemedText variant="meta" muted>{definition.description}</ThemedText>
      </View>
      <Switch accessibilityLabel={`${enabled ? 'Disable' : 'Enable'} ${definition.name}`} disabled={definition.required} value={enabled} onValueChange={toggle} trackColor={{ true: theme.tokens.colors.accent }} />
    </View>

    {dependencyNames.length > 0 ? <ThemedText variant="caption" muted>Requires {dependencyNames.join(', ')}.</ThemedText> : null}
    {dependents.length > 0 ? <ThemedText variant="caption" muted>Used by {dependents.map((module) => module.name).join(', ')}.</ThemedText> : null}

    {definition.kind === 'navigation' && enabled ? <View style={styles.controls}>
      <ThemedText variant="caption" muted>Placement</ThemedText>
      <View style={styles.chips}>{definition.allowedPlacements.map((value) => <Chip key={value} compact label={PLACEMENT_LABELS[value]} selected={placement === value} onPress={() => void modules.setPlacement(definition.id, value)} />)}</View>
      <View style={styles.actionRow}>
        <Button label={configuration.homeModuleId === definition.id ? 'Home screen' : 'Make home'} icon="home-outline" variant={configuration.homeModuleId === definition.id ? 'secondary' : 'ghost'} disabled={configuration.homeModuleId === definition.id} onPress={() => void modules.setHome(definition.id)} />
        {placement !== 'hidden' ? <><Button label="Up" icon="arrow-up" variant="ghost" disabled={index <= 0} onPress={() => void modules.move(definition.id, -1)} /><Button label="Down" icon="arrow-down" variant="ghost" disabled={index < 0 || index >= order.length - 1} onPress={() => void modules.move(definition.id, 1)} /></> : null}
      </View>
    </View> : null}
  </Surface>;
}

export function ModulesScreen() {
  const configuration = useModuleConfiguration();
  const { modules } = useAppServices();
  const navigation = BUILTIN_MODULES.filter((module) => module.kind === 'navigation');
  const capabilities = BUILTIN_MODULES.filter((module) => module.kind === 'capability');
  const enabledCount = configuration.enabled.length;

  const exportSetup = async () => {
    await shareTextFile('mosaic-hn-module-setup-v1.json', exportModuleConfiguration(configuration), 'application/json');
  };

  const importSetup = async () => {
    const file = await pickTextFile(['application/json', 'text/json', 'text/plain']);
    if (!file) return;
    const next = importModuleConfiguration(file.text);
    await modules.replace(next);
    Alert.alert('Setup imported', `${next.enabled.length} modules are enabled. ${next.tabOrder.length} appear as tabs and ${next.moreOrder.length} appear under More.`);
  };

  const reset = () => confirmAction({ title: 'Restore default modules?', message: 'This changes module visibility, placement, order, and the home screen. Cached stories and all local library data remain untouched.', confirmLabel: 'Restore', destructive: true, onConfirm: () => modules.reset() });

  return <Screen edges={['top']}>
    <ScreenHeader title="Modules" subtitle={`${enabledCount} of ${BUILTIN_MODULES.length} enabled · ${configuration.tabOrder.length} tabs · ${configuration.moreOrder.length} in More`} />
    <ScrollView contentContainerStyle={styles.content}>
      <Section title="Application modules" caption="Enable only the parts you use. Placement and order are independent from themes, and disabled modules retain their local data.">
        {navigation.map((module) => <ModuleCard key={module.id} definition={module} />)}
      </Section>

      <Section title="Behavior capabilities" caption="Capabilities alter the reader without creating a top-level destination.">
        {capabilities.map((module) => <ModuleCard key={module.id} definition={module} />)}
      </Section>

      <Section title="Portable app setup" caption="Setup files contain declarative module configuration only—never executable code or private reading data.">
        <Surface style={styles.setupCard}>
          <Button label="Export setup JSON" icon="share-outline" variant="secondary" onPress={() => void exportSetup().catch((error) => Alert.alert('Export failed', error instanceof Error ? error.message : 'The setup could not be exported'))} />
          <Button label="Import setup JSON" icon="download-outline" variant="secondary" onPress={() => void importSetup().catch((error) => Alert.alert('Import failed', error instanceof Error ? error.message : 'The setup could not be imported'))} />
          <Button label="Restore defaults" icon="refresh-outline" variant="danger" onPress={reset} />
          <ThemedText variant="caption" muted>Default: {DEFAULT_MODULE_CONFIGURATION.tabOrder.length} tabs, {DEFAULT_MODULE_CONFIGURATION.moreOrder.length} More modules, Comments and Discovery enabled.</ThemedText>
        </Surface>
      </Section>
    </ScrollView>
  </Screen>;
}

const styles = StyleSheet.create({
  content: { padding: 14, paddingBottom: 120, gap: 26 },
  moduleCard: { padding: 14, gap: 10 },
  moduleHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  moduleIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  moduleCopy: { flex: 1, gap: 3 },
  titleLine: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  controls: { gap: 7, paddingTop: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  setupCard: { padding: 14, gap: 10 }
});
