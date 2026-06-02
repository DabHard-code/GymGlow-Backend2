import { useEffect, useMemo, useState } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EmptyState } from '@/components/empty-state';
import { GlassCard } from '@/components/glass-card';
import { Screen } from '@/components/screen';
import { SectionTitle } from '@/components/section-title';
import { apiFetch } from '@/lib/api';
import type { Athlete, BadgeCatalogItem, BadgeProgressState, BadgeTier, SportProfile } from '@/lib/types';
import { colors } from '@/theme/colors';

const tierOrder: BadgeTier[] = ['common', 'rare', 'epic', 'legendary', 'crimson'];

const tierLabel: Record<BadgeTier, string> = {
  common: 'Common',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
  crimson: 'Crimson',
};

const tierColor: Record<BadgeTier, string> = {
  common: '#94A3B8',
  rare: '#22D3EE',
  epic: '#EC4899',
  legendary: '#FBBF24',
  crimson: '#FB7185',
};

function keyFor(value?: string | null) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function isEarned(badge: BadgeCatalogItem, earnedIds: Set<string>) {
  return [badge.id, badge.shortName, badge.name].some((value) => earnedIds.has(keyFor(value)));
}

export default function BadgesTab() {
  const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

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

  const profileOptions = useMemo(
    () =>
      (athletesQuery.data ?? []).flatMap((athlete, index) =>
        (profileQueries[index]?.data ?? []).map((profile) => ({
          athlete,
          profile,
        })),
      ),
    [athletesQuery.data, profileQueries],
  );

  useEffect(() => {
    if (!selectedAthleteId && profileOptions[0]) {
      setSelectedAthleteId(profileOptions[0].athlete.id);
      setSelectedProfileId(profileOptions[0].profile.id);
    }
  }, [profileOptions, selectedAthleteId]);

  const selected = profileOptions.find((item) => item.profile.id === selectedProfileId) ?? profileOptions[0] ?? null;
  const selectedAthlete = selected?.athlete ?? null;
  const selectedProfile = selected?.profile ?? null;

  const catalogQuery = useQuery({
    queryKey: ['badge-catalog', selectedProfile?.sport, selectedProfile?.level],
    enabled: !!selectedProfile,
    queryFn: () => {
      const qs = new URLSearchParams();
      qs.set('sport', selectedProfile!.sport);
      qs.set('level', selectedProfile!.level);
      return apiFetch<BadgeCatalogItem[]>(`/api/badges?${qs.toString()}`);
    },
  });

  const progressQuery = useQuery({
    queryKey: ['badge-progress', selectedAthlete?.id, selectedProfile?.sport, selectedProfile?.level],
    enabled: !!selectedAthlete && !!selectedProfile,
    queryFn: () => {
      const qs = new URLSearchParams();
      qs.set('sport', selectedProfile!.sport);
      qs.set('level', selectedProfile!.level);
      return apiFetch<BadgeProgressState>(`/api/athletes/${selectedAthlete!.id}/badge-progress?${qs.toString()}`);
    },
  });

  const earnedIds = useMemo(() => new Set((progressQuery.data?.earnedBadgeIds ?? []).map(keyFor)), [progressQuery.data?.earnedBadgeIds]);
  const catalog = useMemo(() => catalogQuery.data ?? [], [catalogQuery.data]);
  const grouped = useMemo(() => {
    const groups: Record<BadgeTier, BadgeCatalogItem[]> = {
      common: [],
      rare: [],
      epic: [],
      legendary: [],
      crimson: [],
    };

    for (const badge of catalog) groups[badge.tier ?? 'common'].push(badge);
    for (const tier of tierOrder) groups[tier].sort((a, b) => a.name.localeCompare(b.name));
    return groups;
  }, [catalog]);

  const totalEarned = catalog.filter((badge) => isEarned(badge, earnedIds)).length;
  const loading = athletesQuery.isLoading || catalogQuery.isLoading || progressQuery.isLoading;

  return (
    <Screen>
      <SectionTitle title="Badges" subtitle="Milestones earned from uploads, challenge work, and consistent progress." />

      <GlassCard style={styles.heroCard}>
        <View style={styles.heroIcon}>
          <Ionicons name="ribbon" size={28} color={colors.text} />
        </View>
        <Text style={styles.heroTitle}>{selectedAthlete ? `${selectedAthlete.name}'s badges` : 'Badge collection'}</Text>
        <Text style={styles.heroCopy}>Badges are milestones, not levels. Earn them by uploading practice clips and completing challenges.</Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryValue}>{totalEarned}</Text>
            <Text style={styles.summaryLabel}>Earned</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryValue}>{catalog.length}</Text>
            <Text style={styles.summaryLabel}>Available</Text>
          </View>
        </View>
      </GlassCard>

      {athletesQuery.isLoading ? (
        <GlassCard style={styles.loadingCard}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.muted}>Loading badges...</Text>
        </GlassCard>
      ) : null}

      {!athletesQuery.isLoading && !profileOptions.length ? (
        <EmptyState
          icon="ribbon"
          title="No badge profile yet"
          description="Add an athlete and gymnastics profile first. Badges will appear here after uploads and challenges."
        />
      ) : null}

      {profileOptions.length ? (
        <GlassCard style={styles.card}>
          <Text style={styles.blockTitle}>Profile</Text>
          <View style={styles.profileStack}>
            {profileOptions.map(({ athlete, profile }) => {
              const active = profile.id === selectedProfileId;
              return (
                <Pressable
                  key={profile.id}
                  onPress={() => {
                    setSelectedAthleteId(athlete.id);
                    setSelectedProfileId(profile.id);
                  }}
                  style={[styles.profileRow, active && styles.profileRowActive]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.profileName}>{athlete.name}</Text>
                    <Text style={styles.profileMeta}>
                      {profile.sport} - {profile.level}
                    </Text>
                  </View>
                  <Ionicons name={active ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={active ? colors.primary : colors.textMuted} />
                </Pressable>
              );
            })}
          </View>
        </GlassCard>
      ) : null}

      {loading && profileOptions.length ? (
        <GlassCard style={styles.loadingCard}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.muted}>Loading badge collection...</Text>
        </GlassCard>
      ) : null}

      {!loading && catalog.length ? (
        <View>
          {tierOrder.map((tier) => {
            const badges = grouped[tier];
            if (!badges.length) return null;
            const earnedCount = badges.filter((badge) => isEarned(badge, earnedIds)).length;

            return (
              <View key={tier} style={styles.tierSection}>
                <View style={styles.tierHeader}>
                  <Text style={styles.tierTitle}>{tierLabel[tier]}</Text>
                  <Text style={styles.tierCount}>
                    {earnedCount}/{badges.length} earned
                  </Text>
                </View>
                <View style={styles.badgeGrid}>
                  {badges.map((badge) => (
                    <BadgeCard key={badge.id} badge={badge} earned={isEarned(badge, earnedIds)} />
                  ))}
                </View>
              </View>
            );
          })}
        </View>
      ) : null}
    </Screen>
  );
}

function BadgeCard({ badge, earned }: { badge: BadgeCatalogItem; earned: boolean }) {
  const tint = tierColor[badge.tier] ?? colors.secondary;

  return (
    <GlassCard style={[styles.badgeCard, !earned && styles.badgeLocked]}>
      <View style={[styles.badgeIcon, { backgroundColor: `${tint}26`, borderColor: `${tint}66` }]}>
        <Ionicons name={earned ? 'ribbon' : 'lock-closed'} size={22} color={earned ? tint : colors.textMuted} />
      </View>
      <View style={styles.badgeBody}>
        <View style={styles.badgeTitleRow}>
          <Text style={styles.badgeName}>{badge.name}</Text>
          <Text style={[styles.badgeState, earned && { color: colors.success }]}>{earned ? 'Earned' : badge.tier === 'crimson' ? 'Comp' : 'Locked'}</Text>
        </View>
        <Text style={styles.badgeDescription}>{badge.description || 'Keep training to unlock this milestone.'}</Text>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  heroCard: { marginBottom: 16 },
  heroIcon: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: 'rgba(236,72,153,0.22)',
    borderWidth: 1,
    borderColor: colors.white16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  heroTitle: { color: colors.text, fontSize: 26, fontWeight: '900', marginBottom: 8 },
  heroCopy: { color: colors.textMuted, lineHeight: 22 },
  summaryRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  summaryBox: { flex: 1, borderRadius: 16, backgroundColor: colors.white10, padding: 13, borderWidth: 1, borderColor: colors.border },
  summaryValue: { color: colors.text, fontSize: 24, fontWeight: '900' },
  summaryLabel: { color: colors.textMuted, marginTop: 3, fontSize: 12 },
  card: { marginBottom: 16 },
  blockTitle: { color: colors.text, fontSize: 18, fontWeight: '900', marginBottom: 12 },
  profileStack: { gap: 10 },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white10 },
  profileRowActive: { borderColor: 'rgba(236,72,153,0.72)', backgroundColor: 'rgba(236,72,153,0.16)' },
  profileName: { color: colors.text, fontSize: 16, fontWeight: '900' },
  profileMeta: { color: colors.textMuted, textTransform: 'capitalize', marginTop: 4 },
  loadingCard: { marginBottom: 16, gap: 10, alignItems: 'center' },
  muted: { color: colors.textMuted, lineHeight: 21 },
  tierSection: { marginBottom: 18 },
  tierHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10 },
  tierTitle: { color: colors.text, fontSize: 20, fontWeight: '900' },
  tierCount: { color: colors.textMuted, fontSize: 12, fontWeight: '800' },
  badgeGrid: { gap: 10 },
  badgeCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 0 },
  badgeLocked: { opacity: 0.72 },
  badgeIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeBody: { flex: 1 },
  badgeTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  badgeName: { color: colors.text, fontSize: 16, fontWeight: '900', flex: 1 },
  badgeState: { color: colors.textMuted, fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  badgeDescription: { color: colors.textMuted, lineHeight: 19, marginTop: 5 },
});
