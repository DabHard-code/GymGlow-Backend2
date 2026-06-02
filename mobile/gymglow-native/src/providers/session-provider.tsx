import { PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from 'react';
import * as Linking from 'expo-linking';
import type { Session } from '@supabase/supabase-js';
import { router } from 'expo-router';
import { handleAuthDeepLink } from '@/lib/deep-link-auth';
import { supabase } from '@/lib/supabase';
import { configureRevenueCat } from '@/lib/revenuecat';

type SessionContextValue = {
  session: Session | null;
  loading: boolean;
};

const SessionContext = createContext<SessionContextValue>({
  session: null,
  loading: true,
});

export function SessionProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function processAuthLink(url: string | null) {
      try {
        await handleAuthDeepLink(url);
        if (url?.includes('auth/callback')) router.replace('/(tabs)');
      } catch (error) {
        console.warn('Could not finish auth link', error);
      }
    }

    Linking.getInitialURL().then(processAuthLink);
    const linkSubscription = Linking.addEventListener('url', ({ url }) => {
      processAuthLink(url);
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      configureRevenueCat(data.session?.user.id).catch(console.warn);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession ?? null);
      configureRevenueCat(nextSession?.user.id).catch(console.warn);
      setLoading(false);
    });

    return () => {
      linkSubscription.remove();
      listener.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(() => ({ session, loading }), [session, loading]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  return useContext(SessionContext);
}
