import { Linking, Platform } from 'react-native';
import Purchases, { type CustomerInfo, type PurchasesPackage } from 'react-native-purchases';
import { apiPost } from '@/lib/api';
import { configureRevenueCat, isRevenueCatAvailable } from '@/lib/revenuecat';

export type PaidPlan = 'coach' | 'competition';

export class PurchaseCancelledError extends Error {
  constructor() {
    super('Purchase cancelled');
    this.name = 'PurchaseCancelledError';
  }
}

type CheckoutResponse = {
  url?: string;
};

const productIds: Record<PaidPlan, string> = {
  coach: 'gymglow_coach_monthly',
  competition: 'gymglow_competition_monthly',
};

type PlanSyncResponse = {
  plan: 'none' | PaidPlan;
  subscriptionStatus: string | null;
};

export async function startPlanCheckout(plan: PaidPlan) {
  if (Platform.OS === 'ios' && isRevenueCatAvailable()) {
    await startRevenueCatCheckout(plan);
    return;
  }

  const data = await apiPost<CheckoutResponse>('/api/billing/checkout-session', { plan });
  if (!data.url) throw new Error('Checkout link was not created.');
  await Linking.openURL(data.url);
}

export async function restorePlanPurchases() {
  if (Platform.OS !== 'ios' || !isRevenueCatAvailable()) {
    throw new Error('Purchase restore is only available for Apple in-app purchases.');
  }

  await configureRevenueCat();
  const customerInfo = await Purchases.restorePurchases();
  return syncRevenueCatPlan(customerInfo);
}

async function startRevenueCatCheckout(plan: PaidPlan) {
  await configureRevenueCat();

  const revenueCatPackage = await findPackageForPlan(plan);
  try {
    const result = await Purchases.purchasePackage(revenueCatPackage);
    await syncRevenueCatPlan(result.customerInfo);
  } catch (error) {
    if (isPurchaseCancelled(error)) throw new PurchaseCancelledError();
    throw error;
  }
}

async function findPackageForPlan(plan: PaidPlan): Promise<PurchasesPackage> {
  const productId = productIds[plan];
  const offerings = await Purchases.getOfferings();
  const packages = Object.values(offerings.all).flatMap((offering) => offering.availablePackages ?? []);
  const revenueCatPackage = packages.find((candidate) => candidate.product.identifier === productId);

  if (!revenueCatPackage) {
    throw new Error('That subscription is not available yet. Check the RevenueCat offering and product IDs.');
  }

  return revenueCatPackage;
}

async function syncRevenueCatPlan(customerInfo: CustomerInfo) {
  const activeEntitlements = Object.keys(customerInfo.entitlements.active);
  return apiPost<PlanSyncResponse>('/api/billing/revenuecat-sync', { activeEntitlements });
}

function isPurchaseCancelled(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const value = error as { userCancelled?: unknown; code?: unknown; message?: unknown };
  return value.userCancelled === true || value.code === '1' || String(value.message ?? '').toLowerCase().includes('cancel');
}
