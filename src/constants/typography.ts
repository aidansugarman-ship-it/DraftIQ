import {
  BebasNeue_400Regular,
} from '@expo-google-fonts/bebas-neue';
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';

// Pass to useFonts() in root _layout.tsx
export const fontAssets = {
  BebasNeue_400Regular,
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
};

export const fonts = {
  display: 'BebasNeue_400Regular',      // Headers, stats, score gauges
  body: 'DMSans_400Regular',            // Body copy, descriptions
  bodyMedium: 'DMSans_500Medium',       // Labels, badges, UI chrome
  bodyBold: 'DMSans_700Bold',           // Emphasized body text
} as const;

export const typography = {
  // ── Display — Bebas Neue ─────────────────────────────────────────────────
  hero:      { fontFamily: fonts.display, fontSize: 52, lineHeight: 52, letterSpacing: 2 },
  h1:        { fontFamily: fonts.display, fontSize: 40, lineHeight: 42, letterSpacing: 1.5 },
  h2:        { fontFamily: fonts.display, fontSize: 30, lineHeight: 34, letterSpacing: 1.2 },
  h3:        { fontFamily: fonts.display, fontSize: 24, lineHeight: 28, letterSpacing: 0.8 },
  h4:        { fontFamily: fonts.display, fontSize: 20, lineHeight: 24, letterSpacing: 0.6 },

  // ── Body — DM Sans ───────────────────────────────────────────────────────
  bodyLarge:        { fontFamily: fonts.body, fontSize: 17, lineHeight: 26 },
  body:             { fontFamily: fonts.body, fontSize: 15, lineHeight: 22 },
  bodyMedium:       { fontFamily: fonts.bodyMedium, fontSize: 15, lineHeight: 22 },
  bodySmall:        { fontFamily: fonts.body, fontSize: 13, lineHeight: 18 },
  bodySmallMedium:  { fontFamily: fonts.bodyMedium, fontSize: 13, lineHeight: 18 },
  bodyBold:         { fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 22 },

  // ── Labels & captions ────────────────────────────────────────────────────
  label:       { fontFamily: fonts.bodyMedium, fontSize: 12, lineHeight: 16, letterSpacing: 0.6 },
  labelSmall:  { fontFamily: fonts.bodyMedium, fontSize: 11, lineHeight: 14, letterSpacing: 0.5 },
  caption:     { fontFamily: fonts.body, fontSize: 11, lineHeight: 15 },

  // ── Stats & numbers — always Bebas Neue ──────────────────────────────────
  statHero:   { fontFamily: fonts.display, fontSize: 48, lineHeight: 50 },
  statLarge:  { fontFamily: fonts.display, fontSize: 36, lineHeight: 38 },
  stat:       { fontFamily: fonts.display, fontSize: 26, lineHeight: 28 },
  statSmall:  { fontFamily: fonts.display, fontSize: 20, lineHeight: 22 },
} as const;
