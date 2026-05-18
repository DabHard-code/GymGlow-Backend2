import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
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
  const [profileId, setProfileId] = useState<string | null>(null);
  const [pickerStatus, setPickerStatus] = useState('No video selected yet.');
  const athletesQuery = useQuery({ queryKey: ['athletes'], queryFn: () => apiFetch<Athlete[]>('/api/athletes') });
  const firstAthleteId = athletesQuery.data?.[0]?.id;
  const profilesQuery = useQuery({
    queryKey: ['upload-profiles', firstAthleteId],
    enabled: !!firstAthleteId,
    queryFn: () => apiFetch<SportProfile[]>(`/api/athletes/${firstAthleteId}/profiles`),
  });

  const activeProfileId = useMemo(() => profileId ?? profilesQuery.data?.[0]?.id ?? null, [profileId, profilesQuery.data]);

  useEffect(() => {
    let mounted = true;

    ImagePicker.getPendingResultAsync().then((pending) => {
      if (!mounted || !pending || !('assets' in pending)) return;
      const pendingAsset = pending.assets?.[0];
      if (pendingAsset?.uri) {
        setAsset(pendingAsset);
        setPickerStatus(`Recovered video: ${pendingAsset.fileName ?? 'selected video'}`);
      }
    }).catch(() => {
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
      setPickerStatus('Photo library permission was not granted.');
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
      setPickerStatus('Picker returned canceled.');
      return;
    }

    if (!selectedAsset?.uri) {
      setPickerStatus(`Picker returned no usable asset. Assets: ${result.assets?.length ?? 0}.`);
      Alert.alert('Video not selected', 'GymGlow did not receive a usable video file. Please try again.');
      return;
    }

    setAsset(selectedAsset);
    setPickerStatus(`Video selected: ${selectedAsset.fileName ?? 'selected video'}`);
  }

  return (
    <Screen>
      <SectionTitle title="Upload & analyze" subtitle="Choose a skill video and send it for GymGlow feedback." />
      <GlassCard style={{ marginBottom: 16 }}>
        <Text style={styles.copy}>Videos are processed temporarily for AI analysis and deleted after processing. Feedback is practice support, not official judging or safety clearance.</Text>
        <View style={{ height: 14 }} />
        <PrimaryButton label={asset ? 'Change video' : 'Pick a video'} onPress={pickVideo} variant="secondary" />
        {asset ? <Text style={styles.assetText}>Selected: {asset.fileName ?? 'Selected video'}</Text> : null}
        <Text style={styles.pickerStatus}>{pickerStatus}</Text>
        <View style={{ height: 14 }} />
        <PrimaryButton label="Upload and analyze" onPress={() => uploadMutation.mutate()} loading={uploadMutation.isPending} disabled={!asset || !activeProfileId} />
      </GlassCard>

      <GlassCard>
        <Text style={styles.blockTitle}>Upload target</Text>
        <Text style={styles.assetText}>Athlete: {athletesQuery.data?.[0]?.name ?? 'None yet'}</Text>
        <Text style={styles.assetText}>Profile: {profilesQuery.data?.[0] ? `${profilesQuery.data[0].sport} • ${profilesQuery.data[0].level}` : 'Create a profile first'}</Text>
      </GlassCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  copy: { color: colors.textMuted, lineHeight: 22 },
  assetText: { color: colors.text, marginTop: 12 },
  pickerStatus: { color: colors.textMuted, marginTop: 10, lineHeight: 18 },
  blockTitle: { color: colors.text, fontSize: 18, fontWeight: '800', marginBottom: 8 },
});
