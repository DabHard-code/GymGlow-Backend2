import { useState } from 'react';
import { Link, router } from 'expo-router';
import { Alert, StyleSheet, Text, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { GlassCard } from '@/components/glass-card';
import { PrimaryButton } from '@/components/primary-button';
import { colors } from '@/theme/colors';
import { signUpWithEmail } from '@/lib/auth';

export default function SignUpScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignUp() {
    try {
      setLoading(true);
      await signUpWithEmail(email.trim(), password);
      Alert.alert('Check your email', 'Confirm your GymGlow account from the email we sent, then log in.');
      router.replace('/(auth)/sign-in');
    } catch (error: any) {
      Alert.alert('Sign up failed', error?.message ?? 'Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <LinearGradient colors={[colors.background, '#111827', '#0F172A']} style={styles.container}>
      <GlassCard>
        <Text style={styles.formTitle}>Create your parent account</Text>
        <Text style={styles.formSubtitle}>Create a private workspace for athletes, uploads, and AI coaching notes.</Text>

        <TextInput
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="Email"
          placeholderTextColor={colors.textMuted}
          value={email}
          onChangeText={setEmail}
          style={styles.input}
        />
        <TextInput
          secureTextEntry
          placeholder="Password"
          placeholderTextColor={colors.textMuted}
          value={password}
          onChangeText={setPassword}
          style={styles.input}
        />

        <PrimaryButton label="Create account" onPress={handleSignUp} loading={loading} />

        <Link href="/(auth)/sign-in" asChild>
          <Text style={styles.link}>Already have an account? Log in</Text>
        </Link>
      </GlassCard>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center' },
  formTitle: { color: colors.text, fontSize: 24, fontWeight: '800' },
  formSubtitle: { color: colors.textMuted, marginTop: 6, marginBottom: 16, lineHeight: 20 },
  input: {
    backgroundColor: colors.backgroundAlt,
    color: colors.text,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  link: { color: colors.secondary, textAlign: 'center', marginTop: 16, fontWeight: '700' },
});
