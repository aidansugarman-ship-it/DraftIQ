import { router } from 'expo-router';
import { EmptyState } from '@components/shared/EmptyState';
import { SPORTS, type SportId } from '@constants/sports';
import { useYahooStore } from '@store/useYahooStore';

/**
 * Smart "you can't use this here" message. Differentiates between:
 *   - Not signed into Yahoo at all → "Connect Yahoo"
 *   - Signed in but no league for THIS sport → "Create a {sport} league in Yahoo"
 *
 * `feature` is a short verb phrase, e.g. "set your lineup", "grade your team".
 */
export function NoLeagueState({ sport, feature }: { sport: SportId; feature: string }) {
  const connected = useYahooStore(s => s.connected);
  const sportDef  = SPORTS[sport];

  if (!connected) {
    return (
      <EmptyState
        emoji="🔗"
        title="Connect Yahoo first"
        body={`Link Yahoo so we can ${feature} for your real league.`}
        ctaLabel="Connect Yahoo"
        onCta={() => router.push('/settings/connect-yahoo')}
      />
    );
  }

  return (
    <EmptyState
      emoji={sportDef.emoji}
      title={`No ${sportDef.shortLabel} league yet`}
      body={`You're signed into Yahoo, you just don't have a ${sportDef.shortLabel} league this season. Make one in Yahoo and come back — DraftIQ will pick it up automatically.`}
    />
  );
}
