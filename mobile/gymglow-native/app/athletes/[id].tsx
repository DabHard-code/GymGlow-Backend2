import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/screen';
import { GlassCard } from '@/components/glass-card';
import { PrimaryButton } from '@/components/primary-button';
import { SectionTitle } from '@/components/section-title';
import { EmptyState } from '@/components/empty-state';
import { apiDelete, apiFetch, apiPost, apiPut } from '@/lib/api';
import type { Analysis, Athlete, SportProfile } from '@/lib/types';
import { colors } from '@/theme/colors';

const GYMNASTICS_LEVELS = [
  'Preschool',
  'Beginner',
  'Level 1',
  'Level 2',
  'Level 3',
  'Level 4',
  'Level 5',
  'Level 6',
  'Level 7',
  'Level 8',
  'Level 9',
  'Level 10',
  'Xcel Bronze',
  'Xcel Silver',
  'Xcel Gold',
  'Xcel Platinum',
  'Xcel Diamond',
];

export default function AthleteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [level, setLevel] = useState('Level 4');
  const [editName, setEditName] = useState('');
  const [editAlias, setEditAlias] = useState('');

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
    onError: (error: any) => Alert.alert('Could not add profile', error?.message ?? 'Please try again.'),
  });

  const deleteProfile = useMutation({
    mutationFn: (profileId: string) => apiDelete(`/api/profiles/${profileId}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['profiles', id] });
      await queryClient.invalidateQueries({ queryKey: ['athletes'] });
      await queryClient.invalidateQueries({ queryKey: ['analyses-by-athlete'] });
    },
    onError: (error: any) => Alert.alert('Could not delete profile', error?.message ?? 'Please try again.'),
  });

  const updateAthlete = useMutation({
    mutationFn: () => apiPut<Athlete>(`/api/athletes/${id}`, { name: editName, publicDisplayName: editAlias }),
    onSuccess: async () => {
      setEditOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['athlete', id] });
      await queryClient.invalidateQueries({ queryKey: ['athletes'] });
    },
    onError: (error: any) => Alert.alert('Could not save athlete', error?.message ?? 'Please try again.'),
  });

  const deleteAthlete = useMutation({
    mutationFn: () => apiDelete(`/api/athletes/${id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['athletes'] });
      router.replace('/(tabs)/athletes');
    },
    onError: (error: any) => Alert.alert('Could not delete athlete', error?.message ?? 'Please try again.'),
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

  function openEditAthlete() {
    setEditName(athlete?.name ?? '');
    setEditAlias(athlete?.publicDisplayName ?? '');
    setEditOpen(true);
  }

  function confirmDeleteProfile(profile: SportProfile) {
    Alert.alert(
      'Delete sport profile?',
      `This removes the ${profile.sport} ${profile.level} profile and any saved uploads attached to it. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteProfile.mutate(profile.id) },
      ],
    );
  }

  function openAddProfile() {
    const existingLevels = new Set(profiles.map((profile) => profile.level));
    const firstAvailable = GYMNASTICS_LEVELS.find((item) => !existingLevels.has(item));
    setLevel(firstAvailable ?? GYMNASTICS_LEVELS[0]);
    setOpen(true);
  }

  const athlete = athleteQuery.data;
  const profiles = profilesQuery.data ?? [];
  const analyses = analysesQueries.data ?? [];
  const initials = (athlete?.name ?? 'GG').slice(0, 2).toUpperCase();
  const firstProfile = profiles[0];

  function goToUpload() {
    router.push({
      pathname: '/(tabs)/upload',
      params: {
        athleteId: id,
        profileId: firstProfile?.id ?? '',
      },
    });
  }

  return (
    <Screen>
      <GlassCard style={styles.heroCard}>
        <View style={styles.heroRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.heroBody}>
            <Text style={styles.athleteName}>{athlete?.name ?? 'Athlete'}</Text>
            <Text style={styles.athleteMeta}>{athlete?.publicDisplayName ? `Leaderboard: ${athlete.publicDisplayName}` : 'Private athlete profile'}</Text>
          </View>
        </View>
        <View style={styles.heroStats}>
          <View style={styles.statPill}>
            <Text style={styles.statValue}>{profiles.length}</Text>
            <Text style={styles.statLabel}>Profiles</Text>
          </View>
          <View style={styles.statPill}>
            <Text style={styles.statValue}>{analyses.length}</Text>
            <Text style={styles.statLabel}>Recent</Text>
          </View>
        </View>
        <View style={styles.heroButtons}>
          <PrimaryButton
            label={profiles.length ? 'Upload for this athlete' : 'Add profile before upload'}
            onPress={() => (profiles.length ? goToUpload() : openAddProfile())}
          />
          <PrimaryButton label="Meet tracker" onPress={() => router.push({ pathname: '/meets/[athleteId]', params: { athleteId: id } })} variant="secondary" />
          <PrimaryButton label="Edit athlete" onPress={openEditAthlete} variant="secondary" />
        </View>
      </GlassCard>

      <SectionTitle title="Sport profiles" subtitle="Profiles decide level, sport, uploads, and analysis history." />
      <GlassCard style={{ marginBottom: 16 }}>
        {profiles.map((profile) => (
          <View key={profile.id} style={styles.profileCard}>
            <View style={styles.profileIcon}>
              <Ionicons name="sparkles" size={18} color={colors.text} />
            </View>
            <View style={styles.profileBody}>
              <Text style={styles.profileName}>{profile.sport}</Text>
              <Text style={styles.profileLevel}>{profile.level}</Text>
            </View>
            <Pressable
              onPress={() => confirmDeleteProfile(profile)}
              disabled={deleteProfile.isPending}
              style={({ pressed }) => [styles.profileDelete, pressed && styles.pressed, deleteProfile.isPending && styles.disabled]}
              accessibilityRole="button"
              accessibilityLabel={`Delete ${profile.sport} ${profile.level} profile`}
            >
              <Ionicons name="trash" size={17} color={colors.danger} />
            </Pressable>
          </View>
        ))}
        {!profiles.length ? (
          <EmptyState
            icon="barbell"
            title="Add a sport profile"
            description="GymGlow needs a sport and level before it can organize uploads and feedback."
            actionLabel="Add gymnastics profile"
            onAction={openAddProfile}
          />
        ) : null}
        <View style={{ height: 12 }} />
        {profiles.length ? <PrimaryButton label="Add gymnastics profile" onPress={openAddProfile} variant="secondary" /> : null}
      </GlassCard>

      {profiles.length ? (
        <GlassCard style={styles.nextStepCard}>
          <View style={styles.nextStepIcon}>
            <Ionicons name="checkmark" size={20} color={colors.text} />
          </View>
          <View style={styles.nextStepBody}>
            <Text style={styles.nextStepTitle}>Profile ready</Text>
            <Text style={styles.nextStepCopy}>Next, upload a short practice video for this athlete. GymGlow will attach it to their sport profile automatically.</Text>
          </View>
          <View style={styles.nextStepButton}>
            <PrimaryButton label="Upload video" onPress={goToUpload} />
          </View>
        </GlassCard>
      ) : null}

      <SectionTitle title="Recent analyses" subtitle="A quick look at saved feedback and scores." />
      <GlassCard style={{ marginBottom: 16 }}>
        {analyses.map((analysis) => (
          <Pressable key={analysis.id} onPress={() => router.push({ pathname: '/analyses/[id]', params: { id: analysis.id } })} style={({ pressed }) => [styles.analysisItem, pressed && styles.pressed]}>
            <View style={styles.scoreBadge}>
              <Text style={styles.analysisScore}>{analysis.overallScore}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.analysisSummary}>{analysis.summary}</Text>
              <Text style={styles.analysisMuted}>{(analysis.strengths ?? []).slice(0, 2).join('  |  ') || 'Practice feedback saved'}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </Pressable>
        ))}
        {!analyses.length ? (
          <EmptyState
            icon="videocam"
            title="No analyses yet"
            description={profiles.length ? 'Upload a short, clear practice video to get AI coaching notes.' : 'Add a sport profile first, then upload a short practice video.'}
            actionLabel={profiles.length ? 'Upload video' : 'Add profile'}
            onAction={() => (profiles.length ? goToUpload() : openAddProfile())}
          />
        ) : null}
      </GlassCard>

      <PrimaryButton label="Delete athlete" onPress={confirmDeleteAthlete} variant="ghost" loading={deleteAthlete.isPending} />

      <Modal visible={editOpen} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Edit athlete</Text>
            <Text style={styles.modalCopy}>Private name stays inside your account. Public alias is what leaderboard rows can show.</Text>
            <Text style={styles.inputLabel}>Private athlete name</Text>
            <TextInput style={styles.input} value={editName} onChangeText={setEditName} placeholder="Athlete name" placeholderTextColor={colors.textMuted} />
            <Text style={styles.inputLabel}>Public leaderboard alias</Text>
            <TextInput style={styles.input} value={editAlias} onChangeText={setEditAlias} placeholder="GymGlow Star" placeholderTextColor={colors.textMuted} />
            <PrimaryButton label="Save athlete" onPress={() => updateAthlete.mutate()} loading={updateAthlete.isPending} disabled={!editName.trim()} />
            <View style={{ height: 10 }} />
            <PrimaryButton label="Cancel" onPress={() => setEditOpen(false)} variant="ghost" />
          </View>
        </View>
      </Modal>

      <Modal visible={open} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Add gymnastics profile</Text>
            <Text style={styles.modalCopy}>Choose the USAG, Xcel, or working level you want GymGlow to use for this athlete.</Text>
            <View style={styles.levelGrid}>
              {GYMNASTICS_LEVELS.map((item) => {
                const selected = item === level;
                const alreadyAdded = profiles.some((profile) => profile.level === item);
                return (
                  <Pressable
                    key={item}
                    onPress={() => setLevel(item)}
                    disabled={alreadyAdded}
                    style={[styles.levelPill, selected && styles.levelPillSelected, alreadyAdded && styles.levelPillDisabled]}
                  >
                    <Text style={[styles.levelPillText, selected && styles.levelPillTextSelected, alreadyAdded && styles.levelPillTextDisabled]}>
                      {item}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <PrimaryButton label="Save profile" onPress={() => addProfile.mutate()} loading={addProfile.isPending} disabled={!level || profiles.some((profile) => profile.level === level)} />
            <View style={{ height: 10 }} />
            <PrimaryButton label="Cancel" onPress={() => setOpen(false)} variant="ghost" />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroCard: { marginTop: 2, marginBottom: 8 },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  avatar: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: 'rgba(236,72,153,0.22)',
    borderWidth: 1,
    borderColor: colors.white16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.text, fontSize: 18, fontWeight: '900' },
  heroBody: { flex: 1 },
  athleteName: { color: colors.text, fontSize: 26, fontWeight: '900' },
  athleteMeta: { color: colors.textMuted, marginTop: 4, lineHeight: 19 },
  heroStats: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  heroButtons: { gap: 10 },
  statPill: { flex: 1, borderRadius: 16, backgroundColor: colors.white10, padding: 12, borderWidth: 1, borderColor: colors.border },
  statValue: { color: colors.text, fontSize: 20, fontWeight: '900' },
  statLabel: { color: colors.textMuted, marginTop: 2, fontSize: 12 },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  profileIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(34,211,238,0.14)', alignItems: 'center', justifyContent: 'center' },
  profileBody: { flex: 1 },
  profileName: { color: colors.text, fontSize: 16, fontWeight: '900', textTransform: 'capitalize' },
  profileLevel: { color: colors.textMuted, marginTop: 3 },
  profileDelete: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(251,113,133,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(251,113,133,0.24)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextStepCard: { marginBottom: 16 },
  nextStepIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(52,211,153,0.18)',
    borderWidth: 1,
    borderColor: colors.white16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  nextStepBody: { marginBottom: 14 },
  nextStepTitle: { color: colors.text, fontSize: 18, fontWeight: '900', marginBottom: 5 },
  nextStepCopy: { color: colors.textMuted, lineHeight: 21 },
  nextStepButton: { alignSelf: 'stretch' },
  analysisItem: { flexDirection: 'row', gap: 12, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  scoreBadge: { width: 54, height: 54, borderRadius: 18, backgroundColor: 'rgba(34,211,238,0.13)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.white16 },
  analysisScore: { color: colors.secondary, fontSize: 24, fontWeight: '900' },
  analysisSummary: { color: colors.text, fontWeight: '800', lineHeight: 20 },
  analysisMuted: { color: colors.textMuted, marginTop: 5, lineHeight: 18 },
  pressed: { opacity: 0.74 },
  disabled: { opacity: 0.45 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.62)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#0E1727', padding: 20, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, borderColor: colors.border },
  modalTitle: { color: colors.text, fontSize: 24, fontWeight: '900', marginBottom: 8 },
  modalCopy: { color: colors.textMuted, lineHeight: 20, marginBottom: 14 },
  levelGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  levelPill: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white10,
  },
  levelPillSelected: { borderColor: 'rgba(236,72,153,0.75)', backgroundColor: 'rgba(236,72,153,0.18)' },
  levelPillDisabled: { opacity: 0.38 },
  levelPillText: { color: colors.text, fontSize: 12, fontWeight: '800' },
  levelPillTextSelected: { color: colors.text },
  levelPillTextDisabled: { color: colors.textMuted },
  inputLabel: { color: colors.text, fontWeight: '900', marginBottom: 7 },
  input: { backgroundColor: colors.backgroundAlt, color: colors.text, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1, borderColor: colors.border, marginBottom: 12 },
});
