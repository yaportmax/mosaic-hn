import { applyRules } from './filters.ts';
import type { AppliedRules, FeedKind, FeedPreset, FilterRule, RankedStory, RankingExplanation, Story, StorySnapshot } from './models.ts';
import { rankStories } from './ranking.ts';

export interface FeedPipelineContext {
  nowSeconds: number;
  feed: FeedKind;
  snapshots?: Map<number, StorySnapshot>;
  rankingEnabled?: boolean;
  automationEnabled?: boolean;
}

export interface FeedAutomationAction {
  itemId: number;
  save: boolean;
  queue: boolean;
  tags: string[];
}

export interface FeedViewItem {
  story: Story;
  rankScore: number;
  rankingExplanations: RankingExplanation[];
  ruleResult: AppliedRules;
  explanationText: string;
}

export interface FeedViewResult {
  items: FeedViewItem[];
  hiddenStoryIds: number[];
  automation: FeedAutomationAction[];
}

function explanationText(ranked: RankedStory, rules: AppliedRules): string {
  const ranking = [...ranked.explanations]
    .filter((item) => Math.abs(item.contribution) > 0.0001)
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
    .slice(0, 3)
    .map((item) => `${item.label} ${item.contribution >= 0 ? '+' : ''}${item.contribution.toFixed(2)}`);
  const matchedRules = rules.evaluations.filter((evaluation) => evaluation.matched).map((evaluation) => evaluation.explanation);
  return [...ranking, ...matchedRules].join(' · ');
}

function emptyRuleResult(): AppliedRules {
  return { hidden: false, scoreAdjustment: 0, save: false, queue: false, tags: [], evaluations: [] };
}

function preserveSourceOrder(stories: readonly Story[]): RankedStory[] {
  return stories.map((story, index) => ({ story, rankScore: stories.length - index, explanations: [] }));
}

export function buildFeedView(
  stories: readonly Story[],
  preset: FeedPreset,
  rules: readonly FilterRule[],
  context: FeedPipelineContext
): FeedViewResult {
  const rankingEnabled = context.rankingEnabled !== false;
  const automationEnabled = context.automationEnabled !== false;
  const rankingContext = context.snapshots ? { nowSeconds: context.nowSeconds, snapshots: context.snapshots } : { nowSeconds: context.nowSeconds };
  const ranked = rankingEnabled ? rankStories(stories, preset, rankingContext) : preserveSourceOrder(stories);
  const hiddenStoryIds: number[] = [];
  const automation: FeedAutomationAction[] = [];
  const items: FeedViewItem[] = [];

  for (const entry of ranked) {
    const ruleResult = automationEnabled ? applyRules(entry.story, rules, { nowSeconds: context.nowSeconds, feed: context.feed }) : emptyRuleResult();
    if (ruleResult.save || ruleResult.queue || ruleResult.tags.length > 0) {
      automation.push({ itemId: entry.story.id, save: ruleResult.save, queue: ruleResult.queue, tags: [...ruleResult.tags] });
    }
    if (ruleResult.hidden) {
      hiddenStoryIds.push(entry.story.id);
      continue;
    }
    items.push({
      story: entry.story,
      rankScore: entry.rankScore + (rankingEnabled ? ruleResult.scoreAdjustment : 0),
      rankingExplanations: entry.explanations,
      ruleResult,
      explanationText: explanationText(entry, ruleResult)
    });
  }

  if (rankingEnabled) items.sort((a, b) => b.rankScore - a.rankScore || a.story.id - b.story.id);
  hiddenStoryIds.sort((a, b) => a - b);
  automation.sort((a, b) => a.itemId - b.itemId);
  return { items, hiddenStoryIds, automation };
}
