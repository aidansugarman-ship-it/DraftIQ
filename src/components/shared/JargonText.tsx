import { Text } from '@components/ui/Text';
import { GlossaryTerm } from '@components/shared/GlossaryTerm';
import type { TextStyle } from 'react-native';

/**
 * Wraps AI-generated copy and auto-links any known fantasy jargon to the
 * glossary modal. Drop-in replacement for <Text>{aiCopy}</Text>.
 *
 * The token list intentionally covers terms across all 4 sports — the
 * glossary explanation is sport-tailored at tap time.
 */
const JARGON = [
  // Cross-sport
  'ADP', 'IDP', 'PPR', 'DFS', 'WAIVER', 'WAIVER WIRE', 'FAAB',
  'DYNASTY', 'KEEPER', 'IR', 'BOOM/BUST', 'CEILING', 'FLOOR',
  'STREAM', 'STREAMER', 'STASH', 'HANDCUFF', 'BREAKOUT', 'BUST',
  // NFL
  'TARGET SHARE', 'AIR YARDS', 'SNAP COUNT', 'RZ', 'RED ZONE',
  'YPC', 'YPRR', 'EPA', 'DVOA', 'XFP',
  // NBA
  'USG', 'USAGE RATE', 'TS%', 'EFG%', 'PER',
  // MLB
  'BABIP', 'OPS', 'WAR', 'WHIP', 'ERA', 'WOBA', 'XBA', 'XWOBA',
  'EXIT VELO', 'BARRELS',
  // NHL
  'XG', 'CORSI', 'FENWICK', 'PDO', 'TOI',
];

// Sort longest-first so "WAIVER WIRE" matches before "WAIVER"
const sorted = [...JARGON].sort((a, b) => b.length - a.length);

function buildRegex(): RegExp {
  const escaped = sorted.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  // \b doesn't play with % so we use a manual boundary on the right.
  return new RegExp(`\\b(${escaped.join('|')})(?=[\\s.,!?;:)"']|$)`, 'gi');
}

const RE = buildRegex();

export function JargonText({
  children,
  style,
  numberOfLines,
  variant = 'body',
  color,
}: {
  children: string;
  style?:   TextStyle | TextStyle[];
  numberOfLines?: number;
  variant?: React.ComponentProps<typeof Text>['variant'];
  color?:   string;
}) {
  if (!children) return null;
  const parts: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  RE.lastIndex = 0;
  while ((m = RE.exec(children)) !== null) {
    if (m.index > last) parts.push(children.slice(last, m.index));
    parts.push(
      <GlossaryTerm key={`${m.index}-${m[0]}`} term={m[0].toUpperCase()}>
        {m[0]}
      </GlossaryTerm>,
    );
    last = m.index + m[0].length;
  }
  if (last < children.length) parts.push(children.slice(last));

  return (
    <Text variant={variant} color={color} style={style} numberOfLines={numberOfLines}>
      {parts}
    </Text>
  );
}
