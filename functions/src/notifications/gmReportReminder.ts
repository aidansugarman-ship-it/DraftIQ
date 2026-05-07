import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Every Tuesday at 9am ET — remind GM-tier users their weekly report is ready
export const sendGMReportReminder = functions.pubsub
  .schedule('0 13 * * 2')  // 13:00 UTC = 9am ET, Tuesday (day 2)
  .timeZone('America/New_York')
  .onRun(async () => {
    const db   = admin.firestore();
    const snap = await db.collection('users')
      .where('tier', '==', 'gm')
      .where('notificationPreferences.gmReport', '==', true)
      .get();

    const tokens = snap.docs
      .map(d => d.data().pushToken)
      .filter((t): t is string => !!t);

    if (tokens.length === 0) return;

    // Send in batches of 500 (FCM multicast limit)
    for (let i = 0; i < tokens.length; i += 500) {
      await admin.messaging().sendEachForMulticast({
        tokens: tokens.slice(i, i + 500),
        notification: {
          title: '📊 Your GM Report is ready',
          body:  'Your weekly roster analysis, grades, and move recommendations are waiting.',
        },
        data: { type: 'gm-report' },
        android: { channelId: 'gm-report' },
      });
    }

    console.log(`Sent GM Report reminders to ${tokens.length} users`);
  });
