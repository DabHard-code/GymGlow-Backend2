import { Alert, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
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

      <GlassCard style={styles.accountCard}>
        <View style={styles.accountIcon}>
          <Ionicons name="person" size={24} color={colors.text} />
        </View>
        <Text style={styles.accountTitle}>{me?.username ?? 'GymGlow account'}</Text>
        <Text style={styles.accountSubtitle}>Your private parent or coach workspace.</Text>
      </GlassCard>

      <GlassCard style={{ marginBottom: 16 }}>
        <View style={styles.row}>
          <Text style={styles.label}>Plan</Text>
          <Text style={styles.value}>{me?.plan ?? 'none'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Trial credits</Text>
          <Text style={styles.value}>{me?.trialCredits ?? 0}</Text>
        </View>
        <View style={styles.rowLast}>
          <Text style={styles.label}>Status</Text>
          <Text style={styles.value}>{me?.subscriptionStatus ?? 'active'}</Text>
        </View>
      </GlassCard>

      <PrimaryButton label="Log out" onPress={handleLogout} variant="ghost" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  accountCard: { marginBottom: 16, alignItems: 'center' },
  accountIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: 'rgba(34,211,238,0.14)',
    borderWidth: 1,
    borderColor: colors.white16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  accountTitle: { color: colors.text, fontSize: 22, fontWeight: '900', textAlign: 'center' },
  accountSubtitle: { color: colors.textMuted, marginTop: 6, textAlign: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  rowLast: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12 },
  label: { color: colors.textMuted },
  value: { color: colors.text, fontWeight: '900', textTransform: 'capitalize' },
});
