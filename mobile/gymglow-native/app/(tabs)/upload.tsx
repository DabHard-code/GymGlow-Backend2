import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Screen } from '@/components/screen';
import { GlassCard } from '@/components/glass-card';
import { SectionTitle } from '@/components/section-title';
import { PrimaryButton } from '@/components/primary-button';
import { apiFetch, apiPost } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import type { Athlete, SportProfile } from '@/lib/types';
import { colors } from '@/theme/colors';

function buildVideoObjectPath(args: { userId: string; profileId?: string; filename: string }) {
  const safeName = args.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const ext = safeName.includes('.') ? safeName.split('.').pop() : 'mp4';
  return `${args.userId}/${args.profileId ?? 'no-profile'}/${Date.now()}_${Math.random().toString(16).slice(2)}.${ext}`;
}

export default function UploadTab() {
  const [asset, setAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [profileId] = useState<string | null>(null);
  const [pickerStatus, setPickerStatus] = useState('Choose a video from your library.');
  const athletesQuery = useQuery({ queryKey: ['athletes'], queryFn: () => apiFetch<Athlete[]>('/api/athletes') });
  const firstAthleteId = athletesQuery.data?.[0]?.id;
  const profilesQuery = useQuery({
    queryKey: ['upload-profiles', firstAthleteId],
    enabled: !!firstAthleteId,
    queryFn: () => apiFetch<SportProfile[]>(`/api/athletes/${firstAthleteId}/profiles`),
  });

  const activeProfileId = useMemo(() => profileId ?? profilesQuery.data?.[0]?.id ?? null, [profileId, profilesQuery.data]);
  const uploadTarget = profilesQuery.data?.[0];

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
      if (!asset || !activeProfileId) throw new Error('Select a video and make sure at least one profile exists.');
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) throw new Error('You must be logged in.');
      const filename = asset.fileName ?? 'video.mp4';
      const objectPath = buildVideoObjectPath({ userId: data.user.id, profileId: activeProfileId, filename });
      const fileBuffer = await fetch(asset.uri).then((res) => res.arrayBuffer());
      const { error: uploadError } = await supabase.storage.from('Videos').upload(objectPath, fileBuffer, {
        contentType: asset.mimeType ?? 'video/mp4',
        upsert: false,
      });
      if (uploadError) throw uploadError;
      return apiPost<{ sessionId: string; status: string }>(`/api/profiles/${activeProfileId}/analyze`, {
        videoPath: objectPath,
        title: filename,
      });
    },
    onSuccess: (data) => Alert.alert('Upload started', `Session ${data.sessionId} is now processing.`),
    onError: (error: any) => Alert.alert('Upload failed', error?.message ?? 'Please try again.'),
  });

  async function pickVideo() {
    setPickerStatus('Opening video library...');
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setPickerStatus('Photo library permission is needed.');
      Alert.alert('Permission required', 'Allow photo library access so GymGlow can choose a video to analyze.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsEditing: false,
      quality: 1,
    });

    const wasCanceled = result.canceled || Boolean((result as { cancelled?: boolean }).cancelled);
    const selectedAsset = result.assets?.[0];

    if (wasCanceled) {
      setPickerStatus('Choose a video from your library.');
      return;
    }

    if (!selectedAsset?.uri) {
      setPickerStatus('No video came through. Try again or use a development build.');
      Alert.alert('Video not selected', 'GymGlow did not receive a usable video file. Please try again.');
      return;
    }

    setAsset(selectedAsset);
    setPickerStatus('Video ready to upload.');
  }

  return (
    <Screen>
      <SectionTitle title="Upload & analyze" subtitle="Pick a skill video and send it for GymGlow feedback." />

      <GlassCard style={styles.uploadCard}>
        <View style={styles.uploadIcon}>
          <Ionicons name={asset ? 'checkmark' : 'videocam'} size={26} color={colors.text} />
        </View>
        <Text style={styles.uploadTitle}>{asset ? 'Video selected' : 'Choose your video'}</Text>
        <Text style={styles.copy}>
          Videos are processed temporarily for AI analysis and deleted after processing. Feedback is practice support, not official judging or safety clearance.
        </Text>
        {asset ? <Text style={styles.selectedText}>{asset.fileName ?? 'Selected video'}</Text> : null}
        <Text style={styles.pickerStatus}>{pickerStatus}</Text>
        <View style={styles.buttonStack}>
          <PrimaryButton label={asset ? 'Change video' : 'Pick a video'} onPress={pickVideo} variant="secondary" />
          <PrimaryButton label="Upload and analyze" onPress={() => uploadMutation.mutate()} loading={uploadMutation.isPending} disabled={!asset || !activeProfileId} />
        </View>
      </GlassCard>

      <GlassCard>
        <Text style={styles.blockTitle}>Upload target</Text>
        <View style={styles.targetRow}>
          <Text style={styles.targetLabel}>Athlete</Text>
          <Text style={styles.targetValue}>{athletesQuery.data?.[0]?.name ?? 'None yet'}</Text>
        </View>
        <View style={styles.targetRow}>
          <Text style={styles.targetLabel}>Profile</Text>
          <Text style={styles.targetValue}>{uploadTarget ? `${uploadTarget.sport} - ${uploadTarget.level}` : 'Create a profile first'}</Text>
        </View>
      </GlassCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  uploadCard: { alignItems: 'stretch', marginBottom: 16 },
  uploadIcon: {
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
  uploadTitle: { color: colors.text, fontSize: 24, fontWeight: '900', marginBottom: 8 },
  copy: { color: colors.textMuted, lineHeight: 22 },
  selectedText: { color: colors.text, marginTop: 14, fontWeight: '800' },
  pickerStatus: { color: colors.textMuted, marginTop: 8, lineHeight: 18 },
  buttonStack: { gap: 12, marginTop: 18 },
  blockTitle: { color: colors.text, fontSize: 18, fontWeight: '900', marginBottom: 10 },
  targetRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 16, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  targetLabel: { color: colors.textMuted },
  targetValue: { color: colors.text, fontWeight: '800', flex: 1, textAlign: 'right', textTransform: 'capitalize' },
});
