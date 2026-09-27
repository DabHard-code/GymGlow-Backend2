import { FormEvent, useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { supabase } from '@/supabase';

export default function PasswordRecoveryPage() {
  const [location, navigate] = useLocation();
  const resetting = location === '/reset-password';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    if (!resetting) return;
    supabase.auth.getSession().then(({ data, error }) => {
      setReady(!!data.session && !error);
      if (!data.session || error) setMessage('This link is invalid or expired. Request a new reset link.');
    });
  }, [resetting]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setMessage('');
    if (resetting && password !== confirm) { setMessage('Passwords must match.'); return; }
    setBusy(true);
    try {
      if (resetting) {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        navigate('/');
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` });
        if (error) throw error;
        setMessage('If an account exists for this email, you will receive a password reset link.');
      }
    } catch (error: any) { setMessage(error.message ?? 'Please try again.'); }
    finally { setBusy(false); }
  }
  const inputClass = 'w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-3 text-base';
  return <main className="min-h-dvh flex items-center justify-center bg-slate-950 text-slate-100 p-4">
    <form onSubmit={submit} className="w-full max-w-md space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <h1 className="text-2xl font-bold">{resetting ? 'Choose a new password' : 'Forgot password?'}</h1>
      {resetting ? <>
        <label className="block">New password<input className={inputClass} type="password" autoComplete="new-password" minLength={6} required value={password} onChange={e => setPassword(e.target.value)} /></label>
        <label className="block">Confirm password<input className={inputClass} type="password" autoComplete="new-password" minLength={6} required value={confirm} onChange={e => setConfirm(e.target.value)} /></label>
      </> : <label className="block">Account email<input className={inputClass} type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} /></label>}
      <p role="status">{message}</p>
      <button disabled={busy || (resetting && !ready)} className="w-full rounded-md bg-sky-500 p-3 font-medium disabled:opacity-50">{busy ? 'Please wait…' : resetting ? 'Save new password' : 'Send reset link'}</button>
      {resetting && <Link href="/forgot-password" className="block text-sky-400">Request another reset link</Link>}
      <Link href="/auth" className="block text-sky-400">Back to log in</Link>
    </form>
  </main>;
}
