import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueries, useQuery } from '@tanstack/react-query';
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { GlassCard } from '@/components/glass-card';
import { PrimaryButton } from '@/components/primary-button';
import { PlanPickerModal } from '@/components/plan-picker-modal';
import { Screen } from '@/components/screen';
import { SectionTitle } from '@/components/section-title';
import { apiFetch, apiPost } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import type { Athlete, Challenge, SportProfile } from '@/lib/types';
import { colors } from '@/theme/colors';

type SelectedVideo = {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
};

function buildVideoObjectPath(args: { userId: string; profileId: string; filename: string }) {
  const safeName = args.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const ext = safeName.includes('.') ? safeName.split('.').pop() : 'mp4';
  return `${args.userId}/${args.profileId}/${Date.now()}_${Math.random().toString(16).slice(2)}.${ext}`;
}

function isICloudPhotosError(error: unknown) {
  return String((error as { message?: string })?.message ?? error).includes('PHPhotosErrorDomain error 3164');
}

function launchVideoLibrary(allowsEditing: boolean) {
  return ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['videos'],
    allowsEditing,
    preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Automatic,
    selectionLimit: 1,
    videoExportPreset: ImagePicker.VideoExportPreset.Passthrough,
    quality: 1,
  });
}

export default function ChallengeSubmitScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [asset, setAsset] = useState<SelectedVideo | null>(null);
  const [pickerStatus, setPickerStatus] = useState('Choose a challenge video.');
  const [planPickerOpen, setPlanPickerOpen] = useState(false);

  const challengeQuery = useQuery({
    queryKey: ['challenge', id],
    enabled: !!id,
    queryFn: () => apiFetch<Challenge>(`/api/challenges/${id}`),
  });
  const athletesQuery = useQuery({ queryKey: ['athletes'], queryFn: () => apiFetch<Athlete[]>('/api/athletes') });
  const profileQueries = useQueries({
    queries: (athletesQuery.data ?? []).map((athlete) => ({
      queryKey: ['profiles', athlete.id],
      queryFn: () => apiFetch<SportProfile[]>(`/api/athletes/${athlete.id}/profiles`),
    })),
  });

  const profileOptions = useMemo(
    () =>
      (athletesQuery.data ?? []).flatMap((athlete, index) =>
        (profileQueries[index]?.data ?? [])
          .filter((profile) => !challengeQuery.data?.sport || profile.sport === challengeQuery.data.sport)
          .map((profile) => ({ athlete, profile })),
      ),
    [athletesQuery.data, profileQueries, challengeQuery.data?.sport],
  );
  const selected = profileOptions.find((item) => item.profile.id === selectedProfileId) ?? null;
  const canSubmit = Boolean(asset && selected?.athlete.id && selectedProfileId && challengeQuery.data);

  useEffect(() => {
    let mounted = true;

    ImagePicker.getPendingResultAsync()
      .then((pending) => {
        if (!mounted || !pending || !('assets' in pending)) return;
        const pendingAsset = pending.assets?.[0];
        if (pendingAsset?.uri) {
          setAsset(pendingAsset);
          setPickerStatus('Challenge video ready.');
        }
      })
      .catch(() => {
        // Best-effort recovery only.
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const first = profileOptions[0];
    if (!selectedProfileId && first) {
      setSelectedAthleteId(first.athlete.id);
      setSelectedProfileId(first.profile.id);
    }
  }, [profileOptions, selectedProfileId]);

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!asset || !selectedProfileId || !selectedAthleteId || !challengeQuery.data) throw new Error('Pick a profile and video first.');
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) throw new Error('You must be logged in.');

      const filename = asset.fileName ?? 'challenge-video.mp4';
      const objectPath = buildVideoObjectPath({ userId: data.user.id, profileId: selectedProfileId, filename });
      const fileBuffer = await fetch(asset.uri).then((res) => res.arrayBuffer());
      const { error: uploadError } = await supabase.storage.from('Videos').upload(objectPath, fileBuffer, {
        contentType: asset.mimeType ?? 'video/mp4',
        upsert: false,
      });
      if (uploadError) throw uploadError;

      return apiPost<{ submissionId: string; status: string }>(`/api/challenges/${challengeQuery.data.id}/submit`, {
        athleteId: selectedAthleteId,
        profileId: selectedProfileId,
        skillId: challengeQuery.data.targetSkillId,
        videoPath: objectPath,
      });
    },
    onSuccess: (data) => {
      setAsset(null);
      setPickerStatus('Choose a challenge video.');
      router.replace({ pathname: '/submissions/[id]', params: { id: data.submissionId } });
    },
    onError: (error: any) => {
      const message = String(error?.message ?? '');
      if (message.toLowerCase().includes('plan required')) {
        setPlanPickerOpen(true);
        return;
      }
      Alert.alert('Challenge submit failed', message || 'Please try again.');
    },
  });

  async function pickVideo() {
    setPickerStatus('Opening video library...');
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setPickerStatus('Photo library permission is needed.');
      Alert.alert('Permission required', 'Allow photo library access so GymGlow can choose a challenge video.');
      return;
    }

    let result: ImagePicker.ImagePickerResult;
    try {
      result = await launchVideoLibrary(false);
    } catch (error: any) {
      if (Platform.OS === 'ios' && isICloudPhotosError(error)) {
        setPickerStatus('Preparing iCloud video...');
        try {
          result = await launchVideoLibrary(true);
        } catch {
          setPickerStatus('iCloud video is not ready. Try Browse files or open the video in Photos first.');
          Alert.alert(
            'iCloud video not ready',
            'That video is still in iCloud. Open it in the Photos app and let it finish downloading, then try again. You can also save/export it to Files and use Browse files.',
          );
          return;
        }
      } else {
      const message = String(error?.message ?? 'The photo library did not respond.');
      setPickerStatus('Photo library did not respond. Try Browse files instead.');
      Alert.alert(
        'Photo library issue',
        `${message}\n\nTry Browse files instead.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Browse files', onPress: browseVideoFile },
        ],
      );
      return;
      }
    }

    const wasCanceled = result.canceled || Boolean((result as { cancelled?: boolean }).cancelled);
    const selectedAsset = result.assets?.[0];

    if (wasCanceled) {
      setPickerStatus('Choose a challenge video.');
      return;
    }

    if (!selectedAsset?.uri) {
      setPickerStatus('No video came through. Try again or use Browse files.');
      Alert.alert('Video not selected', 'GymGlow did not receive a usable video file. Please try again.');
      return;
    }

    setAsset(selectedAsset);
    setPickerStatus('Challenge video ready.');
  }

  async function browseVideoFile() {
    setPickerStatus('Opening file browser...');
    const result = await DocumentPicker.getDocumentAsync({
      type: ['video/*', 'public.movie', 'com.apple.quicktime-movie', 'video/quicktime', '*/*'],
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (result.canceled) {
      setPickerStatus('Choose a challenge video.');
      return;
    }

    const selectedAsset = result.assets?.[0];
    if (!selectedAsset?.uri) {
      setPickerStatus('No video came through. Try again.');
      return;
    }

    setAsset({
      uri: selectedAsset.uri,
      fileName: selectedAsset.name ?? 'challenge-video.mp4',
      mimeType: selectedAsset.mimeType ?? 'video/mp4',
    });
    setPickerStatus('Challenge video ready.');
  }

  function selectProfile(athleteId: string, profileId: string) {
    setSelectedAthleteId(athleteId);
    setSelectedProfileId(profileId);
  }

  const challenge = challengeQuery.data;

  return (
    <Screen>
      <SectionTitle title={challenge?.name ?? 'Challenge'} subtitle="Submit the required skill for weekly points and challenge feedback." />

      <GlassCard style={styles.card}>
        {challengeQuery.isLoading ? <LoadingLine label="Loading challenge..." /> : null}
        <View style={styles.heroIcon}>
          <Ionicons name="flash" size={26} color={colors.text} />
        </View>
        <Text style={styles.title}>{challenge?.name ?? 'Weekly challenge'}</Text>
        <Text style={styles.muted}>{challenge?.description || challenge?.instructions || 'Upload the matching skill. GymGlow checks eligibility before scoring.'}</Text>
      </GlassCard>

      <GlassCard style={styles.card}>
        <Text style={styles.blockTitle}>Choose athlete profile</Text>
        {!profileOptions.length && !athletesQuery.isLoading ? <Text style={styles.muted}>No matching sport profiles yet.</Text> : null}
        <View style={styles.choiceStack}>
          {profileOptions.map(({ athlete, profile }) => {
            const active = profile.id === selectedProfileId;
            return (
              <Pressable key={profile.id} onPress={() => selectProfile(athlete.id, profile.id)} style={[styles.choiceRow, active && styles.choiceActive]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.choiceTitle}>{athlete.name}</Text>
                  <Text style={styles.choiceMeta}>
                    {profile.sport} - {profile.level}
                  </Text>
                </View>
                <Ionicons name={active ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={active ? colors.primary : colors.textMuted} />
              </Pressable>
            );
          })}
        </View>
      </GlassCard>

      <GlassCard style={styles.card}>
        <Text style={styles.blockTitle}>Challenge video</Text>
        <Text style={styles.muted}>Use a short clip that clearly shows the challenge skill. Different skills can be marked ineligible.</Text>
        {asset ? <Text style={styles.selected}>{asset.fileName ?? 'Selected video'}</Text> : null}
        <Text style={styles.status}>{pickerStatus}</Text>
        <View style={styles.buttonStack}>
          <PrimaryButton label={asset ? 'Change video' : 'Browse files'} onPress={browseVideoFile} variant="secondary" />
          <PrimaryButton label="Photo library" onPress={pickVideo} variant="ghost" />
          <PrimaryButton label="Submit challenge" onPress={() => submitMutation.mutate()} loading={submitMutation.isPending} disabled={!canSubmit} />
        </View>
      </GlassCard>

      <PlanPickerModal
        visible={planPickerOpen}
        onClose={() => setPlanPickerOpen(false)}
        message="Challenge submissions require an active GymGlow plan. Choose a plan to keep competing, earning badges, and tracking progress."
      />
    </Screen>
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
  card: { marginBottom: 16 },
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
  title: { color: colors.text, fontSize: 24, fontWeight: '900', marginBottom: 8 },
  blockTitle: { color: colors.text, fontSize: 18, fontWeight: '900', marginBottom: 12 },
  muted: { color: colors.textMuted, lineHeight: 21 },
  choiceStack: { gap: 10 },
  choiceRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white10 },
  choiceActive: { borderColor: 'rgba(236,72,153,0.72)', backgroundColor: 'rgba(236,72,153,0.16)' },
  choiceTitle: { color: colors.text, fontSize: 16, fontWeight: '900' },
  choiceMeta: { color: colors.textMuted, textTransform: 'capitalize', marginTop: 4 },
  selected: { color: colors.text, fontWeight: '900', marginTop: 14 },
  status: { color: colors.textMuted, marginTop: 8, lineHeight: 20 },
  buttonStack: { gap: 10, marginTop: 16 },
  loadingLine: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
