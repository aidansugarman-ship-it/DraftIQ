import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { doc, updateDoc } from 'firebase/firestore';
import { db, COLLECTIONS } from './firebase';

// Show notifications as banners with sound when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  true,
  }),
});

export const registerForPushNotifications = async (
  userId: string
): Promise<string | null> => {
  if (!Device.isDevice) {
    console.warn('Push notifications only work on physical devices.');
    return null;
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  const tokenData = await Notifications.getExpoPushTokenAsync();
  const token = tokenData.data;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'DraftIQ Alerts',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#00FF87',
      sound: 'default',
    });

    await Notifications.setNotificationChannelAsync('injury', {
      name: 'Injury Alerts',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 400, 200, 400],
      lightColor: '#FF5F5F',
    });

    await Notifications.setNotificationChannelAsync('waiver', {
      name: 'Waiver Wire Alerts',
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: '#00FF87',
    });

    await Notifications.setNotificationChannelAsync('gm-report', {
      name: 'GM Weekly Report',
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: '#C9A84C',
    });
  }

  // Persist token to Firestore so Cloud Functions can send targeted FCM messages
  try {
    await updateDoc(doc(db, COLLECTIONS.USERS, userId), {
      pushToken: token,
      pushTokenUpdatedAt: new Date().toISOString(),
    });
  } catch {
    // Non-critical — don't block the flow if Firestore update fails
  }

  return token;
};

export const scheduleLocalNotification = async (
  title: string,
  body: string,
  trigger?: Notifications.NotificationTriggerInput
): Promise<string> => {
  return await Notifications.scheduleNotificationAsync({
    content: { title, body, sound: 'default' },
    trigger: trigger ?? null,
  });
};

export const cancelNotification = async (id: string): Promise<void> => {
  await Notifications.cancelScheduledNotificationAsync(id);
};

export const setBadgeCount = async (count: number): Promise<void> => {
  await Notifications.setBadgeCountAsync(count);
};

export const clearBadge = async (): Promise<void> => {
  await Notifications.setBadgeCountAsync(0);
};
