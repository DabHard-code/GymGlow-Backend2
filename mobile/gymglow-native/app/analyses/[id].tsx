import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text } from 'react-native';
import { AnalysisDetail } from '@/components/analysis-detail';
import { GlassCard } from '@/components/glass-card';
import { Screen } from '@/components/screen';
import { SectionTitle } from '@/components/section-title';
import { apiFetch } from '@/lib/api';
import type { Analysis } from '@/lib/types';
import { colors } from '@/theme/colors';

export default function AnalysisScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const analysisQuery = useQuery({
    queryKey: ['analysis', id],
    enabled: !!id,
    queryFn: () => apiFetch<Analysis>(`/api/analyses/${id}`),
  });

  return (
    <Screen>
      <SectionTitle title="Analysis" subtitle="Full coaching notes, strengths, corrections, and next steps." />
      {analysisQuery.isLoading ? (
        <GlassCard style={styles.centerCard}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.muted}>Loading analysis...</Text>
        </GlassCard>
      ) : null}
      {analysisQuery.error ? (
        <GlassCard>
          <Text style={styles.title}>Could not load analysis</Text>
          <Text style={styles.muted}>{analysisQuery.error.message}</Text>
        </GlassCard>
      ) : null}
      {analysisQuery.data ? <AnalysisDetail analysis={analysisQuery.data} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  centerCard: { alignItems: 'center', gap: 12 },
  title: { color: colors.text, fontSize: 18, fontWeight: '900', marginBottom: 8 },
  muted: { color: colors.textMuted, lineHeight: 21 },
});
