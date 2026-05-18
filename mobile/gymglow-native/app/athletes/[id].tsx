import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Modal, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/components/screen';
import { GlassCard } from '@/components/glass-card';
import { PrimaryButton } from '@/components/primary-button';
import { SectionTitle } from '@/components/section-title';
import { apiDelete, apiFetch, apiPost } from '@/lib/api';
import type { Analysis, Athlete, SportProfile } from '@/lib/types';
import { colors } from '@/theme/colors';

export default function AthleteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [level, setLevel] = useState('Level 4');

  const athleteQuery = useQuery({
    queryKey: ['athlete', id],
    queryFn: () => apiFetch<Athlete>(`/api/athletes/${id}`),
  });
  const profilesQuery = useQuery({
    queryKey: ['profiles', id],
    queryFn: () => apiFetch<SportProfile[]>(`/api/athletes/${id}/profiles`),
  });
  const analysesQueries = useQuery({
    queryKey: ['analyses-by-athlete', id, profilesQuery.data?.map((p) => p.id).join('-')],
    enabled: !!profilesQuery.data?.length,
    queryFn: async () => {
      const results = await Promise.all(
        (profilesQuery.data ?? []).map((profile) => apiFetch<Analysis[]>(`/api/profiles/${profile.id}/analyses`)),
      );
      return results.flat().slice(0, 10);
    },
  });

  const addProfile = useMutation({
    mutationFn: () => apiPost('/api/profiles', { athleteId: id, sport: 'gymnastics', level }),
    onSuccess: async () => {
      setOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['profiles', id] });
    },
  });

  const deleteAthlete = useMutation({
    mutationFn: () => apiDelete(`/api/athletes/${id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['athletes'] });
      router.replace('/(tabs)/athletes');
    },
  });

  function confirmDeleteAthlete() {
    Alert.alert(
      'Delete athlete?',
      'This removes the athlete and their sport profiles. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteAthlete.mutate() },
      ],
    );
  }

  return (
    <Screen>
      <SectionTitle title={athleteQuery.data?.name ?? 'Athlete'} subtitle="Profiles, recent analyses, and athlete controls in one place." />

      <GlassCard style={{ marginBottom: 16 }}>
        <Text style={styles.blockTitle}>Profiles</Text>
        {(profilesQuery.data ?? []).map((profile) => (
          <View key={profile.id} style={styles.row}>
            <View>
              <Text style={styles.profileName}>{profile.sport}</Text>
              <Text style={styles.profileLevel}>{profile.level}</Text>
            </View>
          </View>
        ))}
        <View style={{ height: 12 }} />
        <PrimaryButton label="Add gymnastics profile" onPress={() => setOpen(true)} />
      </GlassCard>

      <GlassCard style={{ marginBottom: 16 }}>
        <Text style={styles.blockTitle}>Recent analyses</Text>
        {(analysesQueries.data ?? []).map((analysis) => (
          <View key={analysis.id} style={styles.analysisItem}>
            <Text style={styles.analysisScore}>{analysis.overallScore}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.analysisSummary}>{analysis.summary}</Text>
              <Text style={styles.analysisMuted}>{(analysis.strengths ?? []).slice(0, 2).join(' • ')}</Text>
            </View>
          </View>
        ))}
        {!analysesQueries.data?.length ? <Text style={styles.analysisMuted}>No analyses yet.</Text> : null}
      </GlassCard>

      <PrimaryButton label="Delete athlete" onPress={confirmDeleteAthlete} variant="ghost" loading={deleteAthlete.isPending} />

      <Modal visible={open} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Add gymnastics profile</Text>
            <TextInput style={styles.input} value={level} onChangeText={setLevel} placeholder="Level 4" placeholderTextColor={colors.textMuted} />
            <PrimaryButton label="Save profile" onPress={() => addProfile.mutate()} loading={addProfile.isPending} />
            <View style={{ height: 10 }} />
            <PrimaryButton label="Cancel" onPress={() => setOpen(false)} variant="ghost" />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  blockTitle: { color: colors.text, fontSize: 18, fontWeight: '800', marginBottom: 12 },
  row: { paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  profileName: { color: colors.text, fontSize: 16, fontWeight: '700', textTransform: 'capitalize' },
  profileLevel: { color: colors.textMuted, marginTop: 4 },
  analysisItem: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  analysisScore: { color: colors.secondary, fontSize: 30, fontWeight: '900', width: 50 },
  analysisSummary: { color: colors.text, fontWeight: '700', lineHeight: 20 },
  analysisMuted: { color: colors.textMuted, marginTop: 5, lineHeight: 18 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#0E1727', padding: 20, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, borderColor: colors.border },
  modalTitle: { color: colors.text, fontSize: 22, fontWeight: '800', marginBottom: 14 },
  input: { backgroundColor: colors.backgroundAlt, color: colors.text, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1, borderColor: colors.border, marginBottom: 12 },
});
