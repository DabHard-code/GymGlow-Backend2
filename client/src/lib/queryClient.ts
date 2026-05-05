import { QueryClient, QueryFunction, QueryKey } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function buildUrlFromQueryKey(queryKey: QueryKey): string {
  const parts = queryKey
    .filter((part) => part !== undefined && part !== null && part !== "")
    .map((part) => String(part));

  if (parts.length === 0) return "/";

  // If the first key already contains query params, keep it exactly.
  if (parts.length === 1 || parts[0].includes("?")) {
    return parts[0];
  }

  return parts
    .map((part, index) => {
      if (index === 0) return part.replace(/\/+$/g, "");
      return part.replace(/^\/+|\/+$/g, "");
    })
    .join("/");
}

async function getCurrentSessionAuth(): Promise<{ token: string; userId: string } | null> {
  const sessionResult = await supabase.auth.getSession();
  const session = sessionResult.data.session;
  if (session?.access_token && session.user?.id) {
    return { token: session.access_token, userId: session.user.id };
  }

  return null;
}

export async function getAuthHeaders(): Promise<Record<string, string>> {
  let auth = await getCurrentSessionAuth();

  if (!auth) {
    for (let i = 0; i < 10; i += 1) {
      await wait(150);
      auth = await getCurrentSessionAuth();
      if (auth) break;
    }
  }

  return auth
    ? {
        Authorization: `Bearer ${auth.token}`,
      }
    : {};
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

export const getQueryFn =
  <T = unknown>(): QueryFunction<T> =>
  async ({ queryKey }) => {
    const url = buildUrlFromQueryKey(queryKey);
    const authHeaders = await getAuthHeaders();

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
