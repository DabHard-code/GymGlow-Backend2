import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Screen } from '@/components/screen';
import { SectionTitle } from '@/components/section-title';
import { GlassCard } from '@/components/glass-card';
import { PrimaryButton } from '@/components/primary-button';
import { AthleteRow } from '@/components/athlete-row';
import { apiFetch, apiPost } from '@/lib/api';
import type { Athlete, SportProfile } from '@/lib/types';
import { colors } from '@/theme/colors';

export default function AthletesTab() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const athletesQuery = useQuery({
    queryKey: ['athletes'],
    queryFn: () => apiFetch<Athlete[]>('/api/athletes'),
  });

  const profileQueries = useQueries({
    queries: (athletesQuery.data ?? []).map((athlete) => ({
      queryKey: ['profiles', athlete.id],
      queryFn: () => apiFetch<SportProfile[]>(`/api/athletes/${athlete.id}/profiles`),
    })),
  });

  const addAthlete = useMutation({
    mutationFn: () => apiPost('/api/athletes', { name }),
    onSuccess: async () => {
      setName('');
      setOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['athletes'] });
    },
  });

  const profilesByAthlete = useMemo(
    () =>
      Object.fromEntries((athletesQuery.data ?? []).map((athlete, index) => [athlete.id, profileQueries[index]?.data ?? []])),
    [athletesQuery.data, profileQueries],
  );

  return (
    <Screen>
      <SectionTitle title="Athletes" subtitle="Keep private athlete profiles organized and ready for upload." />
      <GlassCard style={{ marginBottom: 16 }}>
        <Text style={styles.copy}>Add an athlete, open their card, and create the sport profile that uploads and analysis will use.</Text>
        <View style={{ marginTop: 14 }}>
          <PrimaryButton label="Add athlete" onPress={() => setOpen(true)} />
        </View>
      </GlassCard>

      {(athletesQuery.data ?? []).map((athlete) => (
        <AthleteRow key={athlete.id} athlete={athlete} profiles={profilesByAthlete[athlete.id]} />
      ))}

      <Modal visible={open} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Add athlete</Text>
            <TextInput
              placeholder="Private athlete name"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              value={name}
              onChangeText={setName}
            />
            <Text style={styles.helper}>This name stays inside your account.</Text>
            <PrimaryButton label="Save athlete" onPress={() => addAthlete.mutate()} loading={addAthlete.isPending} disabled={!name.trim()} />
            <View style={{ height: 12 }} />
            <PrimaryButton label="Cancel" onPress={() => setOpen(false)} variant="ghost" />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  copy: { color: colors.textMuted, lineHeight: 22 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#0E1727',
    padding: 20,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: { color: colors.text, fontSize: 22, fontWeight: '800', marginBottom: 14 },
  helper: { color: colors.textMuted, marginBottom: 12, lineHeight: 18 },
  input: {
    backgroundColor: colors.backgroundAlt,
    color: colors.text,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
});
