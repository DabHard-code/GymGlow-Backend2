import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components/screen';
import { GlassCard } from '@/components/glass-card';
import { SectionTitle } from '@/components/section-title';
import { PrimaryButton } from '@/components/primary-button';
import { PlanPickerModal } from '@/components/plan-picker-modal';
import { apiFetch, apiPost } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import type { Athlete, SportProfile } from '@/lib/types';
import { colors } from '@/theme/colors';

function buildVideoObjectPath(args: { userId: string; profileId?: string; filename: string }) {
  const safeName = args.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const ext = safeName.includes('.') ? safeName.split('.').pop() : 'mp4';
  return `${args.userId}/${args.profileId ?? 'no-profile'}/${Date.now()}_${Math.random().toString(16).slice(2)}.${ext}`;
}

type SelectedVideo = {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
};

function withTimeout<T>(promise: Promise<T>, ms: number, message: string) {
  let timeoutId: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), ms);
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
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

export default function UploadTab() {
  const { athleteId, profileId } = useLocalSearchParams<{ athleteId?: string; profileId?: string }>();
  const [asset, setAsset] = useState<SelectedVideo | null>(null);
  const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [pickerStatus, setPickerStatus] = useState('Choose a video from your library.');
  const [planPickerOpen, setPlanPickerOpen] = useState(false);
  const athletesQuery = useQuery({ queryKey: ['athletes'], queryFn: () => apiFetch<Athlete[]>('/api/athletes') });
  const profilesQuery = useQuery({
    queryKey: ['profiles', selectedAthleteId],
    enabled: !!selectedAthleteId,
    queryFn: () => apiFetch<SportProfile[]>(`/api/athletes/${selectedAthleteId}/profiles`),
  });

  const selectedAthlete = useMemo(
    () => athletesQuery.data?.find((athlete) => athlete.id === selectedAthleteId) ?? null,
    [athletesQuery.data, selectedAthleteId],
  );
  const selectedProfile = useMemo(
    () => profilesQuery.data?.find((profile) => profile.id === selectedProfileId) ?? null,
    [profilesQuery.data, selectedProfileId],
  );
  const canUpload = Boolean(asset && selectedProfileId);

  useEffect(() => {
    if (athleteId && athleteId !== selectedAthleteId) {
      setSelectedAthleteId(athleteId);
      setSelectedProfileId(profileId ?? null);
      return;
    }

    const firstAthlete = athletesQuery.data?.[0];
    if (!selectedAthleteId && firstAthlete) setSelectedAthleteId(firstAthlete.id);
  }, [athleteId, athletesQuery.data, profileId, selectedAthleteId]);

  useEffect(() => {
    const firstProfile = profilesQuery.data?.[0];
    const selectedStillExists = profilesQuery.data?.some((profile) => profile.id === selectedProfileId);
    if (profileId && profilesQuery.data?.some((profile) => profile.id === profileId)) {
      setSelectedProfileId(profileId);
      return;
    }
    if (!selectedStillExists) setSelectedProfileId(firstProfile?.id ?? null);
  }, [profileId, profilesQuery.data, selectedProfileId]);

  useEffect(() => {
    let mounted = true;

    ImagePicker.getPendingResultAsync()
      .then((pending) => {
        if (!mounted || !pending || !('assets' in pending)) return;
        const pendingAsset = pending.assets?.[0];
        if (pendingAsset?.uri) {
          setAsset(pendingAsset);
          setPickerStatus('Video ready to upload.');
        }
      })
      .catch(() => {
        // Best-effort recovery only.
      });

    return () => {
      mounted = false;
    };
  }, []);

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!asset || !selectedProfileId) throw new Error('Select an athlete, profile, and video first.');
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) throw new Error('You must be logged in.');
      const filename = asset.fileName ?? 'video.mp4';
      const objectPath = buildVideoObjectPath({ userId: data.user.id, profileId: selectedProfileId, filename });
      const fileBuffer = await fetch(asset.uri).then((res) => res.arrayBuffer());
      const { error: uploadError } = await supabase.storage.from('Videos').upload(objectPath, fileBuffer, {
        contentType: asset.mimeType ?? 'video/mp4',
        upsert: false,
      });
      if (uploadError) throw uploadError;
      return apiPost<{ sessionId: string; status: string }>(`/api/profiles/${selectedProfileId}/analyze`, {
        videoPath: objectPath,
        title: filename,
      });
    },
    onSuccess: (data) => {
      setAsset(null);
      setPickerStatus('Choose a video from your library.');
      router.push({ pathname: '/sessions/[id]', params: { id: data.sessionId, athleteId: selectedAthleteId ?? '' } });
    },
    onError: (error: any) => {
      const message = String(error?.message ?? '');
      if (message.toLowerCase().includes('plan required')) {
        setPlanPickerOpen(true);
        return;
      }
      Alert.alert('Upload failed', message || 'Please try again.');
    },
  });

  async function pickVideo() {
    setPickerStatus('Opening video library...');
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setPickerStatus('Photo library permission is needed.');
      Alert.alert('Permission required', 'Allow photo library access so GymGlow can choose a video to analyze.');
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
      setPickerStatus('Choose a video from your library.');
      return;
    }

    if (!selectedAsset?.uri) {
      setPickerStatus('No video came through. Try again or use Browse files.');
      Alert.alert('Video not selected', 'GymGlow did not receive a usable video file. Please try again.');
      return;
    }

    setAsset(selectedAsset);
    setPickerStatus('Video ready to upload.');
  }

  async function browseVideoFile() {
    setPickerStatus('Opening file browser...');
    try {
      const result = await withTimeout(
        DocumentPicker.getDocumentAsync({
          type: ['video/*', 'public.movie', 'com.apple.quicktime-movie', 'video/quicktime'],
          copyToCacheDirectory: true,
          multiple: false,
        }),
        20000,
        'The file browser did not return a video.',
      );

      if (result.canceled) {
        setPickerStatus('Choose a video from your library.');
        return;
      }

      const selectedAsset = result.assets?.[0];
      if (!selectedAsset?.uri) {
        setPickerStatus('No video came through. Try another file.');
        Alert.alert('Video not selected', 'GymGlow did not receive a usable video file.');
        return;
      }

      setAsset({
        uri: selectedAsset.uri,
        fileName: selectedAsset.name ?? 'video.mp4',
        mimeType: selectedAsset.mimeType ?? 'video/mp4',
      });
      setPickerStatus('Video ready to upload.');
    } catch (error: any) {
      setPickerStatus('File browser did not finish. Try again.');
      Alert.alert('File browser issue', error?.message ?? 'Please try again.');
    }
  }

  function selectAthlete(id: string) {
    setSelectedAthleteId(id);
    setSelectedProfileId(null);
  }

  return (
    <Screen>
      <SectionTitle title="Upload & analyze" subtitle="Choose who this video belongs to before sending it for feedback." />

      <GlassCard style={styles.noticeCard}>
        <View style={styles.noticeIcon}>
          <Ionicons name="shield-checkmark" size={22} color={colors.text} />
        </View>
        <View style={styles.noticeCopy}>
          <Text style={styles.noticeTitle}>Private practice upload</Text>
          <Text style={styles.copy}>
            Videos are processed temporarily for AI analysis and deleted after processing. Feedback is practice support, not official judging or safety clearance.
          </Text>
        </View>
      </GlassCard>

      <GlassCard style={styles.stepCard}>
        <StepHeader step="1" title="Choose athlete" icon="people" />
        {athletesQuery.isLoading ? <LoadingLine label="Loading athletes..." /> : null}
        {!athletesQuery.isLoading && !athletesQuery.data?.length ? (
          <EmptyState
            icon="person-add"
            title="No athletes yet"
            copy="Create an athlete first, then come back here to upload a practice video."
            actionLabel="Go to athletes"
            onAction={() => router.push('/(tabs)/athletes')}
          />
        ) : null}
        <View style={styles.choiceStack}>
          {athletesQuery.data?.map((athlete) => {
            const selected = athlete.id === selectedAthleteId;
            return (
              <Pressable key={athlete.id} onPress={() => selectAthlete(athlete.id)} style={[styles.choiceRow, selected && styles.choiceRowSelected]}>
                <View style={[styles.avatar, selected && styles.avatarSelected]}>
                  <Text style={styles.avatarText}>{(athlete.publicDisplayName || athlete.name || 'A').slice(0, 1).toUpperCase()}</Text>
                </View>
                <View style={styles.choiceText}>
                  <Text style={styles.choiceTitle}>{athlete.name}</Text>
                  <Text style={styles.choiceMeta}>{athlete.publicDisplayName ? `Public alias: ${athlete.publicDisplayName}` : 'Private athlete profile'}</Text>
                </View>
                <Ionicons name={selected ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={selected ? colors.primary : colors.textMuted} />
              </Pressable>
            );
          })}
        </View>
      </GlassCard>

      <GlassCard style={styles.stepCard}>
        <StepHeader step="2" title="Choose profile" icon="sparkles" />
        {!selectedAthleteId ? <Text style={styles.copy}>Pick an athlete first.</Text> : null}
        {selectedAthleteId && profilesQuery.isLoading ? <LoadingLine label="Loading profiles..." /> : null}
        {selectedAthleteId && !profilesQuery.isLoading && !profilesQuery.data?.length ? (
          <EmptyState
            icon="barbell"
            title="No sport profile yet"
            copy="Add a gymnastics profile to this athlete before uploading."
            actionLabel="Add profile"
            onAction={() => router.push({ pathname: '/(tabs)/athletes/[id]', params: { id: selectedAthleteId } })}
          />
        ) : null}
        <View style={styles.profileGrid}>
          {profilesQuery.data?.map((profile) => {
            const selected = profile.id === selectedProfileId;
            return (
              <Pressable key={profile.id} onPress={() => setSelectedProfileId(profile.id)} style={[styles.profilePill, selected && styles.profilePillSelected]}>
                <Text style={styles.profileSport}>{profile.sport}</Text>
                <Text style={styles.profileLevel}>{profile.level}</Text>
              </Pressable>
            );
          })}
        </View>
      </GlassCard>

      <GlassCard style={styles.stepCard}>
        <StepHeader step="3" title="Pick video" icon="videocam" />
        <View style={styles.videoBox}>
          <View style={styles.uploadIcon}>
            <Ionicons name={asset ? 'checkmark' : 'cloud-upload'} size={26} color={colors.text} />
          </View>
          <View style={styles.videoCopy}>
            <Text style={styles.uploadTitle}>{asset ? 'Video selected' : 'Choose a practice video'}</Text>
            {asset ? <Text style={styles.selectedText}>{asset.fileName ?? 'Selected video'}</Text> : <Text style={styles.copy}>Use a short, clear clip with the full skill visible.</Text>}
            <Text style={styles.pickerStatus}>{pickerStatus}</Text>
          </View>
        </View>
        <View style={styles.buttonStack}>
          <PrimaryButton label={asset ? 'Change video' : 'Photo library'} onPress={pickVideo} />
          <PrimaryButton label="Browse files" onPress={browseVideoFile} variant="secondary" />
        </View>
      </GlassCard>

      <GlassCard style={styles.reviewCard}>
        <StepHeader step="4" title="Review & send" icon="rocket" />
        <ReviewRow label="Athlete" value={selectedAthlete?.name ?? 'Choose athlete'} ready={!!selectedAthlete} />
        <ReviewRow label="Profile" value={selectedProfile ? `${selectedProfile.sport} - ${selectedProfile.level}` : 'Choose profile'} ready={!!selectedProfile} />
        <ReviewRow label="Video" value={asset?.fileName ?? 'Pick video'} ready={!!asset} />
        <PrimaryButton label="Upload and analyze" onPress={() => uploadMutation.mutate()} loading={uploadMutation.isPending} disabled={!canUpload} />
      </GlassCard>

      <PlanPickerModal
        visible={planPickerOpen}
        onClose={() => setPlanPickerOpen(false)}
        message="Your starter upload was used. Choose a plan to keep sending videos for AI feedback and badge progress."
      />
    </Screen>
  );
}

function StepHeader({ step, title, icon }: { step: string; title: string; icon: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={styles.stepHeader}>
      <View style={styles.stepBadge}>
        <Text style={styles.stepBadgeText}>{step}</Text>
      </View>
      <Text style={styles.blockTitle}>{title}</Text>
      <Ionicons name={icon} size={20} color={colors.textMuted} />
    </View>
  );
}

function LoadingLine({ label }: { label: string }) {
  return (
    <View style={styles.loadingLine}>
      <ActivityIndicator color={colors.primary} />
      <Text style={styles.copy}>{label}</Text>
    </View>
  );
}

function EmptyState({ icon, title, copy, actionLabel, onAction }: { icon: keyof typeof Ionicons.glyphMap; title: string; copy: string; actionLabel: string; onAction: () => void }) {
  return (
    <View style={styles.emptyBox}>
      <Ionicons name={icon} size={22} color={colors.primary} />
      <View style={styles.emptyCopy}>
        <Text style={styles.emptyTitle}>{title}</Text>
        <Text style={styles.copy}>{copy}</Text>
      </View>
      <PrimaryButton label={actionLabel} onPress={onAction} variant="ghost" />
    </View>
  );
}

function ReviewRow({ label, value, ready }: { label: string; value: string; ready: boolean }) {
  return (
    <View style={styles.targetRow}>
      <View>
        <Text style={styles.targetLabel}>{label}</Text>
        <Text style={styles.targetValue}>{value}</Text>
      </View>
      <Ionicons name={ready ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={ready ? colors.success : colors.textMuted} />
    </View>
  );
}

const styles = StyleSheet.create({
  noticeCard: { flexDirection: 'row', gap: 14, marginBottom: 16 },
  noticeIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(34,211,238,0.18)',
    borderWidth: 1,
    borderColor: colors.white16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noticeCopy: { flex: 1 },
  noticeTitle: { color: colors.text, fontSize: 17, fontWeight: '900', marginBottom: 4 },
  stepCard: { marginBottom: 16 },
  reviewCard: { marginBottom: 28 },
  stepHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(236,72,153,0.22)',
    borderWidth: 1,
    borderColor: colors.white16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadgeText: { color: colors.text, fontWeight: '900', fontSize: 13 },
  blockTitle: { color: colors.text, fontSize: 18, fontWeight: '900', flex: 1 },
  choiceStack: { gap: 10 },
  choiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 18,
    backgroundColor: colors.white10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  choiceRowSelected: { borderColor: 'rgba(236,72,153,0.72)', backgroundColor: 'rgba(236,72,153,0.16)' },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardSoft,
    borderWidth: 1,
    borderColor: colors.white16,
  },
  avatarSelected: { backgroundColor: colors.primary },
  avatarText: { color: colors.text, fontWeight: '900' },
  choiceText: { flex: 1 },
  choiceTitle: { color: colors.text, fontSize: 16, fontWeight: '900' },
  choiceMeta: { color: colors.textMuted, marginTop: 2, fontSize: 12 },
  profileGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  profilePill: {
    minWidth: '47%',
    flexGrow: 1,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white10,
  },
  profilePillSelected: { borderColor: 'rgba(34,211,238,0.72)', backgroundColor: 'rgba(34,211,238,0.15)' },
  profileSport: { color: colors.text, fontWeight: '900', textTransform: 'capitalize', marginBottom: 4 },
  profileLevel: { color: colors.textMuted, textTransform: 'capitalize' },
  videoBox: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  uploadIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: 'rgba(236,72,153,0.22)',
    borderWidth: 1,
    borderColor: colors.white16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoCopy: { flex: 1 },
  uploadTitle: { color: colors.text, fontSize: 18, fontWeight: '900', marginBottom: 4 },
  copy: { color: colors.textMuted, lineHeight: 22 },
  selectedText: { color: colors.text, fontWeight: '800' },
  pickerStatus: { color: colors.textMuted, marginTop: 8, lineHeight: 18 },
  buttonStack: { gap: 10 },
  loadingLine: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  emptyBox: { gap: 12 },
  emptyCopy: { gap: 3 },
  emptyTitle: { color: colors.text, fontWeight: '900', fontSize: 16 },
  targetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  targetLabel: { color: colors.textMuted },
  targetValue: { color: colors.text, fontWeight: '800', marginTop: 3, textTransform: 'capitalize' },
});
