import type { SportId } from './sports';

/**
 * Per-sport vibe pack — emojis, terminology, accent vocabulary that make each sport
 * feel like its own world. Use these in section headers, CTAs, copy.
 */

export interface SportVibe {
  hot:       string;  // emoji for trending / hot board
  bold:      string;  // emoji for bold predictions
  sleeper:   string;  // emoji for sleeper picks
  news:      string;  // emoji for news reactions
  injury:    string;  // emoji for injury alerts
  add:       string;  // emoji for adds
  drop:      string;  // emoji for drops
  fire:      string;  // emoji for "going off"
  cold:      string;  // emoji for "going cold"
  scoreVerb: string;  // verb for "scoring" — TD, basket, hit, goal
  gameVerb:  string;  // verb for the action — toss, dunk, hit, shot
}

export const VIBES: Record<SportId, SportVibe> = {
  nfl: {
    hot:       '🏈',
    bold:      '🎯',
    sleeper:   '🚀',
    news:      '📰',
    injury:    '🏥',
    add:       '➕',
    drop:      '🗑️',
    fire:      '🔥',
    cold:      '🥶',
    scoreVerb: 'TD',
    gameVerb:  'snap',
  },
  nba: {
    hot:       '🏀',
    bold:      '🎯',
    sleeper:   '💎',
    news:      '📣',
    injury:    '🩹',
    add:       '➕',
    drop:      '🗑️',
    fire:      '🔥',
    cold:      '❄️',
    scoreVerb: 'bucket',
    gameVerb:  'possession',
  },
  mlb: {
    hot:       '⚾',
    bold:      '💥',
    sleeper:   '🌱',
    news:      '📻',
    injury:    '🏥',
    add:       '➕',
    drop:      '🗑️',
    fire:      '🔥',
    cold:      '🥶',
    scoreVerb: 'hit',
    gameVerb:  'at-bat',
  },
  nhl: {
    hot:       '🏒',
    bold:      '🚨',
    sleeper:   '❄️',
    news:      '📣',
    injury:    '🩹',
    add:       '➕',
    drop:      '🗑️',
    fire:      '🔥',
    cold:      '🧊',
    scoreVerb: 'goal',
    gameVerb:  'shot',
  },
};
