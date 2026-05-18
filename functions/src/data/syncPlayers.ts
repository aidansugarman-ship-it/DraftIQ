import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';

const SLEEPER_BASE = 'https://api.sleeper.app/v1';

// Scheduled daily at 6am ET — syncs all active players from Sleeper API
export const syncPlayersDaily = functions.pubsub
  .schedule('0 10 * * *')  // 10am UTC = 6am ET
  .timeZone('America/New_York')
  .onRun(async () => {
    const sports = ['nfl', 'nba', 'mlb', 'nhl'] as const;
    const db = admin.firestore();

    for (const sport of sports) {
      try {
        const res   = await fetch(`${SLEEPER_BASE}/players/${sport}`);
        const data  = await res.json() as Record<string, unknown>;
        const batch = db.batch();
        let   count = 0;

        for (const [id, player] of Object.entries(data)) {
          if (count >= 400) {
            await batch.commit();
            count = 0;
          }
          const ref = db.collection('players').doc(`${sport}_${id}`);
          batch.set(ref, { ...player as object, sport, sleeperPlayerId: id, lastSynced: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
          count++;
        }

        if (count > 0) await batch.commit();
        console.log(`Synced ${Object.keys(data).length} ${sport.toUpperCase()} players`);
      } catch (err) {
        console.error(`Failed to sync ${sport} players:`, err);
      }
    }
  });
