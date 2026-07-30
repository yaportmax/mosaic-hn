import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import * as Crypto from 'expo-crypto';
import type { FeedKind, FilterCondition, FilterRule, RuleAction, Story } from '../../core/models.ts';
import { FEED_KINDS } from '../../core/models.ts';
import { evaluateRule } from '../../core/filters.ts';
import { FEED_LABELS } from '../../core/format.ts';
import { useAppServices } from '../../app/AppServices.tsx';
import { confirmAction } from '../../app/dialogs.ts';
import { Screen } from '../../components/Screen.tsx';
import { DetailHeader } from '../../components/Header.tsx';
import { Section } from '../../components/Section.tsx';
import { Surface } from '../../components/Surface.tsx';
import { ThemedText } from '../../components/ThemedText.tsx';
import { Button } from '../../components/Button.tsx';
import { Chip } from '../../components/Chip.tsx';
import { EmptyState, LoadingState } from '../../components/States.tsx';
import { useThemeRuntime } from '../../design/ThemeProvider.tsx';

const conditionTypes: FilterCondition['type'][] = ['keyword', 'domain', 'author', 'regex', 'storyType', 'minScore', 'maxAgeHours', 'feed'];
const actionTypes: RuleAction['type'][] = ['hide', 'boost', 'demote', 'save', 'queue', 'tag'];
const storyTypes: Story['hnType'][] = ['story', 'job', 'poll', 'pollopt'];

const defaultCondition = (type: FilterCondition['type']): FilterCondition => {
  switch (type) {
    case 'keyword': return { type, value: '' };
    case 'domain': return { type, value: '' };
    case 'author': return { type, value: '' };
    case 'regex': return { type, value: '', flags: 'i' };
    case 'storyType': return { type, value: 'story' };
    case 'minScore': return { type, value: 50 };
    case 'maxAgeHours': return { type, value: 24 };
    case 'feed': return { type, value: 'top' };
  }
};
const defaultAction = (type: RuleAction['type']): RuleAction => {
  if (type === 'boost' || type === 'demote') return { type, amount: 1 };
  if (type === 'tag') return { type, value: 'interesting' };
  return { type };
};
const createRule = (): FilterRule => ({ id: Crypto.randomUUID(), name: 'New rule', enabled: true, conditions: [defaultCondition('keyword')], action: { type: 'hide' } });
const cloneRule = (rule: FilterRule): FilterRule => structuredClone(rule);

export function RulesScreen() {
  const { database } = useAppServices();
  const { theme } = useThemeRuntime();
  const [rules, setRules] = useState<FilterRule[]>([]);
  const [editing, setEditing] = useState<FilterRule | null>(null);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<{ matched: Story[]; total: number } | null>(null);

  const reload = useCallback(async () => { setRules((await database.repository.listRules()).sort((a, b) => a.name.localeCompare(b.name))); setLoading(false); }, [database.repository]);
  useEffect(() => { void reload(); }, [reload]);

  const updateCondition = (index: number, condition: FilterCondition) => setEditing((rule) => rule ? ({ ...rule, conditions: rule.conditions.map((value, position) => position === index ? condition : value) }) : rule);
  const save = async () => {
    if (!editing) return;
    if (!editing.name.trim()) { Alert.alert('Name required', 'Give this rule a descriptive name.'); return; }
    if (!editing.conditions.length) { Alert.alert('Condition required', 'A rule must contain at least one condition.'); return; }
    await database.repository.saveRule({ ...editing, name: editing.name.trim() });
    setEditing(null); setPreview(null); await reload();
  };
  const testRule = async () => {
    if (!editing) return;
    const stories = await database.repository.getAllCachedStories(2_000);
    const nowSeconds = Math.floor(Date.now() / 1000);
    const matched = stories.filter((story) => FEED_KINDS.some((feed) => evaluateRule(story, editing, { nowSeconds, feed }).matched));
    setPreview({ matched: matched.slice(0, 8), total: matched.length });
  };
  const remove = (rule: FilterRule) => confirmAction({ title: 'Delete rule?', message: rule.name, confirmLabel: 'Delete', destructive: true, onConfirm: () => database.repository.deleteRule(rule.id).then(reload) });
  const toggle = async (rule: FilterRule, enabled: boolean) => { await database.repository.saveRule({ ...rule, enabled }); await reload(); };

  const actionDetail = useMemo(() => {
    if (!editing) return '';
    if (editing.action.type === 'tag') return editing.action.value;
    if (editing.action.type === 'boost' || editing.action.type === 'demote') return String(editing.action.amount);
    return '';
  }, [editing]);

  if (loading) return <Screen edges={['top']}><DetailHeader title="Rules" /><LoadingState label="Loading local automation…" /></Screen>;
  return <Screen edges={['top']}>
    <DetailHeader title="Filters & automation" subtitle="Transparent rules that run entirely on this device" />
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {!editing ? <>
        <Button label="Create rule" icon="add" onPress={() => setEditing(createRule())} />
        {rules.length ? <View style={styles.stack}>{rules.map((rule) => <Surface key={rule.id} style={styles.ruleRow}><View style={styles.ruleCopy}><ThemedText variant="headline">{rule.name}</ThemedText><ThemedText variant="meta" muted>{rule.conditions.length} condition{rule.conditions.length === 1 ? '' : 's'} · {rule.action.type}</ThemedText></View><Switch value={rule.enabled} onValueChange={(enabled) => void toggle(rule, enabled)} trackColor={{ true: theme.tokens.colors.accent }} /><Button label="Edit" variant="ghost" onPress={() => { setEditing(cloneRule(rule)); setPreview(null); }} /><Button label="Delete" variant="ghost" onPress={() => remove(rule)} /></Surface>)}</View> : <EmptyState icon="filter-outline" title="No rules" body="Hide repetitive topics, boost favorite domains, automatically queue stories, or tag research subjects." actionLabel="Create a rule" onAction={() => setEditing(createRule())} />}
      </> : <>
        <Section title="Rule identity">
          <Surface style={styles.form}><TextInput value={editing.name} onChangeText={(name) => setEditing({ ...editing, name })} placeholder="Rule name" placeholderTextColor={theme.tokens.colors.mutedText} style={[styles.input, { color: theme.tokens.colors.text, borderColor: theme.tokens.colors.border }]} /><View style={styles.enabled}><ThemedText>Enabled</ThemedText><Switch value={editing.enabled} onValueChange={(enabled) => setEditing({ ...editing, enabled })} trackColor={{ true: theme.tokens.colors.accent }} /></View></Surface>
        </Section>
        <Section title="All conditions must match" caption="Feed-only conditions are evaluated for the feed currently being viewed.">
          {editing.conditions.map((condition, index) => <Surface key={`${condition.type}-${index}`} style={styles.condition}>
            <View style={styles.conditionHeader}><ThemedText variant="meta" muted>Condition {index + 1}</ThemedText><Button label="Remove" variant="ghost" disabled={editing.conditions.length === 1} onPress={() => setEditing({ ...editing, conditions: editing.conditions.filter((_value, position) => position !== index) })} /></View>
            <View style={styles.chips}>{conditionTypes.map((type) => <Chip key={type} compact label={type} selected={condition.type === type} onPress={() => updateCondition(index, defaultCondition(type))} />)}</View>
            <ConditionEditor condition={condition} onChange={(value) => updateCondition(index, value)} />
          </Surface>)}
          <Button label="Add condition" icon="add" variant="secondary" onPress={() => setEditing({ ...editing, conditions: [...editing.conditions, defaultCondition('keyword')] })} />
        </Section>
        <Section title="Action">
          <View style={styles.chips}>{actionTypes.map((type) => <Chip key={type} label={type} selected={editing.action.type === type} onPress={() => setEditing({ ...editing, action: defaultAction(type) })} />)}</View>
          {editing.action.type === 'boost' || editing.action.type === 'demote' ? <TextInput value={actionDetail} onChangeText={(value) => setEditing({ ...editing, action: { type: editing.action.type as 'boost' | 'demote', amount: Math.max(0, Number(value) || 0) } })} keyboardType="decimal-pad" placeholder="Ranking adjustment" placeholderTextColor={theme.tokens.colors.mutedText} style={[styles.input, { color: theme.tokens.colors.text, borderColor: theme.tokens.colors.border }]} /> : editing.action.type === 'tag' ? <TextInput value={actionDetail} onChangeText={(value) => setEditing({ ...editing, action: { type: 'tag', value } })} placeholder="Tag" placeholderTextColor={theme.tokens.colors.mutedText} style={[styles.input, { color: theme.tokens.colors.text, borderColor: theme.tokens.colors.border }]} /> : null}
        </Section>
        <View style={styles.buttons}><Button label="Save rule" icon="checkmark" onPress={() => void save()} /><Button label="Test on local archive" icon="flask-outline" variant="secondary" onPress={() => void testRule()} /><Button label="Cancel" variant="ghost" onPress={() => { setEditing(null); setPreview(null); }} /></View>
        {preview ? <Surface style={styles.preview}><ThemedText variant="headline">{preview.total} local match{preview.total === 1 ? '' : 'es'}</ThemedText>{preview.matched.map((story) => <ThemedText key={story.id} variant="meta" numberOfLines={1}>• {story.title}</ThemedText>)}{preview.total > preview.matched.length ? <ThemedText variant="caption" muted>Showing the first {preview.matched.length} matches.</ThemedText> : null}</Surface> : null}
      </>}
    </ScrollView>
  </Screen>;
}

function ConditionEditor({ condition, onChange }: { condition: FilterCondition; onChange(condition: FilterCondition): void }) {
  const { theme } = useThemeRuntime();
  if (condition.type === 'storyType') return <View style={styles.chips}>{storyTypes.map((value) => <Chip key={value} compact label={value} selected={condition.value === value} onPress={() => onChange({ type: 'storyType', value })} />)}</View>;
  if (condition.type === 'feed') return <View style={styles.chips}>{FEED_KINDS.map((value: FeedKind) => <Chip key={value} compact label={FEED_LABELS[value]} selected={condition.value === value} onPress={() => onChange({ type: 'feed', value })} />)}</View>;
  const numeric = condition.type === 'minScore' || condition.type === 'maxAgeHours';
  return <TextInput value={String(condition.value)} onChangeText={(value) => {
    if (condition.type === 'regex') onChange({ ...condition, value });
    else if (numeric) onChange({ type: condition.type, value: Math.max(0, Number(value) || 0) } as FilterCondition);
    else onChange({ type: condition.type, value } as FilterCondition);
  }} keyboardType={numeric ? 'decimal-pad' : 'default'} autoCapitalize="none" autoCorrect={false} placeholder={condition.type === 'domain' ? 'example.com' : condition.type === 'author' ? 'username' : condition.type === 'regex' ? 'Pattern' : condition.type === 'maxAgeHours' ? 'Hours' : condition.type === 'minScore' ? 'Score' : 'Keyword'} placeholderTextColor={theme.tokens.colors.mutedText} style={[styles.input, { color: theme.tokens.colors.text, borderColor: theme.tokens.colors.border }]} />;
}

const styles = StyleSheet.create({ content: { padding: 14, paddingBottom: 100, gap: 22 }, stack: { gap: 9 }, ruleRow: { minHeight: 68, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 8 }, ruleCopy: { flex: 1, gap: 2 }, form: { padding: 12, gap: 10 }, input: { minHeight: 44, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontSize: 15 }, enabled: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, condition: { padding: 12, gap: 10 }, conditionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, buttons: { gap: 8 }, preview: { padding: 14, gap: 5 } });
