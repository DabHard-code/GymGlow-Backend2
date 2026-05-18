import { useQueries, useQuery } from '@tanstack/react-query';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/components/screen';
import { GlassCard } from '@/components/glass-card';
import { SectionTitle } from '@/components/section-title';
import { AthleteRow } from '@/components/athlete-row';
import { PrimaryButton } from '@/components/primary-button';
import { useMe } from '@/hooks/use-me';
import { apiFetch } from '@/lib/api';
import type { Athlete, SportProfile } from '@/lib/types';
import { colors } from '@/theme/colors';

export default function HomeTab() {
  const { data: me } = useMe();
  const athletesQuery = useQuery({
    queryKey: ['athletes'],
    queryFn: () => apiFetch<Athlete[]>('/api/athletes'),
  });

  const profileQueries = useQueries({
    queries: (athletesQuery.data ?? []).map((athlete) => ({
      queryKey: ['profiles', athlete.id],
      queryFn: () => apiFetch<SportProfile[]>(`/api/athletes/${athlete.id}/profiles`),
    })),
  });

  const profilesByAthlete = Object.fromEntries(
    (athletesQuery.data ?? []).map((athlete, index) => [athlete.id, profileQueries[index]?.data ?? []]),
  );

  if (athletesQuery.isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.secondary} />
      </View>
    );
  }

  const athletes = athletesQuery.data ?? [];
  const totalProfiles = Object.values(profilesByAthlete).reduce((sum, item) => sum + item.length, 0);

  return (
    <Screen>
      <GlassCard style={styles.heroCard}>
        <Image source={require('../../assets/gymglow-logo.png')} style={styles.logo} resizeMode="contain" />
        <Text style={styles.eyebrow}>GYMGLOW</Text>
        <Text style={styles.title}>Hi {me?.username ?? 'Coach'}, ready for a cleaner next rep?</Text>
        <Text style={styles.subtitle}>Private athlete profiles, AI practice feedback, and progress tracking in one place.</Text>
      </GlassCard>

      <GlassCard style={styles.statsCard}>
        <View style={styles.heroRow}>
          <View style={styles.heroStat}>
            <Text style={styles.statValue}>{athletes.length}</Text>
            <Text style={styles.statLabel}>Athletes</Text>
          </View>
          <View style={styles.heroStat}>
            <Text style={styles.statValue}>{totalProfiles}</Text>
            <Text style={styles.statLabel}>Profiles</Text>
          </View>
          <View style={styles.heroStat}>
            <Text style={styles.statValue}>{me?.plan ?? 'none'}</Text>
            <Text style={styles.statLabel}>Plan</Text>
          </View>
        </View>
      </GlassCard>

      <GlassCard style={styles.actionsCard}>
        <Text style={styles.quickTitle}>Quick actions</Text>
        <View style={styles.quickActions}>
          <View style={{ flex: 1 }}>
            <PrimaryButton label="Upload video" onPress={() => router.push('/(tabs)/upload')} />
          </View>
          <View style={{ flex: 1 }}>
            <PrimaryButton label="Athletes" onPress={() => router.push('/(tabs)/athletes')} variant="secondary" />
          </View>
        </View>
      </GlassCard>

      <SectionTitle title="Your roster" subtitle="Tap an athlete to manage profiles and review recent analysis." />
      {athletes.map((athlete) => (
        <AthleteRow key={athlete.id} athlete={athlete} profiles={profilesByAthlete[athlete.id]} />
      ))}
      {!athletes.length ? (
        <GlassCard>
          <Text style={styles.emptyTitle}>No athletes yet</Text>
          <Text style={styles.emptyCopy}>Open Athletes to add your first athlete and sport profile.</Text>
        </GlassCard>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  heroCard: { marginTop: 2 },
  logo: { width: 190, height: 96, alignSelf: 'center', marginBottom: 6 },
  eyebrow: { color: colors.secondary, fontSize: 12, fontWeight: '900', letterSpacing: 1.2, textAlign: 'center' },
  title: { color: colors.text, fontSize: 29, fontWeight: '900', lineHeight: 35, marginTop: 8, textAlign: 'center' },
  subtitle: { color: colors.textMuted, marginTop: 10, lineHeight: 22, textAlign: 'center' },
  statsCard: { marginTop: 16 },
  actionsCard: { marginTop: 16 },
  quickTitle: { color: colors.text, fontSize: 18, fontWeight: '900', marginBottom: 14 },
  quickActions: { flexDirection: 'row', gap: 12 },
  heroRow: { flexDirection: 'row', gap: 12 },
  heroStat: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: { color: colors.text, fontSize: 22, fontWeight: '900' },
  statLabel: { color: colors.textMuted, marginTop: 4, textTransform: 'capitalize', fontSize: 12 },
  emptyTitle: { color: colors.text, fontSize: 16, fontWeight: '900', marginBottom: 6 },
  emptyCopy: { color: colors.textMuted, lineHeight: 20 },
});
