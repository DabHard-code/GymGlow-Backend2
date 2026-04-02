import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { supabase } from "./supabase";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// ✅ Ask Supabase for the currently logged-in user's ID + email
async function getCurrentUserInfo(): Promise<
  { id: string; email: string | null } | null
> {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    console.error("Error getting Supabase session:", error.message);
    return null;
  }

  const user = data.session?.user;
  if (!user) return null;

  return { id: user.id, email: user.email ?? null };
}

// ✅ Helper for POST/PUT/DELETE/etc
export async function apiRequest(
  method: string,
  url: string,
  data?: unknown,
): Promise<Response> {
  const user = await getCurrentUserInfo();
  if (!user) {
    throw new Error("401: Not authenticated – no Supabase user session");
  }

  const res = await fetch(url, {
    method,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "x-user-id": user.id,
      ...(user.email ? { "x-user-email": user.email } : {}),
    },
    body: data === undefined ? undefined : JSON.stringify(data),
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";

export function getQueryFn<T>(options: {
  on401: UnauthorizedBehavior;
}): QueryFunction<T> {
  return async ({ queryKey }) => {
    const url = queryKey.join("/") as string;

    const user = await getCurrentUserInfo();

    if (!user) {
      if (options.on401 === "returnNull") {
        return null as T;
      }
      throw new Error("401: Not authenticated – no Supabase user session");
    }

    const res = await fetch(url, {
      credentials: "include",
      headers: {
        "x-user-id": user.id,
        ...(user.email ? { "x-user-email": user.email } : {}),
      },
    });

    if (options.on401 === "returnNull" && res.status === 401) {
      return null as T;
    }

    await throwIfResNotOk(res);
    return (await res.json()) as T;
  };
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
