import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Fires when a player's trending add count spikes — potential waiver priority
export const onPlayerTrendingSpike = functions.firestore
  .document('players/{playerId}')
  .onUpdate(async (change, context) => {
    const after  = change.after.data();
    const before = change.before.data();

    // Alert if trending adds jumped by >50 in one sync cycle
    const addsBefore = (before.trendingAddCount as number) ?? 0;
    const addsAfter  = (after.trendingAddCount  as number) ?? 0;
    const spike      = addsAfter - addsBefore;

    if (spike < 50) return;

    const db   = admin.firestore();
    // Notify all GM-tier users who have waiver alerts enabled
    const snap = await db.collection('users')
      .where('tier', '==', 'gm')
      .where('notificationPreferences.waiverAlerts', '==', true)
      .limit(1000)
      .get();

    const tokens = snap.docs
      .map(d => d.data().pushToken)
      .filter((t): t is string => !!t);

    if (tokens.length === 0) return;

    const playerName = after.full_name ?? after.last_name ?? 'A player';
    const position   = after.position ?? '';
    const team       = after.team     ?? '';

    await admin.messaging().sendEachForMulticast({
      tokens,
      notification: {
        title: `📡 Waiver Alert — ${playerName} is trending`,
        body:  `${playerName} (${position}, ${team}) is being added in ${addsAfter} leagues. Check the waiver wire.`,
      },
      data: {
        type:     'waiver',
        playerId: context.params.playerId,
      },
      android: { channelId: 'waiver' },
    });
  });
