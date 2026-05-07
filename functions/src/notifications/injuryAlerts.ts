import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Fires when an injury document is created or updated
export const onInjuryUpdate = functions.firestore
  .document('injuries/{playerId}')
  .onWrite(async (change, context) => {
    const after  = change.after.data();
    const before = change.before.data();

    if (!after) return;

    // Only alert if status actually changed
    const statusChanged = !before || before.status !== after.status;
    if (!statusChanged) return;

    // Find all users who have this player on their watch list
    const db   = admin.firestore();
    const snap = await db.collectionGroup('watchList')
      .where('playerId', '==', context.params.playerId)
      .get();

    if (snap.empty) return;

    const userIds = snap.docs.map(d => d.ref.parent.parent!.id);
    const users   = await Promise.all(
      userIds.map(id => db.collection('users').doc(id).get())
    );

    const messaging = admin.messaging();
    const tokens    = users
      .map(u => u.data()?.pushToken)
      .filter((t): t is string => !!t);

    if (tokens.length === 0) return;

    const playerName  = after.playerName ?? 'A player on your watch list';
    const statusLabel = after.status === 'out' ? 'is OUT' : `is ${after.status?.toUpperCase()}`;

    await messaging.sendEachForMulticast({
      tokens,
      notification: {
        title: `🚨 Injury Alert — ${playerName}`,
        body:  `${playerName} ${statusLabel}. ${after.injuryNote ?? ''}`.trim(),
      },
      data: {
        type:     'injury',
        playerId: context.params.playerId,
      },
      android: { channelId: 'injury' },
    });
  });
