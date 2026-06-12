import { Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { GlassCard } from '@/components/glass-card';
import { Screen } from '@/components/screen';
import { SectionTitle } from '@/components/section-title';
import { PrimaryButton } from '@/components/primary-button';
import { PlanPickerModal } from '@/components/plan-picker-modal';
import { apiFetch } from '@/lib/api';
import type { Athlete } from '@/lib/types';
import { colors } from '@/theme/colors';
import { useState } from 'react';

export default function MoreTab() {
  const [meetPickerOpen, setMeetPickerOpen] = useState(false);
  const [planPickerOpen, setPlanPickerOpen] = useState(false);
  const athletesQuery = useQuery({
    queryKey: ['athletes'],
    queryFn: () => apiFetch<Athlete[]>('/api/athletes'),
  });

  function openMeetTracker() {
    const athletes = athletesQuery.data ?? [];
    if (athletes.length === 1) {
      router.push({ pathname: '/meets/[athleteId]', params: { athleteId: athletes[0].id } });
      return;
    }
    if (!athletes.length && !athletesQuery.isLoading) {
      Alert.alert('Add an athlete first', 'Meet scores are saved to an athlete profile.');
      return;
    }
    setMeetPickerOpen(true);
  }

  return (
    <Screen>
      <SectionTitle title="More" subtitle="Plans, badges, meet scores, settings, and support." />
      <GlassCard style={styles.card}>
        <MoreRow icon="card" title="Plans & subscriptions" copy="View Coach Mode and Competition Mode or restore purchases." onPress={() => setPlanPickerOpen(true)} />
        <MoreRow icon="ribbon" title="Badges" copy="Review earned milestones and progress across each athlete." onPress={() => router.push('/(tabs)/badges')} />
        <MoreRow icon="clipboard" title="Meet Tracker" copy="Save meet scores, placements, seasons, and all-around totals." onPress={openMeetTracker} />
        <MoreRow icon="settings" title="Settings" copy="Account, privacy, support, and logout." onPress={() => router.push('/(tabs)/settings')} />
      </GlassCard>

      <Modal visible={meetPickerOpen} animationType="slide" transparent onRequestClose={() => setMeetPickerOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Choose athlete</Text>
            <Text style={styles.modalCopy}>Meet scores are saved per athlete.</Text>
            {(athletesQuery.data ?? []).map((athlete) => (
              <Pressable
                key={athlete.id}
                onPress={() => {
                  setMeetPickerOpen(false);
                  router.push({ pathname: '/meets/[athleteId]', params: { athleteId: athlete.id } });
                }}
                style={({ pressed }) => [styles.athleteRow, pressed && styles.pressed]}
              >
                <View style={styles.icon}>
                  <Text style={styles.initial}>{(athlete.name || 'A').slice(0, 1).toUpperCase()}</Text>
                </View>
                <View style={styles.body}>
                  <Text style={styles.title}>{athlete.name}</Text>
                  <Text style={styles.copy}>{athlete.publicDisplayName ? `Alias: ${athlete.publicDisplayName}` : 'Private profile'}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </Pressable>
            ))}
            <View style={styles.modalSpacer} />
            <PrimaryButton label="Cancel" onPress={() => setMeetPickerOpen(false)} variant="ghost" />
          </View>
        </View>
      </Modal>
      <PlanPickerModal visible={planPickerOpen} onClose={() => setPlanPickerOpen(false)} />
    </Screen>
  );
}

function MoreRow({ icon, title, copy, onPress }: { icon: keyof typeof Ionicons.glyphMap; title: string; copy: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={styles.icon}>
        <Ionicons name={icon} size={20} color={colors.text} />
      </View>
      <View style={styles.body}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.copy}>{copy}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  icon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.white10, alignItems: 'center', justifyContent: 'center' },
  initial: { color: colors.text, fontWeight: '900' },
  body: { flex: 1 },
  title: { color: colors.text, fontSize: 16, fontWeight: '900' },
  copy: { color: colors.textMuted, marginTop: 3, lineHeight: 18 },
  pressed: { opacity: 0.72 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.62)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#0E1727', padding: 20, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, borderColor: colors.border },
  modalTitle: { color: colors.text, fontSize: 24, fontWeight: '900', marginBottom: 8 },
  modalCopy: { color: colors.textMuted, lineHeight: 20, marginBottom: 14 },
  athleteRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  modalSpacer: { height: 12 },
});
