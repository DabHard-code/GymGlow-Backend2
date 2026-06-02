import { useEffect, useMemo, useState } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Screen } from '@/components/screen';
import { GlassCard } from '@/components/glass-card';
import { SectionTitle } from '@/components/section-title';
import { PlanPickerModal } from '@/components/plan-picker-modal';
import { apiFetch } from '@/lib/api';
import { useMe } from '@/hooks/use-me';
import type { Athlete, Challenge, CompetitionResults, CompetitionStatus, SportProfile, WeeklyLeaderboard } from '@/lib/types';
import { colors } from '@/theme/colors';

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(date.getDate() + days);
  return next;
}

function fmtRange(start?: string | Date, end?: string | Date) {
  if (!start || !end) return 'Loading dates';
  const a = new Date(start);
  const b = new Date(end);
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  return `${a.toLocaleDateString(undefined, opts)} - ${b.toLocaleDateString(undefined, opts)}`;
}

function nextCycleWeek(currentWeek: number, offset: number) {
  return ((currentWeek - 1 + offset) % 6) + 1;
}

export default function CompetitionTab() {
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [planPickerOpen, setPlanPickerOpen] = useState(false);
  const { data: me } = useMe();
  const hasCompetition = me?.plan === 'competition';
  const athletesQuery = useQuery({ queryKey: ['athletes'], queryFn: () => apiFetch<Athlete[]>('/api/athletes') });
  const challengesQuery = useQuery({ queryKey: ['active-challenges'], queryFn: () => apiFetch<Challenge[]>('/api/challenges?active=true') });

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
    if (!selectedProfileId && profileOptions[0]) setSelectedProfileId(profileOptions[0].profile.id);
  }, [profileOptions, selectedProfileId]);

  const selected = profileOptions.find((item) => item.profile.id === selectedProfileId) ?? null;
  const statusQuery = useQuery({
    queryKey: ['competition-status', selectedProfileId],
    enabled: !!selectedProfileId,
    queryFn: () => apiFetch<CompetitionStatus>(`/api/competition/status?profileId=${selectedProfileId}`),
    staleTime: 5 * 60 * 1000,
  });
  const resultsQuery = useQuery({
    queryKey: ['competition-results', selectedProfileId, selected?.athlete.id],
    enabled: !!selectedProfileId && !!selected?.athlete.id,
    queryFn: () => apiFetch<CompetitionResults>(`/api/competition/results?profileId=${selectedProfileId}&viewerAthleteId=${selected?.athlete.id}`),
  });
  const leaderboardQuery = useQuery({
    queryKey: ['weekly-leaderboard', selectedProfileId],
    enabled: !!selectedProfileId,
    queryFn: () => apiFetch<WeeklyLeaderboard>(`/api/leaderboard/weekly?profileId=${selectedProfileId}`),
  });

  const weeks = useMemo(() => {
    const status = statusQuery.data;
    if (!status?.weekStart || !status.weekInCycle) return [];
    const start = new Date(status.weekStart);
    if (Number.isNaN(start.getTime())) return [];

    return Array.from({ length: 6 }, (_, offset) => {
      const weekStart = addDays(start, offset * 7);
      const weekEnd = addDays(weekStart, 6);
      const cycleWeek = nextCycleWeek(status.weekInCycle, offset);
      return {
        weekStart,
        weekEnd,
        cycleWeek,
        isCurrent: offset === 0,
        isCompWeek: cycleWeek === 3 || cycleWeek === 6,
      };
    });
  }, [statusQuery.data]);

  return (
    <Screen>
      <SectionTitle title="Competition" subtitle="Shared Comp Week calendar, weekly challenges, and safe public results." />

      <GlassCard style={styles.heroCard}>
        <View style={styles.heroIcon}>
          <Ionicons name={statusQuery.data?.isCompWeek ? 'trophy' : 'calendar'} size={26} color={colors.text} />
        </View>
        <Text style={styles.heroTitle}>{statusQuery.data?.isCompWeek ? 'Comp Week is live' : `Week ${statusQuery.data?.weekInCycle ?? '-'} of 6`}</Text>
        <Text style={styles.heroCopy}>
          {statusQuery.data?.isCompWeek
            ? `Eligible uploads and challenge submissions can earn Crimson badges through ${fmtRange(statusQuery.data.weekStart, statusQuery.data.weekEnd)}.`
            : 'Practice weeks build consistency. Weeks 3 and 6 are Comp Weeks for Crimson badges and results.'}
        </Text>
      </GlassCard>

      {!hasCompetition ? (
        <GlassCard style={styles.upgradeCard}>
          <View style={styles.upgradeIcon}>
            <Ionicons name="lock-closed" size={22} color={colors.text} />
          </View>
          <Text style={styles.upgradeTitle}>Competition Mode required</Text>
          <Text style={styles.muted}>
            Coach Mode keeps AI analysis, athlete progress, meet score tracking, and badges. Competition Mode adds weekly challenges, leaderboard competition, spotlight eligibility, and Crimson badges.
          </Text>
          <View style={styles.upgradeButton}>
            <Pressable onPress={() => setPlanPickerOpen(true)} style={({ pressed }) => [styles.upgradePressable, pressed && styles.pressed]}>
              <Text style={styles.upgradeButtonText}>Choose Competition Mode</Text>
              <Ionicons name="arrow-forward" size={18} color={colors.text} />
            </Pressable>
          </View>
        </GlassCard>
      ) : null}

      <GlassCard style={styles.card}>
        <Text style={styles.blockTitle}>Profile</Text>
        {athletesQuery.isLoading ? <LoadingLine label="Loading profiles..." /> : null}
        {!athletesQuery.isLoading && !profileOptions.length ? (
          <Text style={styles.muted}>Create an athlete and sport profile first, then the shared calendar will show here.</Text>
        ) : null}
        <View style={styles.profileGrid}>
          {profileOptions.map(({ athlete, profile }) => {
            const active = profile.id === selectedProfileId;
            return (
              <Pressable key={profile.id} onPress={() => setSelectedProfileId(profile.id)} style={[styles.profilePill, active && styles.profilePillActive]}>
                <Text style={styles.profileName}>{athlete.name}</Text>
                <Text style={styles.profileMeta}>
                  {profile.sport} - {profile.level}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </GlassCard>

      <SectionTitle title="Comp Week calendar" subtitle="Every profile follows the same GymGlow 6-week cycle." />
      <GlassCard style={styles.card}>
        {statusQuery.isLoading ? <LoadingLine label="Loading calendar..." /> : null}
        <View style={styles.weekGrid}>
          {weeks.map((week) => (
            <View key={`${week.cycleWeek}-${week.weekStart.toISOString()}`} style={[styles.weekCard, week.isCurrent && styles.currentWeek, week.isCompWeek && styles.compWeek]}>
              <View style={styles.weekHead}>
                <Text style={styles.weekTitle}>Week {week.cycleWeek}</Text>
                <View style={[styles.tag, week.isCompWeek ? styles.compTag : styles.trainTag]}>
                  <Text style={styles.tagText}>{week.isCompWeek ? 'Comp' : 'Train'}</Text>
                </View>
              </View>
              <Text style={styles.weekRange}>{fmtRange(week.weekStart, week.weekEnd)}</Text>
              <Text style={styles.weekCopy}>{week.isCurrent ? 'Current week' : week.isCompWeek ? 'Crimson badge week' : 'Practice week'}</Text>
            </View>
          ))}
        </View>
      </GlassCard>

      <SectionTitle title="Weekly challenges" subtitle="This week's active gymnastics challenge set." />
      <GlassCard style={styles.card}>
        {challengesQuery.isLoading ? <LoadingLine label="Loading challenges..." /> : null}
        {(challengesQuery.data ?? []).map((challenge) => (
          <Pressable
            key={challenge.id}
            onPress={() => (hasCompetition ? router.push({ pathname: '/challenges/[id]', params: { id: challenge.id } }) : setPlanPickerOpen(true))}
            style={({ pressed }) => [styles.challengeRow, pressed && styles.pressed]}
          >
            <View style={styles.challengeIcon}>
              <Ionicons name={hasCompetition ? 'flash' : 'lock-closed'} size={18} color={colors.text} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.challengeTitle}>{challenge.name}</Text>
              <Text style={styles.muted}>
                {hasCompetition ? challenge.description || challenge.instructions || 'Upload the matching skill during the challenge window.' : 'Upgrade to Competition Mode to submit weekly challenges.'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </Pressable>
        ))}
        {!challengesQuery.isLoading && !challengesQuery.data?.length ? <Text style={styles.muted}>No active challenges right now.</Text> : null}
      </GlassCard>

      <SectionTitle title="Results" subtitle="Safe aliases only. Private athlete names stay inside your account." />
      <GlassCard style={styles.card}>
        {resultsQuery.isLoading ? <LoadingLine label="Loading results..." /> : null}
        {resultsQuery.data ? <ResultsBlock results={resultsQuery.data} /> : null}
      </GlassCard>

      <SectionTitle title="Weekly leaderboard" subtitle="Public aliases only. Private names never show here." />
      <GlassCard style={styles.card}>
        {leaderboardQuery.isLoading ? <LoadingLine label="Loading leaderboard..." /> : null}
        {leaderboardQuery.data ? <LeaderboardBlock leaderboard={leaderboardQuery.data} /> : null}
      </GlassCard>

      <PlanPickerModal
        visible={planPickerOpen}
        onClose={() => setPlanPickerOpen(false)}
        message="Weekly challenges and leaderboard competition require Competition Mode. Coach Mode stays focused on AI analysis, athlete progress, meet score tracking, and badges."
      />
    </Screen>
  );
}

function ResultsBlock({ results }: { results: CompetitionResults }) {
  return (
    <View>
      <Text style={styles.resultsTitle}>Last week - {fmtRange(results.weekStart, results.weekEnd)}</Text>
      <Text style={styles.muted}>{results.coachRecap || results.message}</Text>
      {results.isCompWeek ? (
        <View style={styles.resultsGrid}>
          <View style={styles.resultBox}>
            <Text style={styles.resultValue}>{results.your?.rank ? `#${results.your.rank}` : '-'}</Text>
            <Text style={styles.resultLabel}>Your rank</Text>
          </View>
          <View style={styles.resultBox}>
            <Text style={styles.resultValue}>{results.your?.avgTop2 ?? '-'}</Text>
            <Text style={styles.resultLabel}>Top 2 avg</Text>
          </View>
        </View>
      ) : null}
      {results.isCompWeek && results.top10?.length ? (
        <View style={styles.topList}>
          {results.top10.slice(0, 5).map((row) => (
            <View key={row.rank} style={styles.topRow}>
              <Text style={styles.rank}>#{row.rank}</Text>
              <Text style={styles.topName}>{row.displayName}</Text>
              <Text style={styles.topScore}>{row.avgTop2}</Text>
            </View>
          ))}
        </View>
      ) : null}
      {!results.isCompWeek ? <Text style={styles.trainingNote}>{results.message}</Text> : null}
    </View>
  );
}

function LeaderboardBlock({ leaderboard }: { leaderboard: WeeklyLeaderboard }) {
  const rows = leaderboard.locked
    ? leaderboard.preview.map((row) => ({ ...row, points: null, challengesCompleted: null, isViewer: false }))
    : leaderboard.entries;

  return (
    <View>
      <Text style={styles.resultsTitle}>This week - {fmtRange(leaderboard.weekStart, leaderboard.weekEnd)}</Text>
      {leaderboard.locked ? <Text style={styles.muted}>Competition Mode unlocks full points, challenge counts, and your rank.</Text> : null}
      <View style={styles.topList}>
        {rows.slice(0, 10).map((row) => (
          <View key={`${row.rank}-${row.displayName}`} style={[styles.topRow, 'isViewer' in row && row.isViewer && styles.viewerRow]}>
            <Text style={styles.rank}>#{row.rank}</Text>
            <Text style={styles.topName}>{row.displayName}</Text>
            <Text style={styles.topScore}>{row.points == null ? '' : `${row.points} pts`}</Text>
          </View>
        ))}
      </View>
      {!rows.length ? <Text style={styles.trainingNote}>No leaderboard points yet this week.</Text> : null}
    </View>
  );
}

function LoadingLine({ label }: { label: string }) {
  return (
    <View style={styles.loadingLine}>
      <ActivityIndicator color={colors.primary} />
      <Text style={styles.muted}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  heroCard: { marginBottom: 16 },
  heroIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: 'rgba(236,72,153,0.22)',
    borderWidth: 1,
    borderColor: colors.white16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  heroTitle: { color: colors.text, fontSize: 26, fontWeight: '900', marginBottom: 8 },
  heroCopy: { color: colors.textMuted, lineHeight: 22 },
  card: { marginBottom: 16 },
  upgradeCard: { marginBottom: 16, borderColor: 'rgba(251,191,36,0.28)', backgroundColor: 'rgba(251,191,36,0.08)' },
  upgradeIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(251,191,36,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  upgradeTitle: { color: colors.text, fontSize: 20, fontWeight: '900', marginBottom: 8 },
  upgradeButton: { marginTop: 14 },
  upgradePressable: {
    minHeight: 50,
    borderRadius: 18,
    backgroundColor: 'rgba(236,72,153,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(236,72,153,0.4)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
  upgradeButtonText: { color: colors.text, fontWeight: '900' },
  blockTitle: { color: colors.text, fontSize: 18, fontWeight: '900', marginBottom: 12 },
  muted: { color: colors.textMuted, lineHeight: 21 },
  profileGrid: { gap: 10 },
  profilePill: {
    padding: 13,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white10,
  },
  profilePillActive: { borderColor: 'rgba(236,72,153,0.72)', backgroundColor: 'rgba(236,72,153,0.16)' },
  profileName: { color: colors.text, fontWeight: '900', fontSize: 16 },
  profileMeta: { color: colors.textMuted, textTransform: 'capitalize', marginTop: 4 },
  weekGrid: { gap: 10 },
  weekCard: { padding: 13, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white10 },
  currentWeek: { borderColor: 'rgba(236,72,153,0.72)' },
  compWeek: { backgroundColor: 'rgba(251,113,133,0.11)' },
  weekHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  weekTitle: { color: colors.text, fontWeight: '900', fontSize: 16 },
  weekRange: { color: colors.textMuted, marginTop: 8 },
  weekCopy: { color: colors.textMuted, marginTop: 8, fontSize: 12 },
  tag: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  compTag: { backgroundColor: 'rgba(251,113,133,0.22)' },
  trainTag: { backgroundColor: 'rgba(34,211,238,0.16)' },
  tagText: { color: colors.text, fontWeight: '900', fontSize: 11 },
  challengeRow: { flexDirection: 'row', gap: 12, paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  challengeIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(34,211,238,0.16)', alignItems: 'center', justifyContent: 'center' },
  challengeTitle: { color: colors.text, fontSize: 16, fontWeight: '900', marginBottom: 4 },
  resultsTitle: { color: colors.text, fontSize: 17, fontWeight: '900', marginBottom: 8 },
  resultsGrid: { flexDirection: 'row', gap: 10, marginTop: 14 },
  resultBox: { flex: 1, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white10 },
  resultValue: { color: colors.text, fontSize: 24, fontWeight: '900' },
  resultLabel: { color: colors.textMuted, marginTop: 4, fontSize: 12 },
  topList: { marginTop: 14, gap: 8 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 14, backgroundColor: colors.white10 },
  viewerRow: { borderWidth: 1, borderColor: 'rgba(236,72,153,0.72)' },
  rank: { color: colors.secondary, fontWeight: '900', width: 38 },
  topName: { color: colors.text, fontWeight: '800', flex: 1 },
  topScore: { color: colors.text, fontWeight: '900' },
  trainingNote: { color: colors.textMuted, marginTop: 12, lineHeight: 21 },
  loadingLine: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pressed: { opacity: 0.74 },
});
