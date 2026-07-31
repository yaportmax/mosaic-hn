import type { Story } from './models.ts';

const STOP_WORDS = new Set(['a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'how', 'in', 'is', 'it', 'of', 'on', 'or', 'that', 'the', 'this', 'to', 'was', 'what', 'when', 'where', 'with', 'why', 'you']);

export function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9][a-z0-9+#.-]{1,}/g) ?? []).filter((token) => !STOP_WORDS.has(token));
}

export interface RelatedStory {
  story: Story;
  similarity: number;
  sharedTerms: string[];
}

export function findRelatedStories(target: Story, candidates: readonly Story[], limit = 12): RelatedStory[] {
  const targetTokens = new Set(tokenize(`${target.title} ${target.text ?? ''}`));
  const results: RelatedStory[] = [];
  for (const story of candidates) {
    if (story.id === target.id) continue;
    const candidateTokens = new Set(tokenize(`${story.title} ${story.text ?? ''}`));
    const sharedTerms = [...targetTokens].filter((token) => candidateTokens.has(token));
    const unionSize = new Set([...targetTokens, ...candidateTokens]).size || 1;
    const lexical = sharedTerms.length / unionSize;
    const domainBonus = target.domain && story.domain === target.domain ? 0.12 : 0;
    const similarity = lexical + domainBonus;
    if (similarity > 0) results.push({ story, similarity, sharedTerms });
  }
  return results.sort((a, b) => b.similarity - a.similarity || b.sharedTerms.length - a.sharedTerms.length || a.story.id - b.story.id).slice(0, Math.max(0, limit));
}
