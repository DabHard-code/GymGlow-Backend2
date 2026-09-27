import { useState } from 'react';
import { Link } from 'expo-router';
import { StyleSheet, Text, TextInput } from 'react-native';
import { Screen } from '@/components/screen';
import { GlassCard } from '@/components/glass-card';
import { PrimaryButton } from '@/components/primary-button';
import { supabase } from '@/lib/supabase';
import { authRedirectUrl } from '@/lib/deep-link-auth';
import { colors } from '@/theme/colors';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function send() {
    setBusy(true);
    setMessage('');
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${authRedirectUrl}?recovery=1` });
      if (error) throw error;
      setMessage('If an account exists for this email, you will receive a password reset link. Open it on this device.');
    } catch (error: any) { setMessage(error.message ?? 'Could not send the link. Please try again.'); }
    finally { setBusy(false); }
  }
  return <Screen><GlassCard>
    <Text style={styles.title}>Forgot password?</Text>
    <Text style={styles.copy}>Enter your account email to get a reset link.</Text>
    <TextInput accessibilityLabel="Email" autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email" value={email} onChangeText={setEmail} placeholder="Email" placeholderTextColor={colors.textMuted} style={styles.input} />
    <PrimaryButton label="Send reset link" onPress={send} loading={busy} disabled={!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || busy} />
    {message ? <Text accessibilityLiveRegion="polite" style={styles.copy}>{message}</Text> : null}
    <Link href="/(auth)/sign-in" style={styles.copy}>Back to log in</Link>
  </GlassCard></Screen>;
}

export const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: 26, fontWeight: '800' },
  copy: { color: colors.textMuted, marginVertical: 16, lineHeight: 22 },
  input: { color: colors.text, backgroundColor: colors.backgroundAlt, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: colors.border },
});
