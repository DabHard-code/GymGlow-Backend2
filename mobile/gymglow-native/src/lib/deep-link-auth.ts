import * as Linking from 'expo-linking';
import { supabase } from '@/lib/supabase';

export const authRedirectUrl = Linking.createURL('auth/callback');

export async function handleAuthDeepLink(url: string | null) {
  if (!url) return;

  const params = readUrlParams(url);
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  const code = params.get('code');

  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) throw error;
    return;
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
  }
}

function readUrlParams(url: string) {
  const parsed = Linking.parse(url);
  const params = new URLSearchParams();

  Object.entries(parsed.queryParams ?? {}).forEach(([key, value]) => {
    if (typeof value === 'string') params.set(key, value);
  });

  const fragment = url.split('#')[1];
  if (fragment) {
    new URLSearchParams(fragment).forEach((value, key) => params.set(key, value));
  }

  return params;
}
