import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getUser();
  const userId = data?.user?.id;

  return userId ? { "x-user-id": userId } : {};
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

function safeFallbackForUrl(url: string): unknown {
  const cleanUrl = url.split("?")[0];

  // List endpoints used by Home/Profile/Leaderboard must be arrays,
  // otherwise pages can crash on .map(), .length, etc.
  if (
    cleanUrl.endsWith("/api/athletes") ||
    cleanUrl.includes("/analyses") ||
    cleanUrl.includes("/profiles") ||
    cleanUrl.includes("/challenges") ||
    cleanUrl.includes("/badges") ||
    cleanUrl.includes("/meets") ||
    cleanUrl.includes("/seasons")
  ) {
    return [];
  }

  // Points/leaderboard endpoints should return stable object shapes.
  if (cleanUrl.includes("/api/points/hub")) {
    return {
      totalPoints: 0,
      challengeCount: 0,
      basePoints: 0,
      aiBonus: 0,
      allChallengesBonus: 0,
      recentActivity: [],
    };
  }

  if (cleanUrl.includes("/api/leaderboard/weekly")) {
    return {
      rankings: [],
      yourRank: null,
      totalPlayers: 0,
    };
  }

  // Current user may legitimately be unavailable while auth loads.
  if (cleanUrl.endsWith("/api/users/me")) {
    return null;
  }

  return null;
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const authHeaders = await getAuthHeaders();

  const headers: Record<string, string> = {
    ...authHeaders,
  };

  if (data !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data !== undefined ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";

export const getQueryFn =
  <T = unknown>(options: { on401: UnauthorizedBehavior }): QueryFunction<T | null> =>
  async ({ queryKey }) => {
    const url = String(queryKey[0]);
    const authHeaders = await getAuthHeaders();

    try {
      const res = await fetch(url, {
        headers: {
          ...authHeaders,
        },
        credentials: "include",
      });

      if (res.status === 401 && options.on401 === "returnNull") {
        return safeFallbackForUrl(url) as T;
      }

      await throwIfResNotOk(res);

      // Some endpoints may return 204/no body.
      const text = await res.text();
      if (!text) return safeFallbackForUrl(url) as T;

      return JSON.parse(text) as T;
    } catch (error) {
      console.error("Query request failed:", url, error);

      if (options.on401 === "returnNull") {
        return safeFallbackForUrl(url) as T;
      }

      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "returnNull" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
      throwOnError: false,
    },
    mutations: {
      retry: false,
      throwOnError: false,
    },
  },
});
