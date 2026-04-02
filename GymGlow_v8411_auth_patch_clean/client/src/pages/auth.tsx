import { FormEvent, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { signInWithEmail, signUpWithEmail, getCurrentUser } from "@/auth";

type Mode = "login" | "signup";

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [, navigate] = useLocation();

  // If already logged in, send to home
  useEffect(() => {
    (async () => {
      const user = await getCurrentUser();
      if (user) {
        navigate("/");
      }
    })();
  }, [navigate]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (mode === "signup") {
        await signUpWithEmail(email, password);
        setSuccessMsg("Check your email to confirm your account, then log in.");
        setMode("login");
      } else {
        await signInWithEmail(email, password);
        setSuccessMsg("Logged in! Redirecting…");
        setTimeout(() => navigate("/"), 800);
      }
    } catch (err: any) {
      setErrorMsg(err.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 px-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <h1 className="text-2xl font-bold mb-2 text-center">GymGlow</h1>
        <p className="text-sm text-slate-400 mb-6 text-center">
          {mode === "login"
            ? "Log in to see your gymnast’s progress."
            : "Create a parent account to start tracking scores and skills."}
        </p>

        <div className="flex justify-center gap-2 mb-4 text-xs">
          <button
            type="button"
            className={`px-3 py-1 rounded-full border ${
              mode === "login"
                ? "bg-sky-500 text-white border-sky-500"
                : "border-slate-600 text-slate-300"
            }`}
            onClick={() => setMode("login")}
          >
            Log in
          </button>
          <button
            type="button"
            className={`px-3 py-1 rounded-full border ${
              mode === "signup"
                ? "bg-sky-500 text-white border-sky-500"
                : "border-slate-600 text-slate-300"
            }`}
            onClick={() => setMode("signup")}
          >
            Sign up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-1">Email</label>
            <input
              type="email"
              required
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Password</label>
            <input
              type="password"
              required
              minLength={6}
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={
                mode === "signup" ? "new-password" : "current-password"
              }
            />
            <p className="text-xs text-slate-500 mt-1">
              Minimum 6 characters for now is fine.
            </p>
          </div>

          {errorMsg && (
            <p className="text-xs text-red-400 bg-red-950/40 border border-red-900 rounded-md px-3 py-2">
              {errorMsg}
            </p>
          )}

          {successMsg && (
            <p className="text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-900 rounded-md px-3 py-2">
              {successMsg}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 rounded-md bg-sky-500 hover:bg-sky-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium py-2 text-sm"
          >
            {loading
              ? "Please wait…"
              : mode === "login"
                ? "Log in"
                : "Create account"}
          </button>
        </form>
      </div>
    </div>
  );
}
