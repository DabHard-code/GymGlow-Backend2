import { getCurrentUser } from "@/auth";

let cachedUserId: string | null = null;

export async function getUserId() {
  if (cachedUserId) return cachedUserId;

  const user = await getCurrentUser();
  if (!user) return null;

  cachedUserId = user.id;
  return cachedUserId;
}
