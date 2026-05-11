import type { SportId } from '../constants/sports';
import type { TeamArchetype, LeagueSettings } from './draft';
import type { TierId } from './subscription';
import type { PlayerFlag } from './player';

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  tier: TierId;
  createdAt: string;
  onboardingComplete: boolean;
  primarySport: SportId;
  preferredSports: SportId[];
  leagueSettings?: LeagueSettings;
  archetype?: TeamArchetype;
  gmBadge: boolean;
  pushToken?: string;
  sleeperUsername?: string;
  notificationPreferences: NotificationPreferences;
  connectedLeagues: ConnectedLeague[];
  draftBoardIds: string[];      // refs to draftBoards subcollection
  watchListPlayerIds: string[]; // refs to watchList subcollection
}

export interface NotificationPreferences {
  injuryAlerts: boolean;
  waiverAlerts: boolean;
  sleeperAlerts: boolean;
  gmReport: boolean;            // Tuesday morning GM report
  draftReminders: boolean;
  contractYearAlerts: boolean;
  weatherAlerts: boolean;
}

export interface ConnectedLeague {
  id: string;
  platform: 'yahoo' | 'espn' | 'sleeper';
  leagueName: string;
  teamName: string;
  leagueId: string;
  teamId: string;
  connectedAt: string;
  sport: SportId;
}

export interface WatchListEntry {
  playerId: string;
  flag: PlayerFlag;
  note?: string;
  addedAt: string;
}

// PlayerFlag re-exported for convenience
export type { PlayerFlag };
