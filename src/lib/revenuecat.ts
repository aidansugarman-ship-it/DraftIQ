import { Platform } from 'react-native';
import type { TierId } from '../types/subscription';

export const ENTITLEMENTS = {
  STARTER: 'starter',
  GM:      'gm',
} as const;

const getApiKey = () => Platform.select({
  ios:     process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS     ?? '',
  android: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID ?? '',
}) ?? '';

// All RevenueCat calls lazy-import the native module so Expo Go doesn't crash

export const initRevenueCat = async (userId?: string): Promise<void> => {
  try {
    const { default: Purchases } = await import('react-native-purchases');
    Purchases.configure({ apiKey: getApiKey(), appUserID: userId });
  } catch { /* native module not available in Expo Go */ }
};

export const identifyUser = async (userId: string): Promise<void> => {
  try {
    const { default: Purchases } = await import('react-native-purchases');
    await Purchases.logIn(userId);
  } catch {}
};

export const logOutRevenueCat = async (): Promise<void> => {
  try {
    const { default: Purchases } = await import('react-native-purchases');
    await Purchases.logOut();
  } catch {}
};

export const getOfferings = async (): Promise<any | null> => {
  try {
    const { default: Purchases } = await import('react-native-purchases');
    const offerings = await Purchases.getOfferings();
    return offerings.current;
  } catch { return null; }
};

export const purchasePackage = async (pkg: any): Promise<any> => {
  const { default: Purchases } = await import('react-native-purchases');
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return customerInfo;
};

export const restorePurchases = async (): Promise<any> => {
  const { default: Purchases } = await import('react-native-purchases');
  return Purchases.restorePurchases();
};

export const getCustomerInfo = async (): Promise<any> => {
  const { default: Purchases } = await import('react-native-purchases');
  return Purchases.getCustomerInfo();
};

export const getTierFromCustomerInfo = (info: any): TierId => {
  if (info?.entitlements?.active[ENTITLEMENTS.GM]?.isActive)      return 'gm';
  if (info?.entitlements?.active[ENTITLEMENTS.STARTER]?.isActive) return 'starter';
  return 'rookie';
};
