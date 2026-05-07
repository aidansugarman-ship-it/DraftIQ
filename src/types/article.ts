import type { SportId } from '../constants/sports';
import type { TierId } from './subscription';

export type ArticleCategory =
  | 'draft-prep'
  | 'waiver-wire'
  | 'start-sit'
  | 'team-analysis'
  | 'player-spotlight'
  | 'sleepers'
  | 'busts'
  | 'injury-updates'
  | 'rookie-watch'
  | 'dfs'
  | 'dynasty'
  | 'contract-year'
  | 'vegas-edge';

export const ARTICLE_CATEGORIES: Record<ArticleCategory, { label: string; emoji: string; color: string }> = {
  'draft-prep':       { label: 'Draft Prep',       emoji: '📋', color: '#3B82F6' },
  'waiver-wire':      { label: 'Waiver Wire',       emoji: '📡', color: '#00FF87' },
  'start-sit':        { label: 'Start/Sit',         emoji: '🪑', color: '#F59E0B' },
  'team-analysis':    { label: 'Team Analysis',     emoji: '🔬', color: '#8B5CF6' },
  'player-spotlight': { label: 'Player Spotlight',  emoji: '🔦', color: '#EC4899' },
  'sleepers':         { label: 'Sleepers',          emoji: '😴', color: '#00FF87' },
  'busts':            { label: 'Bust Alert',        emoji: '💣', color: '#FF5F5F' },
  'injury-updates':   { label: 'Injury Updates',   emoji: '🩹', color: '#FF5F5F' },
  'rookie-watch':     { label: 'Rookie Watch',      emoji: '🌱', color: '#10B981' },
  'dfs':              { label: 'DFS Edge',          emoji: '💰', color: '#C9A84C' },
  'dynasty':          { label: 'Dynasty',           emoji: '👑', color: '#C9A84C' },
  'contract-year':    { label: 'Contract Year',     emoji: '✍️',  color: '#F97316' },
  'vegas-edge':       { label: 'Vegas Edge',        emoji: '🎰', color: '#8B5CF6' },
};

export interface Article {
  id: string;
  title: string;
  subtitle?: string;
  body: string;              // markdown — rendered in ArticleDetail
  coverImageUrl?: string;
  sport: SportId | 'all';
  category: ArticleCategory;
  tierRequired: TierId;
  publishedAt: string;       // ISO
  readTimeMinutes: number;
  relatedPlayerIds?: string[];
  authorByline: string;      // "DraftIQ AI Analyst" — always AI-written
  tags: string[];
  isBreaking?: boolean;      // shown with red banner
}

// Lightweight version for list views
export interface ArticleSummary {
  id: string;
  title: string;
  subtitle?: string;
  coverImageUrl?: string;
  sport: SportId | 'all';
  category: ArticleCategory;
  tierRequired: TierId;
  publishedAt: string;
  readTimeMinutes: number;
  isBreaking?: boolean;
}
