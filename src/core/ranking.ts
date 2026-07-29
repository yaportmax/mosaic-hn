import type { FeedPreset, RankedStory, RankingExplanation, Story, StorySnapshot } from './models.ts';

export const DEFAULT_FEED_PRESET: FeedPreset = {
  id: 'balanced',
  name: 'Balanced',
  weights: { recency: 1.4, score: 1, discussion: 0.8, growth: 1.1, preferred: 1, keyword: 1 },
  recencyHalfLifeHours: 12,
  preferredDomains: [],
  preferredAuthors: [],
  preferredKeywords: []
};

export interface RankingContext {
  nowSeconds: number;
  snapshots?: Map<number, StorySnapshot>;
}

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));
const normalizeLog = (value: number, ceiling: number): number => clamp01(Math.log1p(Math.max(0, value)) / Math.log1p(ceiling));
const domainMatches = (domain: string | null, preferred: string): boolean => Boolean(domain && (domain === preferred || domain.endsWith(`.${preferred}`)));

export function rankStories(stories: readonly Story[], preset: FeedPreset, context: RankingContext): RankedStory[] {
  const preferredDomains = preset.preferredDomains.map((value) => value.trim().toLowerCase()).filter(Boolean);
  const preferredAuthors = new Set(preset.preferredAuthors.map((value) => value.trim().toLowerCase()).filter(Boolean));
  const preferredKeywords = preset.preferredKeywords.map((value) => value.trim().toLowerCase()).filter(Boolean);
  const halfLife = Math.max(0.25, preset.recencyHalfLifeHours);

  const ranked = stories.map((story): RankedStory => {
    const explanations: RankingExplanation[] = [];
    const ageHours = Math.max(0, context.nowSeconds - story.time) / 3600;
    const recency = Math.pow(0.5, ageHours / halfLife) * preset.weights.recency;
    const score = normalizeLog(story.score, 1_000) * preset.weights.score;
    const discussion = normalizeLog(story.descendants, 500) * preset.weights.discussion;
    explanations.push({ code: 'recency', label: 'Recency', contribution: recency });
    explanations.push({ code: 'score', label: 'Story score', contribution: score });
    explanations.push({ code: 'discussion', label: 'Discussion size', contribution: discussion });

    let growth = 0;
    const snapshot = context.snapshots?.get(story.id);
    if (snapshot && snapshot.capturedAt < context.nowSeconds) {
      const elapsedHours = Math.max((context.nowSeconds - snapshot.capturedAt) / 3600, 1 / 60);
      const pointsPerHour = Math.max(0, story.score - snapshot.score) / elapsedHours;
      const commentsPerHour = Math.max(0, story.descendants - snapshot.descendants) / elapsedHours;
      growth = clamp01((Math.log1p(pointsPerHour) + 0.65 * Math.log1p(commentsPerHour)) / 6) * preset.weights.growth;
      if (growth > 0) explanations.push({ code: 'growth', label: 'Locally observed growth', contribution: growth });
    }

    let preferred = 0;
    if (preferredDomains.some((domain) => domainMatches(story.domain, domain))) {
      preferred += preset.weights.preferred;
      explanations.push({ code: 'preferred-domain', label: `Preferred domain: ${story.domain ?? ''}`, contribution: preset.weights.preferred });
    }
    if (preferredAuthors.has(story.by.toLowerCase())) {
      preferred += preset.weights.preferred;
      explanations.push({ code: 'preferred-author', label: `Preferred author: ${story.by}`, contribution: preset.weights.preferred });
    }
    const haystack = `${story.title} ${story.text ?? ''}`.toLowerCase();
    const keywordMatches = preferredKeywords.filter((keyword) => haystack.includes(keyword));
    const keywordContribution = keywordMatches.length > 0 ? preset.weights.keyword * Math.min(2, keywordMatches.length) : 0;
    if (keywordContribution > 0) {
      explanations.push({ code: 'preferred-keyword', label: `Preferred keyword: ${keywordMatches.join(', ')}`, contribution: keywordContribution });
    }

    return { story, rankScore: recency + score + discussion + growth + preferred + keywordContribution, explanations };
  });

  return ranked.sort((a, b) => b.rankScore - a.rankScore || a.story.id - b.story.id);
}
