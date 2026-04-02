import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import NotificationSettingsPage from "@/pages/notification-settings";
import type { User } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import PrivacyPage from "@/pages/privacy";
import TermsPage from "@/pages/terms";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import ProfilePage from "@/pages/profile";
import SettingsPage from "@/pages/settings";
import DrillsPage from "@/pages/drills";
import ChallengesPage from "@/pages/challenges";
import LeaderboardPage from "@/pages/leaderboard";
import SkillsPage from "@/pages/skills";
import MeetScoresPage from "@/pages/meet-scores";
import AuthPage from "@/pages/auth";
import BadgesPage from "@/pages/badges";
import CompetitionResultsPage from "@/pages/competition-results";
import BillingSuccessPage from "@/pages/billing-success";
import BillingCancelPage from "@/pages/billing-cancel";

type AuthContextValue = {
  user: User | null;
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextValue>({ user: null, isLoading: true });

function useAuth() {
  return useContext(AuthContext);
}

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // 1) Load initial session
    (async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.error("Supabase getSession error:", error.message);
        }
        if (mounted) {
          setUser(data.session?.user ?? null);
          setIsLoading(false);
        }
      } catch (e) {
        console.error("Supabase getSession exception:", e);
        if (mounted) setIsLoading(false);
      }
    })();

    // 2) Subscribe to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(() => ({ user, isLoading }), [user, isLoading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function FullPageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
      Loading…
    </div>
  );
}

function Protected({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();

  if (isLoading) return <FullPageLoader />;

  // If not logged in, hard redirect immediately (no effect timing issues)
  if (!user) {
    // avoid redirect loop if already on /auth
    if (location !== "/auth") return <Redirect to="/auth" />;
    return null;
  }

  return <>{children}</>;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isLoading) return;
    if (user) {
      setLocation("/");
    }
  }, [user, isLoading, setLocation]);

  if (isLoading) return <FullPageLoader />;
  if (user) return null;
  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      {/* Auth route: parents can log in / sign up here */}
      <Route
        path="/auth"
        component={() => (
          <AuthRoute>
            <AuthPage />
          </AuthRoute>
        )}
      />

      {/* Existing app routes */}
      <Route
        path="/"
        component={() => (
          <Protected>
            <Home />
          </Protected>
        )}
      />
      <Route
        path="/profile/:id"
        component={() => (
          <Protected>
            <ProfilePage />
          </Protected>
        )}
      />
      <Route
        path="/settings"
        component={() => (
          <Protected>
            <SettingsPage />
          </Protected>
        )}
      />

      <Route path="/notification-settings">
  <Protected>
    <NotificationSettingsPage />
  </Protected>
</Route>

<Route path="/notification-settings/:rest*">
  <Protected>
    <NotificationSettingsPage />
  </Protected>
</Route>

      <Route
        path="/drills"
        component={() => (
          <Protected>
            <DrillsPage />
          </Protected>
        )}
      />
      <Route
        path="/challenges"
        component={() => (
          <Protected>
            <ChallengesPage />
          </Protected>
        )}
      />
      <Route
        path="/leaderboard"
        component={() => (
          <Protected>
            <LeaderboardPage />
          </Protected>
        )}
      />
      <Route
        path="/skills"
        component={() => (
          <Protected>
            <SkillsPage />
          </Protected>
        )}
      />
      <Route
        path="/badges/:athleteId"
        component={(props) => (
          <Protected>
            <BadgesPage {...(props as any)} />
          </Protected>
        )}
      />
      <Route
        path="/meet-scores/:athleteId"
        component={() => (
          <Protected>
            <MeetScoresPage />
          </Protected>
        )}
      />
      <Route
        path="/competition-results/:athleteId"
        component={() => (
          <Protected>
            <CompetitionResultsPage />
          </Protected>
        )}
      />

      {/* Billing */}
      <Route
        path="/billing/success"
        component={() => (
          <Protected>
            <BillingSuccessPage />
          </Protected>
        )}
      />
      <Route
        path="/billing/cancel"
        component={() => (
          <Protected>
            <BillingCancelPage />
          </Protected>
        )}
      />

      {/* Legal */}
<Route
  path="/terms"
  component={() => <TermsPage />}
/>

<Route
  path="/privacy"
  component={() => <PrivacyPage />}
/>


      {/* 404 fallback */}
      <Route
        component={() => (
          <Protected>
            <NotFound />
          </Protected>
        )}
      />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;