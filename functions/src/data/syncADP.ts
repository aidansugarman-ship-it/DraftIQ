import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';

// Syncs ADP data from Sleeper daily at 7am ET
export const syncADPDaily = functions.pubsub
  .schedule('0 11 * * *')  // 11am UTC = 7am ET
  .timeZone('America/New_York')
  .onRun(async () => {
    const db     = admin.firestore();
    const sports = ['nfl', 'nba', 'mlb', 'nhl'] as const;

    for (const sport of sports) {
      try {
        // Sleeper ADP endpoint — free, no key required
        const res  = await fetch(`https://api.sleeper.app/v1/players/${sport}/trending/add?limit=200&lookback_hours=48`);
        const data = await res.json() as Array<{ player_id: string; count: number }>;

        const batch = db.batch();
        data.forEach(({ player_id, count }, index) => {
          const ref = db.collection('players').doc(`${sport}_${player_id}`);
          batch.update(ref, {
            adp:             index + 1,
            trendingAddCount: count,
            adpLastUpdated:  admin.firestore.FieldValue.serverTimestamp(),
          }).catch(() => { /* player doc may not exist yet */ });
        });

        await batch.commit();
        console.log(`Synced ${data.length} ${sport.toUpperCase()} ADP records`);
      } catch (err) {
        console.error(`Failed to sync ${sport} ADP:`, err);
      }
    }
  });
