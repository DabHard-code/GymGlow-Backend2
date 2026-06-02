import { useQueries, useQuery } from '@tanstack/react-query';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/screen';
import { GlassCard } from '@/components/glass-card';
import { SectionTitle } from '@/components/section-title';
import { AthleteRow } from '@/components/athlete-row';
import { PrimaryButton } from '@/components/primary-button';
import { EmptyState } from '@/components/empty-state';
import { useMe } from '@/hooks/use-me';
import { apiFetch } from '@/lib/api';
import { formatPlan } from '@/lib/format';
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
  const planLabel = formatPlan(me?.plan);
  const secondaryAction = athletes.length
    ? { label: 'Competition', route: '/(tabs)/competition' as const }
    : { label: 'Add athlete', route: '/(tabs)/athletes' as const };

  return (
    <Screen>
      <GlassCard style={styles.heroCard}>
        <SparkleField />
        <Image source={require('../../assets/gymglow-logo.png')} style={styles.logo} resizeMode="contain" />
        <Text style={styles.eyebrow}>GYMGLOW</Text>
        <Text style={styles.title}>Welcome back to GymGlow</Text>
        <Text style={styles.subtitle}>Upload a practice video, review AI coaching notes, and keep each athlete&apos;s progress moving.</Text>
      </GlassCard>

      <GlassCard style={styles.statsCard}>
        <View style={styles.heroRow}>
          <StatTile icon="people" value={athletes.length} label="Athletes" />
          <StatTile icon="sparkles" value={totalProfiles} label="Profiles" />
          <View style={[styles.heroStat, styles.planStat]}>
            <View style={styles.planIcon}>
              <Ionicons name="flash" size={18} color={colors.secondary} />
            </View>
            <View style={styles.planCopy}>
              <Text style={styles.statLabel}>Plan</Text>
              <Text style={styles.planValue} numberOfLines={1} adjustsFontSizeToFit>
                {planLabel}
              </Text>
            </View>
          </View>
        </View>
      </GlassCard>

      <GlassCard style={styles.actionsCard}>
        <Text style={styles.quickTitle}>Quick actions</Text>
        <View style={styles.quickActions}>
          <View style={styles.quickActionSlot}>
            <PrimaryButton label="Upload video" onPress={() => router.push('/(tabs)/upload')} />
          </View>
          <View style={styles.quickActionSlot}>
            <PrimaryButton label={secondaryAction.label} onPress={() => router.push(secondaryAction.route)} variant="secondary" />
          </View>
        </View>
      </GlassCard>

      <SectionTitle title="Your roster" subtitle="Tap an athlete to manage profiles and review recent analysis." />
      {athletes.map((athlete) => (
        <AthleteRow key={athlete.id} athlete={athlete} profiles={profilesByAthlete[athlete.id]} />
      ))}
      {!athletes.length ? (
        <EmptyState
          icon="person-add"
          title="Set up your first athlete"
          description="Add a private athlete profile, choose their sport level, then upload a short practice video for feedback."
          actionLabel="Add athlete"
          onAction={() => router.push('/(tabs)/athletes')}
        />
      ) : null}
    </Screen>
  );
}

function StatTile({ icon, value, label }: { icon: keyof typeof Ionicons.glyphMap; value: number; label: string }) {
  return (
    <View style={styles.heroStat}>
      <View style={styles.statIcon}>
        <Ionicons name={icon} size={17} color={colors.text} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function SparkleField() {
  return (
    <View pointerEvents="none" style={styles.sparkleField}>
      {sparkles.map((sparkle) => (
        <View
          key={`${sparkle.left}-${sparkle.top}`}
          style={[
            styles.sparkle,
            {
              left: `${sparkle.left}%`,
              top: sparkle.top,
              width: sparkle.size,
              height: sparkle.size,
              opacity: sparkle.opacity,
              borderRadius: sparkle.size / 2,
            },
          ]}
        />
      ))}
    </View>
  );
}

const sparkles = [
  { left: 18, top: 34, size: 2, opacity: 0.55 },
  { left: 27, top: 54, size: 3, opacity: 0.82 },
  { left: 38, top: 29, size: 1.5, opacity: 0.6 },
  { left: 61, top: 38, size: 2, opacity: 0.72 },
  { left: 76, top: 58, size: 3, opacity: 0.9 },
  { left: 84, top: 96, size: 2, opacity: 0.58 },
  { left: 22, top: 116, size: 2.5, opacity: 0.72 },
  { left: 34, top: 142, size: 1.5, opacity: 0.48 },
  { left: 68, top: 132, size: 2.5, opacity: 0.78 },
  { left: 79, top: 156, size: 1.5, opacity: 0.52 },
];

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  heroCard: { marginTop: 2, paddingTop: 22, paddingBottom: 22, overflow: 'hidden' },
  sparkleField: {
    ...StyleSheet.absoluteFillObject,
  },
  sparkle: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.95)',
    shadowColor: '#FFFFFF',
    shadowOpacity: 0.9,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 0 },
    zIndex: 1,
  },
  logo: { width: 236, height: 118, maxWidth: '100%', alignSelf: 'center', marginBottom: 6 },
  eyebrow: { color: colors.secondary, fontSize: 12, fontWeight: '900', letterSpacing: 1.2, textAlign: 'center' },
  title: { color: colors.text, fontSize: 27, fontWeight: '900', lineHeight: 32, marginTop: 7, textAlign: 'center' },
  subtitle: { color: colors.textMuted, marginTop: 8, lineHeight: 21, textAlign: 'center' },
  statsCard: { marginTop: 14 },
  actionsCard: { marginTop: 14 },
  quickTitle: { color: colors.text, fontSize: 18, fontWeight: '900', marginBottom: 14 },
  quickActions: { flexDirection: 'row', gap: 12 },
  quickActionSlot: { flex: 1 },
  heroRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  heroStat: {
    flexGrow: 1,
    flexBasis: '46%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 18,
    padding: 15,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    minHeight: 116,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.white10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 9,
  },
  planStat: {
    flexBasis: '100%',
    minHeight: 86,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    backgroundColor: 'rgba(34,211,238,0.09)',
    borderColor: 'rgba(34,211,238,0.22)',
  },
  planIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(34,211,238,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },
  planCopy: { flex: 1 },
  statValue: { color: colors.text, fontSize: 24, fontWeight: '900', lineHeight: 30, textAlign: 'center' },
  planValue: { color: colors.text, fontSize: 22, fontWeight: '900', lineHeight: 28 },
  statLabel: { color: colors.textMuted, marginTop: 4, textTransform: 'capitalize', fontSize: 12, fontWeight: '700' },
});
