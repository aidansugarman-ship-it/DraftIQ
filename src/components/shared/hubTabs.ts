import { colors } from '@constants/colors';
import type { TabItem } from '@components/shared/TabSwitcher';

/** Trade Center — three sibling screens that feel like one. */
export const TRADE_TABS: TabItem[] = [
  { key: 'finder',   label: 'Finder',   icon: 'search',          route: '/trade-finder', accent: colors.purple },
  { key: 'block',    label: 'Block',    icon: 'megaphone',       route: '/trade-block',  accent: colors.coral },
  { key: 'analyzer', label: 'Analyzer', icon: 'git-compare',     route: '/trade',        accent: colors.gold },
];

/** Roster Tools — Optimize / Grade / Simulate triad. */
export const ROSTER_TABS: TabItem[] = [
  { key: 'optimize', label: 'Optimize', icon: 'flash',     route: '/lineup',      accent: colors.green },
  { key: 'grade',    label: 'Grade',    icon: 'clipboard', route: '/team-report', accent: colors.blue },
  { key: 'simulate', label: 'Simulate', icon: 'flask',     route: '/what-if',     accent: colors.purple },
];
