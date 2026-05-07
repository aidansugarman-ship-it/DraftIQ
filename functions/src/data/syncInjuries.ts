import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Runs every 30 minutes during the season — keeps injury statuses current
export const syncInjuriesFrequent = functions.pubsub
  .schedule('*/30 * * * *')
  .onRun(async () => {
    const db = admin.firestore();

    // Sleeper provides injury status on the player object itself
    // We query players with a non-healthy status and refresh their injury doc
    const injured = await db.collection('players')
      .where('injury_status', '!=', null)
      .limit(500)
      .get();

    const batch = db.batch();
    injured.docs.forEach((doc) => {
      const data   = doc.data();
      const status = data.injury_status as string | null;
      if (!status) return;

      const injuryRef = db.collection('injuries').doc(doc.id);
      batch.set(injuryRef, {
        playerId:      doc.id,
        sport:         data.sport,
        status:        mapSleeperStatus(status),
        injuryNote:    data.injury_notes ?? '',
        lastUpdated:   admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    });

    await batch.commit();
    console.log(`Updated ${injured.size} injury records`);
  });

const mapSleeperStatus = (status: string): string => {
  const map: Record<string, string> = {
    'Out':          'out',
    'Questionable': 'questionable',
    'Doubtful':     'doubtful',
    'IR':           'ir',
    'PUP':          'ir',
    'DNR':          'out',
  };
  return map[status] ?? 'questionable';
};
