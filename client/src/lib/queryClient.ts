import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function getCurrentUserId(): Promise<string | null> {
  // getSession is usually faster/more reliable right after page load.
  const sessionResult = await supabase.auth.getSession();
  const sessionUserId = sessionResult.data.session?.user?.id;
  if (sessionUserId) return sessionUserId;

  const userResult = await supabase.auth.getUser();
  const userId = userResult.data.user?.id;
  if (userId) return userId;

  return null;
}

async function getAuthHeaders(options?: { waitForAuth?: boolean }): Promise<Record<string, string>> {
  let userId = await getCurrentUserId();

  // On refresh, Supabase may need a moment to hydrate the session.
  // Protected app queries should wait briefly instead of immediately firing without x-user-id.
  if (!userId && options?.waitForAuth) {
    for (let i = 0; i < 10; i += 1) {
      await wait(150);
      userId = await getCurrentUserId();
      if (userId) break;
    }
  }

  return userId ? { "x-user-id": userId } : {};
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown,
): Promise<Response> {
  const authHeaders = await getAuthHeaders({ waitForAuth: true });

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

export const getQueryFn =
  <T = unknown>(): QueryFunction<T> =>
  async ({ queryKey }) => {
    const url = String(queryKey[0]);
    const authHeaders = await getAuthHeaders({ waitForAuth: true });

    const res = await fetch(url, {
      headers: {
        ...authHeaders,
      },
      credentials: "include",
    });

    await throwIfResNotOk(res);
    return (await res.json()) as T;
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn(),
      retry: false,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 30,
    },
    mutations: {
      retry: false,
    },
  },
});
