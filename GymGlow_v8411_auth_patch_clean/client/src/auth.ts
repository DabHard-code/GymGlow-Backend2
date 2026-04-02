import { supabase } from "./supabase";

// Sign up a new parent
export async function signUpWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    console.error("Sign up error:", error.message);
    throw error;
  }

  return data;
}

// Log in an existing parent
export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error("Sign in error:", error.message);
    throw error;
  }

  return data;
}

// Get current logged-in user (if any)
export async function getCurrentUser() {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    console.error("Get session error:", error.message);
    throw error;
  }

  return session?.user ?? null;
}
