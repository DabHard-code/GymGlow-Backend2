import { Platform } from 'react-native';
import Purchases from 'react-native-purchases';
import { config } from '@/lib/config';

let configured = false;
let currentAppUserId: string | null = null;

export function isRevenueCatAvailable() {
  return Platform.OS === 'ios' && Boolean(config.revenueCatIosApiKey);
}

export async function configureRevenueCat(appUserId?: string | null) {
  if (!isRevenueCatAvailable()) return;

  const nextAppUserId = appUserId ?? null;

  if (!configured) {
    if (__DEV__) {
      await Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);
    }

    Purchases.configure({
      apiKey: config.revenueCatIosApiKey,
      appUserID: nextAppUserId ?? undefined,
    });

    configured = true;
    currentAppUserId = nextAppUserId;
    return;
  }

  if (nextAppUserId && nextAppUserId !== currentAppUserId) {
    await Purchases.logIn(nextAppUserId);
    currentAppUserId = nextAppUserId;
  }
}
