export const FEED_KINDS = ['top', 'new', 'best', 'ask', 'show', 'jobs'] as const;
export type FeedKind = (typeof FEED_KINDS)[number];
export type HnItemType = 'job' | 'story' | 'comment' | 'poll' | 'pollopt';

export interface HnItemRaw {
  id?: unknown;
  deleted?: unknown;
  type?: unknown;
  by?: unknown;
  time?: unknown;
  text?: unknown;
  dead?: unknown;
  parent?: unknown;
  poll?: unknown;
  kids?: unknown;
  url?: unknown;
  score?: unknown;
  title?: unknown;
  parts?: unknown;
  descendants?: unknown;
}

export interface Story {
  id: number;
  kind: 'story';
  hnType: 'story' | 'job' | 'poll' | 'pollopt';
  title: string;
  by: string;
  time: number;
  score: number;
  descendants: number;
  kids: number[];
  deleted: boolean;
  dead: boolean;
  domain: string | null;
  url?: string;
  text?: string;
  parent?: number;
  poll?: number;
  parts?: number[];
}

export interface Comment {
  id: number;
  kind: 'comment';
  hnType: 'comment';
  parent: number;
  by: string;
  time: number;
  text: string;
  kids: number[];
  deleted: boolean;
  dead: boolean;
}

export type HnItem = Story | Comment;

export interface HnUser {
  id: string;
  created: number;
  karma: number;
  about: string;
  submitted: number[];
}

export interface StorySnapshot {
  itemId: number;
  capturedAt: number;
  score: number;
  descendants: number;
  rank: number;
}

export interface FeedWeights {
  recency: number;
  score: number;
  discussion: number;
  growth: number;
  preferred: number;
  keyword: number;
}

export interface FeedPreset {
  id: string;
  name: string;
  weights: FeedWeights;
  recencyHalfLifeHours: number;
  preferredDomains: string[];
  preferredAuthors: string[];
  preferredKeywords: string[];
}

export interface RankingExplanation {
  code: 'recency' | 'score' | 'discussion' | 'growth' | 'preferred-domain' | 'preferred-author' | 'preferred-keyword';
  label: string;
  contribution: number;
}

export interface RankedStory {
  story: Story;
  rankScore: number;
  explanations: RankingExplanation[];
}

export type FilterCondition =
  | { type: 'keyword'; value: string }
  | { type: 'regex'; value: string; flags?: string }
  | { type: 'domain'; value: string }
  | { type: 'author'; value: string }
  | { type: 'storyType'; value: Story['hnType'] }
  | { type: 'minScore'; value: number }
  | { type: 'maxAgeHours'; value: number }
  | { type: 'feed'; value: FeedKind };

export type RuleAction =
  | { type: 'hide' }
  | { type: 'boost'; amount: number }
  | { type: 'demote'; amount: number }
  | { type: 'save' }
  | { type: 'queue' }
  | { type: 'tag'; value: string };

export interface FilterRule {
  id: string;
  name: string;
  enabled: boolean;
  conditions: FilterCondition[];
  action: RuleAction;
}

export interface RuleContext {
  nowSeconds: number;
  feed: FeedKind;
}

export interface RuleEvaluation {
  ruleId: string;
  matched: boolean;
  explanation: string;
}

export interface AppliedRules {
  hidden: boolean;
  scoreAdjustment: number;
  save: boolean;
  queue: boolean;
  tags: string[];
  evaluations: RuleEvaluation[];
}

export interface CommentRow {
  comment: Comment;
  depth: number;
  subtreeSize: number;
  isOp: boolean;
  isNew: boolean;
  isSaved: boolean;
  hasChildren: boolean;
  isCollapsed: boolean;
  missingChildCount: number;
}

export interface LibraryBookmark {
  itemId: number;
  createdAt: number;
}

export interface QueueEntry {
  itemId: number;
  createdAt: number;
}

export interface SavedComment {
  itemId: number;
  createdAt: number;
}

export interface CollectionRecord {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  itemIds: number[];
}

export interface NoteRecord {
  itemId: number;
  body: string;
  updatedAt: number;
}

export interface TagRecord {
  itemId: number;
  tags: string[];
}

export interface LibraryExportV1 {
  version: 1;
  exportedAt: number;
  bookmarks: LibraryBookmark[];
  queue: QueueEntry[];
  savedComments: SavedComment[];
  collections: CollectionRecord[];
  notes: NoteRecord[];
  tags: TagRecord[];
  presets: FeedPreset[];
  rules: FilterRule[];
}
