// 4pt base grid — all values are multiples of 4
export const spacing = {
  xs:   4,
  sm:   8,
  md:   12,
  base: 16,
  lg:   20,
  xl:   24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 64,
  '6xl': 80,
} as const;

export const radius = {
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  '2xl': 28,
  full: 9999,
} as const;

// Safe, consistent horizontal padding used across all screens
export const screenPadding = {
  horizontal: 16,
  vertical:   20,
} as const;

// Standard card padding
export const cardPadding = {
  horizontal: 14,
  vertical:   14,
} as const;

export type Spacing = keyof typeof spacing;
export type Radius  = keyof typeof radius;
