export type TierId = 'rookie' | 'starter' | 'gm';

export interface SubscriptionProduct {
  identifier: string;
  title: string;
  description: string;
  price: string;
  priceAmount: number;
  currencyCode: string;
  period: 'monthly' | 'annual';
  tier: TierId;
}

export interface CustomerInfo {
  activeSubscriptions: string[];
  entitlements: Record<string, EntitlementInfo>;
  originalAppUserId: string;
}

export interface EntitlementInfo {
  identifier: string;
  isActive: boolean;
  expirationDate: string | null;
  productIdentifier: string;
}

export interface SubscriptionState {
  tier: TierId;
  isActive: boolean;
  expiresAt: string | null;
  product: SubscriptionProduct | null;
  isLoading: boolean;
  error: string | null;
}
