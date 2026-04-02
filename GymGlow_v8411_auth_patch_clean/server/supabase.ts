import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Server-only client (bypasses RLS). NEVER use this on the client.
export const supabaseAdmin = createClient(url, serviceKey);
