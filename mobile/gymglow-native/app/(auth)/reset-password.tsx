import { useState } from 'react';
import { Link, router } from 'expo-router';
import { Text, TextInput } from 'react-native';
import { Screen } from '@/components/screen';
import { GlassCard } from '@/components/glass-card';
import { PrimaryButton } from '@/components/primary-button';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/providers/session-provider';
import { colors } from '@/theme/colors';
import { styles } from './forgot-password';

export default function ResetPassword() {
  const { session, loading } = useSession();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function save() {
    if (password.length < 6 || password !== confirm) { setMessage('Use at least 6 characters and make sure both passwords match.'); return; }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      router.replace('/(tabs)');
    } catch (error: any) { setMessage(error.message ?? 'Could not update your password. Request a new link and try again.'); }
    finally { setBusy(false); }
  }
  return <Screen><GlassCard>
    <Text style={styles.title}>Choose a new password</Text>
    <Text style={styles.copy}>{loading ? 'Checking reset link…' : !session ? 'This reset link is invalid or expired. Request a new link below.' : 'Use at least 6 characters.'}</Text>
    {session && <>
      <TextInput accessibilityLabel="New password" secureTextEntry autoCapitalize="none" autoComplete="new-password" value={password} onChangeText={setPassword} placeholder="New password" placeholderTextColor={colors.textMuted} style={styles.input} />
      <TextInput accessibilityLabel="Confirm password" secureTextEntry autoCapitalize="none" autoComplete="new-password" value={confirm} onChangeText={setConfirm} placeholder="Confirm password" placeholderTextColor={colors.textMuted} style={styles.input} />
      <PrimaryButton label="Save new password" onPress={save} loading={busy} disabled={busy || loading} />
    </>}
    {message ? <Text style={styles.copy}>{message}</Text> : null}
    <Link href="/(auth)/forgot-password" style={styles.copy}>Request another reset link</Link>
  </GlassCard></Screen>;
}
