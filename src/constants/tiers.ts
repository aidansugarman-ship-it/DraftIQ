import type { TierId } from '../types/subscription';

export interface TierLimit {
  playerLookupsPerDay: number | null;   // null = unlimited
  mockDraftsPerDay: number | null;
  articlesPerWeek: number | null;
  addDropPerWeek: number | null;
  sportsCount: number | null;           // null = all 4 sports
}

export interface TierDefinition {
  id: TierId;
  label: string;         // "Rookie" / "Starter" / "GM"
  badge: string;         // "FREE" / "PRO" / "GM"
  color: string;
  price: {
    monthly: string;
    annual: string;
    monthlyAmount: number;
    annualAmount: number;
    annualPerMonth: string;  // e.g. "$4.17/mo"
  } | null;
  limits: TierLimit;
  features: string[];
  lockedFeatures: string[];  // shown on paywall as "what you're missing"
}

export const TIERS: Record<TierId, TierDefinition> = {
  rookie: {
    id: 'rookie',
    label: 'Rookie',
    badge: 'FREE',
    color: '#6B7280',
    price: null,
    limits: {
      playerLookupsPerDay: 3,
      mockDraftsPerDay: 1,
      articlesPerWeek: 2,
      addDropPerWeek: 0,
      sportsCount: 1,
    },
    features: [
      '3 player lookups per day',
      'Basic player cards — stats & injury status',
      '1 NFL mock draft per day',
      '2 articles per week',
      'Ads displayed',
    ],
    lockedFeatures: [
      'Full AI player analysis',
      'Player background stories',
      'All 4 sports',
      'Add/Drop advisor',
      'Trade analyzer',
    ],
  },

  starter: {
    id: 'starter',
    label: 'Starter',
    badge: 'PRO',
    color: '#3B82F6',
    price: {
      monthly: '$6.99',
      annual: '$49.99',
      monthlyAmount: 6.99,
      annualAmount: 49.99,
      annualPerMonth: '$4.17/mo',
    },
    limits: {
      playerLookupsPerDay: null,
      mockDraftsPerDay: null,
      articlesPerWeek: null,
      addDropPerWeek: 5,
      sportsCount: null,
    },
    features: [
      'Unlimited player lookups — all 4 sports',
      'Full AI analysis on every player',
      'Why Draft + Why Avoid paragraphs',
      'Player background stories & fun facts',
      'Unlimited mock drafts — all sports',
      'Full article access',
      'Add/Drop advisor (5 per week)',
      'Player comparison tool (2–4 players)',
      'Trade analyzer',
      'Animated performance visualizations',
      'Injury tracker',
      'Contract year flags',
      'Vegas implied totals on player cards',
      'Draft recap share cards',
      'No ads',
    ],
    lockedFeatures: [
      'Unlimited Add/Drop advisor',
      'Full personalized AI draft board',
      'War Room live draft companion',
      'Dynasty mode & multi-year projections',
      'DFS lineup optimizer',
      'Weekly GM team report',
      'Real-time waiver push alerts',
    ],
  },

  gm: {
    id: 'gm',
    label: 'GM',
    badge: 'GM',
    color: '#C9A84C',
    price: {
      monthly: '$12.99',
      annual: '$89.99',
      monthlyAmount: 12.99,
      annualAmount: 89.99,
      annualPerMonth: '$7.50/mo',
    },
    limits: {
      playerLookupsPerDay: null,
      mockDraftsPerDay: null,
      articlesPerWeek: null,
      addDropPerWeek: null,
      sportsCount: null,
    },
    features: [
      'Everything in Starter',
      'Unlimited Add/Drop advisor',
      'Full personalized AI draft board',
      'Real-time waiver wire push alerts',
      'Deep schedule analysis — 6-week outlook',
      'War Room mode — live AI draft companion',
      'Dynasty mode — multi-year player projections',
      'DFS lineup optimizer (DraftKings / FanDuel)',
      'Auction draft support',
      'Trade analyzer with dynasty implications',
      'Weekly personalized GM team report',
      'Priority AI response speed',
      'Early access to new features',
      'GM badge on profile',
    ],
    lockedFeatures: [],
  },
};

export const TIER_ORDER: TierId[] = ['rookie', 'starter', 'gm'];

export const canAccess = (userTier: TierId, requiredTier: TierId): boolean => {
  return TIER_ORDER.indexOf(userTier) >= TIER_ORDER.indexOf(requiredTier);
};
