import type { AppliedRules, FilterCondition, FilterRule, RuleContext, RuleEvaluation, Story } from './models.ts';

export function safeRegex(pattern: string, flags = ''): RegExp | null {
  if (!pattern || pattern.length > 256 || !/^[gimsuy]*$/.test(flags)) return null;
  try {
    return new RegExp(pattern, flags);
  } catch {
    return null;
  }
}

const normalizedDomainMatch = (storyDomain: string | null, requested: string): boolean => {
  if (!storyDomain) return false;
  const domain = requested.trim().toLowerCase().replace(/^www\./, '');
  return storyDomain === domain || storyDomain.endsWith(`.${domain}`);
};

function conditionMatches(story: Story, condition: FilterCondition, context: RuleContext): boolean {
  const searchable = `${story.title}\n${story.text ?? ''}\n${story.domain ?? ''}`;
  switch (condition.type) {
    case 'keyword': return searchable.toLowerCase().includes(condition.value.trim().toLowerCase());
    case 'regex': return safeRegex(condition.value, condition.flags)?.test(searchable) ?? false;
    case 'domain': return normalizedDomainMatch(story.domain, condition.value);
    case 'author': return story.by.toLowerCase() === condition.value.trim().toLowerCase();
    case 'storyType': return story.hnType === condition.value;
    case 'minScore': return story.score >= condition.value;
    case 'maxAgeHours': return Math.max(0, context.nowSeconds - story.time) / 3600 <= condition.value;
    case 'feed': return context.feed === condition.value;
  }
}

export function evaluateRule(story: Story, rule: FilterRule, context: RuleContext): RuleEvaluation {
  if (!rule.enabled) return { ruleId: rule.id, matched: false, explanation: `${rule.name}: disabled` };
  const matched = rule.conditions.length > 0 && rule.conditions.every((condition) => conditionMatches(story, condition, context));
  const action = rule.action.type === 'tag' ? `tag “${rule.action.value}”` : rule.action.type;
  return { ruleId: rule.id, matched, explanation: matched ? `${rule.name}: matched → ${action}` : `${rule.name}: did not match` };
}

export function applyRules(story: Story, rules: readonly FilterRule[], context: RuleContext): AppliedRules {
  const result: AppliedRules = { hidden: false, scoreAdjustment: 0, save: false, queue: false, tags: [], evaluations: [] };
  for (const rule of rules) {
    const evaluation = evaluateRule(story, rule, context);
    result.evaluations.push(evaluation);
    if (!evaluation.matched) continue;
    switch (rule.action.type) {
      case 'hide': result.hidden = true; break;
      case 'boost': result.scoreAdjustment += Math.abs(rule.action.amount); break;
      case 'demote': result.scoreAdjustment -= Math.abs(rule.action.amount); break;
      case 'save': result.save = true; break;
      case 'queue': result.queue = true; break;
      case 'tag': if (!result.tags.includes(rule.action.value)) result.tags.push(rule.action.value); break;
    }
  }
  result.tags.sort((a, b) => a.localeCompare(b));
  return result;
}
