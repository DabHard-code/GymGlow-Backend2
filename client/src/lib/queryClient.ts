import { QueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export const queryClient = new QueryClient();

export async function apiRequest(method: string, url: string, body?: any) {
  const { data } = await supabase.auth.getUser();

  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      "x-user-id": data?.user?.id || "",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status}: ${text}`);
  }

  return res;
}
