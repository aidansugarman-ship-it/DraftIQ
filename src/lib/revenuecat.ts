import Purchases, {
  type PurchasesPackage,
  type CustomerInfo,
  type PurchasesOffering,
} from 'react-native-purchases';
import { Platform } from 'react-native';
import type { TierId } from '../types/subscription';

// RevenueCat API keys — set in .env as EXPO_PUBLIC_REVENUECAT_API_KEY_IOS / _ANDROID
// These are publishable keys — safe to include in the client bundle
const API_KEY = Platform.select({
  ios:     process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS     ?? '',
  android: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID ?? '',
}) ?? '';

// RevenueCat entitlement identifiers — must match what you configure in the RC dashboard
export const ENTITLEMENTS = {
  STARTER: 'starter',
  GM:      'gm',
} as const;

export const initRevenueCat = (userId?: string): void => {
  Purchases.configure({
    apiKey:    API_KEY,
    appUserID: userId,
  });
};

export const identifyUser = async (userId: string): Promise<void> => {
  await Purchases.logIn(userId);
};

export const logOutRevenueCat = async (): Promise<void> => {
  await Purchases.logOut();
};

export const getOfferings = async (): Promise<PurchasesOffering | null> => {
  const offerings = await Purchases.getOfferings();
  return offerings.current;
};

export const purchasePackage = async (pkg: PurchasesPackage): Promise<CustomerInfo> => {
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return customerInfo;
};

export const restorePurchases = async (): Promise<CustomerInfo> => {
  return await Purchases.restorePurchases();
};

export const getCustomerInfo = async (): Promise<CustomerInfo> => {
  return await Purchases.getCustomerInfo();
};

// Derives the user's tier from their active entitlements
export const getTierFromCustomerInfo = (info: CustomerInfo): TierId => {
  if (info.entitlements.active[ENTITLEMENTS.GM]?.isActive)      return 'gm';
  if (info.entitlements.active[ENTITLEMENTS.STARTER]?.isActive) return 'starter';
  return 'rookie';
};
