import { useState } from 'react';
import { Link, router } from 'expo-router';
import { Alert, Image, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { GlassCard } from '@/components/glass-card';
import { PrimaryButton } from '@/components/primary-button';
import { colors } from '@/theme/colors';
import { signInWithEmail } from '@/lib/auth';

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignIn() {
    try {
      setLoading(true);
      await signInWithEmail(email.trim(), password);
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Sign in failed', error?.message ?? 'Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <LinearGradient colors={[colors.background, '#111827', '#0F172A']} style={styles.container}>
      <View style={styles.hero}>
        <Image source={require('../../assets/gymglow-logo.png')} style={styles.logo} resizeMode="contain" />
        <Text style={styles.kicker}>GYMGLOW NATIVE</Text>
        <Text style={styles.title}>A cleaner mobile experience for parents, athletes, and progress tracking.</Text>
        <Text style={styles.copy}>This native shell talks to your existing backend and Supabase auth.</Text>
      </View>

      <GlassCard>
        <Text style={styles.formTitle}>Welcome back</Text>
        <Text style={styles.formSubtitle}>Log in with the same account you already use on the web app.</Text>

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

        <PrimaryButton label="Log in" onPress={handleSignIn} loading={loading} />

        <Link href="/(auth)/sign-up" asChild>
          <Text style={styles.link}>Need an account? Create one</Text>
        </Link>
      </GlassCard>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center', gap: 20 },
  hero: { marginBottom: 8 },
  logo: { width: 190, height: 108, alignSelf: 'center', marginBottom: 16 },
  kicker: { color: colors.secondary, fontWeight: '800', letterSpacing: 1.4, fontSize: 12, marginBottom: 10 },
  title: { color: colors.text, fontSize: 30, fontWeight: '900', lineHeight: 36 },
  copy: { color: colors.textMuted, marginTop: 10, lineHeight: 22 },
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
