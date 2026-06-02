import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { GlassCard } from '@/components/glass-card';
import { PrimaryButton } from '@/components/primary-button';
import { Screen } from '@/components/screen';
import { SectionTitle } from '@/components/section-title';
import { apiFetch } from '@/lib/api';
import type { ChallengeSubmission } from '@/lib/types';
import { colors } from '@/theme/colors';

export default function SubmissionResultScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const submissionQuery = useQuery({
    queryKey: ['submission', id],
    enabled: !!id,
    queryFn: () => apiFetch<ChallengeSubmission>(`/api/submissions/${id}`),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'scored' || status === 'ineligible' || status === 'error' ? false : 2500;
    },
  });

  const submission = submissionQuery.data;
  const working = !submission || submission.status === 'pending' || submission.status === 'analyzing';
  const title = working ? 'Scoring challenge' : submission.status === 'scored' ? 'Challenge scored' : submission.status === 'ineligible' ? 'Not eligible' : 'Challenge failed';

  return (
    <Screen>
      <SectionTitle title={title} subtitle="GymGlow checks that the uploaded skill matches before adding points." />
      <GlassCard style={styles.card}>
        <View style={[styles.icon, submission?.status === 'scored' && styles.successIcon, submission?.status === 'ineligible' && styles.warningIcon, submission?.status === 'error' && styles.errorIcon]}>
          {working ? <ActivityIndicator color={colors.text} /> : <Ionicons name={submission.status === 'scored' ? 'trophy' : submission.status === 'ineligible' ? 'alert-circle' : 'close-circle'} size={28} color={colors.text} />}
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.muted}>{statusCopy(submission)}</Text>
        {submission?.score != null ? (
          <View style={styles.scoreBox}>
            <Text style={styles.score}>{submission.score}</Text>
            <Text style={styles.scoreLabel}>Challenge score</Text>
          </View>
        ) : null}
      </GlassCard>

      {submission?.feedback ? (
        <GlassCard style={styles.card}>
          <Text style={styles.blockTitle}>Feedback</Text>
          {submission.feedback.split('\n').filter(Boolean).map((line, index) => (
            <Text key={`${line}-${index}`} style={styles.feedbackLine}>
              {line}
            </Text>
          ))}
        </GlassCard>
      ) : null}

      <PrimaryButton label="Back to competition" onPress={() => router.replace('/(tabs)/competition')} variant="secondary" />
    </Screen>
  );
}

function statusCopy(submission?: ChallengeSubmission) {
  if (!submission || submission.status === 'pending' || submission.status === 'analyzing') {
    return 'Your challenge video is being checked and scored. This screen updates automatically.';
  }
  if (submission.status === 'scored') return 'Nice. This challenge counted toward weekly points.';
  if (submission.status === 'ineligible') return 'This upload did not match the required challenge skill closely enough.';
  return submission.feedback || 'Something went wrong while scoring this challenge.';
}

const styles = StyleSheet.create({
  card: { marginBottom: 16 },
  icon: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: 'rgba(236,72,153,0.22)',
    borderWidth: 1,
    borderColor: colors.white16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  successIcon: { backgroundColor: 'rgba(52,211,153,0.22)' },
  warningIcon: { backgroundColor: 'rgba(251,191,36,0.22)' },
  errorIcon: { backgroundColor: 'rgba(251,113,133,0.22)' },
  title: { color: colors.text, fontSize: 24, fontWeight: '900', marginBottom: 8 },
  muted: { color: colors.textMuted, lineHeight: 22 },
  scoreBox: { marginTop: 16, padding: 16, borderRadius: 18, backgroundColor: colors.white10, borderWidth: 1, borderColor: colors.border },
  score: { color: colors.secondary, fontSize: 34, fontWeight: '900' },
  scoreLabel: { color: colors.textMuted, marginTop: 2 },
  blockTitle: { color: colors.text, fontSize: 18, fontWeight: '900', marginBottom: 12 },
  feedbackLine: { color: colors.textMuted, lineHeight: 22, marginBottom: 8 },
});
