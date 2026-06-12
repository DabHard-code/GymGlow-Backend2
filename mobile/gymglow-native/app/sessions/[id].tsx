import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, router } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { AnalysisDetail } from '@/components/analysis-detail';
import { GlassCard } from '@/components/glass-card';
import { PrimaryButton } from '@/components/primary-button';
import { Screen } from '@/components/screen';
import { SectionTitle } from '@/components/section-title';
import { apiFetch } from '@/lib/api';
import type { Analysis, EarnedBadge, Session } from '@/lib/types';
import { colors } from '@/theme/colors';

async function fetchAnalysisOrNull(sessionId: string) {
  try {
    return await apiFetch<Analysis>(`/api/sessions/${sessionId}/analysis`);
  } catch (error: any) {
    if (String(error?.message ?? '').startsWith('404:')) return null;
    throw error;
  }
}

export default function SessionResultScreen() {
  const { id, athleteId } = useLocalSearchParams<{ id: string; athleteId?: string }>();
  const [tipIndex, setTipIndex] = useState(0);
  const sessionQuery = useQuery({
    queryKey: ['session', id],
    enabled: !!id,
    queryFn: () => apiFetch<Session>(`/api/sessions/${id}`),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'ready' || status === 'error' || status === 'failed' ? false : 2500;
    },
  });
  const analysisQuery = useQuery({
    queryKey: ['session-analysis', id],
    enabled: !!id && sessionQuery.data?.status !== 'error' && sessionQuery.data?.status !== 'failed',
    queryFn: () => fetchAnalysisOrNull(id),
    refetchInterval: (query) => (query.state.data ? false : 2500),
  });
  const analysis = analysisQuery.data;
  const badgesQuery = useQuery({
    queryKey: ['analysis-badges', analysis?.id],
    enabled: !!analysis?.id,
    queryFn: () => apiFetch<EarnedBadge[]>(`/api/analyses/${analysis!.id}/badges`),
  });

  const status = sessionQuery.data?.status ?? 'processing';
  const isWorking = status === 'uploading' || status === 'processing' || status === 'analyzing';
  const activeTip = analyzingTips[tipIndex % analyzingTips.length];

  useEffect(() => {
    if (!isWorking || analysis) return;
    const timer = setInterval(() => {
      setTipIndex((current) => current + 1);
    }, 4200);
    return () => clearInterval(timer);
  }, [analysis, isWorking]);

  return (
    <Screen>
      <SectionTitle
        title={analysis ? 'Analysis ready' : 'Analyzing video'}
        subtitle={analysis ? 'Here is the full GymGlow feedback from that upload.' : 'GymGlow is reviewing the clip. This screen updates automatically.'}
      />

      {!analysis ? (
        <GlassCard style={styles.statusCard}>
          <View style={styles.statusIcon}>
            {isWorking ? <ActivityIndicator color={colors.text} /> : <Ionicons name="alert-circle" size={26} color={colors.danger} />}
          </View>
          <Text style={styles.statusTitle}>{isWorking ? statusCopy(status) : 'Analysis did not finish'}</Text>
          <Text style={styles.statusCopy}>
            {isWorking
              ? 'You can stay here while it works. When feedback is ready, this page will switch into the full analysis automatically.'
              : sessionQuery.data?.errorMessage || 'The upload finished, but the analysis failed. Try another short, clear video.'}
          </Text>
          {isWorking ? (
            <>
              <View style={styles.progressTrack}>
                <StatusStep label="Upload" active={stepIndex(status) >= 0} complete={stepIndex(status) > 0} />
                <StatusStep label="Processing" active={stepIndex(status) >= 1} complete={stepIndex(status) > 1} />
                <StatusStep label="AI notes" active={stepIndex(status) >= 2} complete={false} />
              </View>
              <View style={styles.tipCard}>
                <View style={styles.tipIcon}>
                  <Ionicons name="bulb" size={18} color={colors.warning} />
                </View>
                <View style={styles.tipCopy}>
                  <Text style={styles.tipLabel}>While you wait</Text>
                  <Text style={styles.tipText}>{activeTip}</Text>
                </View>
              </View>
            </>
          ) : null}
          {athleteId ? <PrimaryButton label="Back to athlete" onPress={() => router.replace({ pathname: '/(tabs)/athletes/[id]', params: { id: athleteId } })} variant="secondary" /> : null}
        </GlassCard>
      ) : (
        <>
          <EarnedBadges badges={badgesQuery.data ?? []} loading={badgesQuery.isLoading} />
          <AnalysisDetail analysis={analysis} />
        </>
      )}
    </Screen>
  );
}

function EarnedBadges({ badges, loading }: { badges: EarnedBadge[]; loading: boolean }) {
  if (loading) {
    return (
      <GlassCard style={styles.badgesCard}>
        <View style={styles.badgesHeader}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.badgesTitle}>Checking badge awards...</Text>
        </View>
      </GlassCard>
    );
  }

  if (!badges.length) return null;

  return (
    <GlassCard style={styles.badgesCard}>
      <View style={styles.badgesHero}>
        <View style={styles.badgesIcon}>
          <Ionicons name="sparkles" size={26} color={colors.text} />
        </View>
        <View style={styles.badgesCopy}>
          <Text style={styles.badgesKicker}>Badge unlocked</Text>
          <Text style={styles.badgesTitle}>
            {badges.length === 1 ? 'New milestone earned!' : `${badges.length} new milestones earned!`}
          </Text>
        </View>
      </View>
      <View style={styles.badgeList}>
        {badges.map((badge) => (
          <View key={badge.id} style={styles.badgePill}>
            <Ionicons name="ribbon" size={17} color={colors.warning} />
            <Text style={styles.badgeName}>{formatBadgeName(badge.badgeType)}</Text>
          </View>
        ))}
      </View>
    </GlassCard>
  );
}

function formatBadgeName(value: string) {
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

function StatusStep({ label, active, complete }: { label: string; active: boolean; complete: boolean }) {
  return (
    <View style={styles.stepItem}>
      <View style={[styles.stepDot, active && styles.stepDotActive, complete && styles.stepDotComplete]}>
        {complete ? <Ionicons name="checkmark" size={12} color={colors.ink} /> : null}
      </View>
      <Text style={[styles.stepLabel, active && styles.stepLabelActive]}>{label}</Text>
    </View>
  );
}

function statusCopy(status: Session['status']) {
  if (status === 'analyzing') return 'AI feedback is being written';
  if (status === 'processing') return 'Video uploaded and processing';
  if (status === 'uploading') return 'Upload is finishing';
  return 'Analysis is running';
}

function stepIndex(status: Session['status']) {
  if (status === 'uploading') return 0;
  if (status === 'processing') return 1;
  if (status === 'analyzing') return 2;
  if (status === 'ready') return 3;
  return 0;
}

const analyzingTips = [
  'Clear side angles usually get the most useful technique feedback.',
  'Short clips work best when the whole skill stays in frame from start to finish.',
  'A quick warm-up clip can help compare control before and after fatigue.',
  'Look for one high-impact correction first, then stack smaller details after.',
  'If the athlete moves out of frame, try recording from farther back next time.',
];

const styles = StyleSheet.create({
  statusCard: { alignItems: 'stretch', gap: 14 },
  statusIcon: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: 'rgba(236,72,153,0.22)',
    borderWidth: 1,
    borderColor: colors.white16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusTitle: { color: colors.text, fontSize: 22, fontWeight: '900' },
  statusCopy: { color: colors.textMuted, lineHeight: 22 },
  badgesCard: {
    marginBottom: 16,
    borderColor: 'rgba(251,191,36,0.32)',
    backgroundColor: 'rgba(251,191,36,0.08)',
  },
  badgesHero: { flexDirection: 'row', alignItems: 'center', gap: 13, marginBottom: 14 },
  badgesHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  badgesIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: 'rgba(251,191,36,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.42)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgesCopy: { flex: 1 },
  badgesKicker: { color: colors.warning, fontSize: 12, fontWeight: '900', textTransform: 'uppercase', marginBottom: 4 },
  badgesTitle: { color: colors.text, fontSize: 20, fontWeight: '900', lineHeight: 25 },
  badgeList: { gap: 9 },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.09)',
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.2)',
  },
  badgeName: { color: colors.text, fontWeight: '900', flex: 1 },
  progressTrack: { flexDirection: 'row', gap: 8, marginTop: 2 },
  stepItem: {
    flex: 1,
    padding: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white10,
    alignItems: 'center',
    gap: 7,
  },
  stepDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: colors.white24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: { borderColor: colors.secondary, backgroundColor: 'rgba(34,211,238,0.2)' },
  stepDotComplete: { borderColor: colors.success, backgroundColor: colors.success },
  stepLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '800', textAlign: 'center' },
  stepLabelActive: { color: colors.text },
  tipCard: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.22)',
    backgroundColor: 'rgba(251,191,36,0.08)',
  },
  tipIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(251,191,36,0.13)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipCopy: { flex: 1 },
  tipLabel: { color: colors.warning, fontSize: 12, fontWeight: '900', marginBottom: 4, textTransform: 'uppercase' },
  tipText: { color: colors.text, lineHeight: 21, fontWeight: '700' },
});
