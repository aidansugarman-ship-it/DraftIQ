export const colors = {
  // Base surfaces
  background: '#0D0D0F',
  surface: '#141418',
  surfaceElevated: '#1C1C22',
  surfaceHigh: '#24242C',

  // Accent
  green: '#00FF87',
  coral: '#FF5F5F',
  gold: '#C9A84C',
  blue: '#3B82F6',
  purple: '#8B5CF6',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#9CA3AF',
  textTertiary: '#6B7280',
  textDisabled: '#374151',

  // Borders
  border: '#1F2028',
  borderSubtle: '#18181E',

  // Glow borders for AI sections
  glowGreen: 'rgba(0, 255, 135, 0.25)',
  glowCoral: 'rgba(255, 95, 95, 0.25)',
  glowGold: 'rgba(201, 168, 76, 0.25)',
  glowBlue: 'rgba(59, 130, 246, 0.25)',

  // Injury / status
  statusHealthy: '#00FF87',
  statusQuestionable: '#F59E0B',
  statusDoubtful: '#F97316',
  statusOut: '#FF5F5F',
  statusIR: '#6B7280',

  // Tier
  tierRookie: '#6B7280',
  tierStarter: '#3B82F6',
  tierGM: '#C9A84C',

  // Overlays
  paywallOverlay: 'rgba(13, 13, 15, 0.88)',
  darkOverlay: 'rgba(0, 0, 0, 0.65)',
  surfaceOverlay: 'rgba(20, 20, 24, 0.92)',

  // Gradient stops (use with LinearGradient)
  gradients: {
    cardOverlay: ['rgba(0,0,0,0)', 'rgba(13,13,15,0.95)'] as string[],
    greenGlow: ['rgba(0,255,135,0.12)', 'rgba(0,255,135,0.0)'] as string[],
    coralGlow: ['rgba(255,95,95,0.12)', 'rgba(255,95,95,0.0)'] as string[],
    goldGlow: ['rgba(201,168,76,0.18)', 'rgba(201,168,76,0.0)'] as string[],
    blueGlow: ['rgba(59,130,246,0.12)', 'rgba(59,130,246,0.0)'] as string[],
    surface: ['#141418', '#0D0D0F'] as string[],
    hero: ['rgba(13,13,15,0)', 'rgba(13,13,15,0.7)', '#0D0D0F'] as string[],
  },
} as const;
