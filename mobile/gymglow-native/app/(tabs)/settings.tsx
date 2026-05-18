import { Alert, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/components/screen';
import { GlassCard } from '@/components/glass-card';
import { PrimaryButton } from '@/components/primary-button';
import { SectionTitle } from '@/components/section-title';
import { useMe } from '@/hooks/use-me';
import { signOut } from '@/lib/auth';
import { colors } from '@/theme/colors';

export default function SettingsTab() {
  const { data: me } = useMe();

  async function handleLogout() {
    try {
      await signOut();
      router.replace('/(auth)/sign-in');
    } catch (error: any) {
      Alert.alert('Logout failed', error?.message ?? 'Please try again.');
    }
  }

  return (
    <Screen>
      <SectionTitle title="Settings" subtitle="Account details, plan status, and session controls." />
      <GlassCard style={{ marginBottom: 16 }}>
        <View style={styles.row}>
          <Text style={styles.label}>Username</Text>
          <Text style={styles.value}>{me?.username ?? '—'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Plan</Text>
          <Text style={styles.value}>{me?.plan ?? 'none'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Trial credits</Text>
          <Text style={styles.value}>{me?.trialCredits ?? 0}</Text>
        </View>
      </GlassCard>
      <PrimaryButton label="Log out" onPress={handleLogout} variant="ghost" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  label: { color: colors.textMuted },
  value: { color: colors.text, fontWeight: '800', textTransform: 'capitalize' },
});
