import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EmptyState } from '@/components/empty-state';
import { GlassCard } from '@/components/glass-card';
import { PrimaryButton } from '@/components/primary-button';
import { Screen } from '@/components/screen';
import { SectionTitle } from '@/components/section-title';
import { apiDelete, apiFetch, apiPatch, apiPost, apiPut } from '@/lib/api';
import type { Athlete, MeetWithScores, Season } from '@/lib/types';
import { colors } from '@/theme/colors';
import { useLocalSearchParams } from 'expo-router';

type EventKey = 'vault' | 'bars' | 'beam' | 'floor' | 'all_around';

const events: { key: EventKey; label: string }[] = [
  { key: 'vault', label: 'Vault' },
  { key: 'bars', label: 'Bars' },
  { key: 'beam', label: 'Beam' },
  { key: 'floor', label: 'Floor' },
  { key: 'all_around', label: 'All-around' },
];

const emptyMeets: MeetWithScores[] = [];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function defaultSeasonName() {
  return `${new Date().getFullYear()} Season`;
}

export default function MeetTrackerScreen() {
  const { athleteId } = useLocalSearchParams<{ athleteId: string }>();
  const queryClient = useQueryClient();
  const [seasonOpen, setSeasonOpen] = useState(false);
  const [meetOpen, setMeetOpen] = useState(false);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);
  const [seasonName, setSeasonName] = useState(defaultSeasonName());
  const [seasonYear, setSeasonYear] = useState(String(new Date().getFullYear()));
  const [meetName, setMeetName] = useState('');
  const [meetDate, setMeetDate] = useState(today());
  const [meetLocation, setMeetLocation] = useState('');
  const [editingMeetId, setEditingMeetId] = useState<string | null>(null);
  const [scores, setScores] = useState<Record<EventKey, { score: string; placement: string }>>({
    vault: { score: '', placement: '' },
    bars: { score: '', placement: '' },
    beam: { score: '', placement: '' },
    floor: { score: '', placement: '' },
    all_around: { score: '', placement: '' },
  });

  const athleteQuery = useQuery({
    queryKey: ['athlete', athleteId],
    enabled: !!athleteId,
    queryFn: () => apiFetch<Athlete>(`/api/athletes/${athleteId}`),
  });

  const seasonsQuery = useQuery({
    queryKey: ['seasons', athleteId],
    enabled: !!athleteId,
    queryFn: () => apiFetch<Season[]>(`/api/athletes/${athleteId}/seasons`),
  });

  const seasons = seasonsQuery.data ?? [];
  const selectedSeason = seasons.find((season) => season.id === selectedSeasonId) ?? seasons[0] ?? null;

  const meetsQuery = useQuery({
    queryKey: ['meets', selectedSeason?.id],
    enabled: !!selectedSeason?.id,
    queryFn: () => apiFetch<MeetWithScores[]>(`/api/seasons/${selectedSeason!.id}/meets`),
  });

  const addSeason = useMutation({
    mutationFn: () =>
      apiPost<Season>(`/api/athletes/${athleteId}/seasons`, {
        name: seasonName.trim(),
        year: Number(seasonYear) || new Date().getFullYear(),
      }),
    onSuccess: async (season) => {
      setSeasonOpen(false);
      setSeasonName(defaultSeasonName());
      setSeasonYear(String(new Date().getFullYear()));
      setSelectedSeasonId(season.id);
      await queryClient.invalidateQueries({ queryKey: ['seasons', athleteId] });
    },
    onError: (error: any) => Alert.alert('Could not add season', error?.message ?? 'Please try again.'),
  });

  const saveMeet = useMutation({
    mutationFn: async () => {
      if (!selectedSeason) throw new Error('Create a season first.');
      const meetPayload = {
        name: meetName.trim(),
        meetDate,
        location: meetLocation.trim() || undefined,
      };
      const meet = editingMeetId
        ? await apiPatch<MeetWithScores>(`/api/meets/${editingMeetId}`, meetPayload)
        : await apiPost<MeetWithScores>(`/api/seasons/${selectedSeason.id}/meets`, meetPayload);

      const rows = events
        .map((event) => ({
          category: event.key,
          score: scores[event.key].score.trim() || undefined,
          placement: scores[event.key].placement.trim() || undefined,
        }))
        .filter((row) => row.score || row.placement);

      if (editingMeetId) {
        await apiPut(`/api/meets/${editingMeetId}/scores`, { scores: rows });
      } else if (rows.length) {
        await apiPost(`/api/meets/${meet.id}/scores`, { scores: rows });
      }

      return meet;
    },
    onSuccess: async () => {
      setMeetOpen(false);
      resetMeetForm();
      await queryClient.invalidateQueries({ queryKey: ['meets', selectedSeason?.id] });
    },
    onError: (error: any) => Alert.alert('Could not save meet', error?.message ?? 'Please try again.'),
  });

  const deleteSeason = useMutation({
    mutationFn: (seasonId: string) => apiDelete(`/api/seasons/${seasonId}`),
    onSuccess: async () => {
      setSelectedSeasonId(null);
      await queryClient.invalidateQueries({ queryKey: ['seasons', athleteId] });
    },
    onError: (error: any) => Alert.alert('Could not delete season', error?.message ?? 'Please try again.'),
  });

  const deleteMeet = useMutation({
    mutationFn: (meetId: string) => apiDelete(`/api/meets/${meetId}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['meets', selectedSeason?.id] });
    },
    onError: (error: any) => Alert.alert('Could not delete meet', error?.message ?? 'Please try again.'),
  });

  const meets = meetsQuery.data ?? emptyMeets;
  const bestAllAround = useMemo(() => {
    const values = meets.map((meet) => Number(scoreFor(meet, 'all_around') || calculatedAllAround(meet))).filter((value) => Number.isFinite(value) && value > 0);
    return values.length ? Math.max(...values).toFixed(3) : '-';
  }, [meets]);
  const bestEvents = useMemo(() => bestScoresByEvent(meets), [meets]);

  function openMeetForm() {
    if (!selectedSeason) {
      setSeasonOpen(true);
      return;
    }
    resetMeetForm();
    setMeetOpen(true);
  }

  function openEditMeetForm(meet: MeetWithScores) {
    setEditingMeetId(meet.id);
    setMeetName(meet.name);
    setMeetDate(formatDateInput(meet.meetDate));
    setMeetLocation(meet.location ?? '');
    setScores(events.reduce(
      (next, event) => {
        next[event.key] = {
          score: scoreFor(meet, event.key),
          placement: String(placementFor(meet, event.key) ?? ''),
        };
        return next;
      },
      {} as Record<EventKey, { score: string; placement: string }>,
    ));
    setMeetOpen(true);
  }

  function resetMeetForm() {
    setEditingMeetId(null);
    setMeetName('');
    setMeetDate(today());
    setMeetLocation('');
    setScores({
      vault: { score: '', placement: '' },
      bars: { score: '', placement: '' },
      beam: { score: '', placement: '' },
      floor: { score: '', placement: '' },
      all_around: { score: '', placement: '' },
    });
  }

  function confirmDeleteSeason(season: Season) {
    Alert.alert('Delete season?', `This deletes "${season.name}" and all meet scores in that season.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteSeason.mutate(season.id) },
    ]);
  }

  function confirmDeleteMeet(meet: MeetWithScores) {
    Alert.alert('Delete meet?', `This deletes "${meet.name}" and its saved scores.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMeet.mutate(meet.id) },
    ]);
  }

  return (
    <Screen>
      <SectionTitle title="Meet Tracker" subtitle={athleteQuery.data ? `Save meet scores for ${athleteQuery.data.name}.` : 'Save meet scores by athlete.'} />

      <GlassCard style={styles.heroCard}>
        <View style={styles.heroIcon}>
          <Ionicons name="trophy" size={28} color={colors.text} />
        </View>
        <Text style={styles.heroTitle}>Competition history</Text>
        <Text style={styles.heroCopy}>Track meet dates, event scores, placements, and all-around totals in one place.</Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryValue}>{seasons.length}</Text>
            <Text style={styles.summaryLabel}>Seasons</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryValue}>{meets.length}</Text>
            <Text style={styles.summaryLabel}>Meets</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryValue}>{bestAllAround}</Text>
            <Text style={styles.summaryLabel}>Best AA</Text>
          </View>
        </View>
      </GlassCard>

      <GlassCard style={styles.card}>
        <Text style={styles.blockTitle}>Season</Text>
        {seasonsQuery.isLoading ? <LoadingLine label="Loading seasons..." /> : null}
        <View style={styles.seasonStack}>
          {seasons.map((season) => {
            const active = season.id === selectedSeason?.id;
            return (
              <Pressable key={season.id} onPress={() => setSelectedSeasonId(season.id)} style={[styles.seasonPill, active && styles.seasonPillActive]}>
                <View style={styles.seasonCopy}>
                  <Text style={[styles.seasonText, active && styles.seasonTextActive]}>{season.name}</Text>
                  <Text style={styles.seasonYear}>{season.year}</Text>
                </View>
                <Pressable
                  onPress={() => confirmDeleteSeason(season)}
                  disabled={deleteSeason.isPending}
                  style={({ pressed }) => [styles.smallDelete, pressed && styles.pressed, deleteSeason.isPending && styles.disabled]}
                >
                  <Ionicons name="trash" size={14} color={colors.danger} />
                </Pressable>
              </Pressable>
            );
          })}
        </View>
        {!seasonsQuery.isLoading && !seasons.length ? (
          <EmptyState icon="calendar" title="No seasons yet" description="Create a season first, then add meet scores." />
        ) : null}
        <View style={styles.buttonSpacer} />
        <PrimaryButton label={seasons.length ? 'Add season' : 'Add first season'} onPress={() => setSeasonOpen(true)} variant={seasons.length ? 'secondary' : 'primary'} />
      </GlassCard>

      <GlassCard style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={styles.blockTitle}>Meets</Text>
          {meetsQuery.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
        </View>
        {!selectedSeason ? <Text style={styles.muted}>Create a season to start adding meets.</Text> : null}
        {selectedSeason && !meetsQuery.isLoading && !meets.length ? <Text style={styles.muted}>No meets recorded for this season yet.</Text> : null}
        {meets.map((meet) => (
          <MeetCard key={meet.id} meet={meet} onEdit={() => openEditMeetForm(meet)} onDelete={() => confirmDeleteMeet(meet)} deleting={deleteMeet.isPending} />
        ))}
        <View style={styles.buttonSpacer} />
        <PrimaryButton label="Add meet score" onPress={openMeetForm} />
      </GlassCard>

      {meets.length ? (
        <GlassCard style={styles.card}>
          <Text style={styles.blockTitle}>Best by event</Text>
          <View style={styles.bestGrid}>
            {events.slice(0, 4).map((event) => (
              <View key={event.key} style={styles.bestBox}>
                <Text style={styles.eventLabel}>{event.label}</Text>
                <Text style={styles.eventScore}>{bestEvents[event.key] || '-'}</Text>
              </View>
            ))}
          </View>
        </GlassCard>
      ) : null}

      <Modal visible={seasonOpen} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Add season</Text>
            <Text style={styles.inputLabel}>Season name</Text>
            <TextInput style={styles.input} value={seasonName} onChangeText={setSeasonName} placeholder="2026 Season" placeholderTextColor={colors.textMuted} />
            <Text style={styles.inputLabel}>Year</Text>
            <TextInput style={styles.input} value={seasonYear} onChangeText={setSeasonYear} keyboardType="number-pad" placeholder="2026" placeholderTextColor={colors.textMuted} />
            <PrimaryButton label="Save season" onPress={() => addSeason.mutate()} loading={addSeason.isPending} disabled={!seasonName.trim()} />
            <View style={styles.modalSpacer} />
            <PrimaryButton label="Cancel" onPress={() => setSeasonOpen(false)} variant="ghost" />
          </View>
        </View>
      </Modal>

      <Modal visible={meetOpen} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Add meet score</Text>
            <Text style={styles.inputLabel}>Meet name</Text>
            <TextInput style={styles.input} value={meetName} onChangeText={setMeetName} placeholder="State Qualifier" placeholderTextColor={colors.textMuted} />
            <Text style={styles.inputLabel}>Date</Text>
            <TextInput style={styles.input} value={meetDate} onChangeText={setMeetDate} placeholder="YYYY-MM-DD" placeholderTextColor={colors.textMuted} />
            <Text style={styles.inputLabel}>Location</Text>
            <TextInput style={styles.input} value={meetLocation} onChangeText={setMeetLocation} placeholder="Optional" placeholderTextColor={colors.textMuted} />
            <View style={styles.scoreGrid}>
              {events.map((event) => (
                <View key={event.key} style={styles.scoreRow}>
                  <Text style={styles.scoreEvent}>{event.label}</Text>
                  <TextInput
                    style={[styles.input, styles.scoreInput]}
                    value={scores[event.key].score}
                    onChangeText={(value) => setScores((current) => ({ ...current, [event.key]: { ...current[event.key], score: value } }))}
                    keyboardType="decimal-pad"
                    placeholder="Score"
                    placeholderTextColor={colors.textMuted}
                  />
                  <TextInput
                    style={[styles.input, styles.placeInput]}
                    value={scores[event.key].placement}
                    onChangeText={(value) => setScores((current) => ({ ...current, [event.key]: { ...current[event.key], placement: value } }))}
                    keyboardType="number-pad"
                    placeholder="#"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              ))}
            </View>
            <PrimaryButton
              label={editingMeetId ? 'Save changes' : 'Save meet'}
              onPress={() => saveMeet.mutate()}
              loading={saveMeet.isPending}
              disabled={!meetName.trim()}
            />
            <View style={styles.modalSpacer} />
            <PrimaryButton
              label="Cancel"
              onPress={() => {
                setMeetOpen(false);
                resetMeetForm();
              }}
              variant="ghost"
            />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

function MeetCard({ meet, onEdit, onDelete, deleting }: { meet: MeetWithScores; onEdit: () => void; onDelete: () => void; deleting: boolean }) {
  const allAround = scoreFor(meet, 'all_around') || calculatedAllAround(meet);

  return (
    <View style={styles.meetCard}>
      <View style={styles.meetHeader}>
        <View style={styles.meetIcon}>
          <Ionicons name="medal" size={18} color={colors.warning} />
        </View>
        <View style={styles.meetTitleWrap}>
          <Text style={styles.meetName}>{meet.name}</Text>
          <Text style={styles.meetMeta}>
            {formatDate(meet.meetDate)}
            {meet.location ? ` - ${meet.location}` : ''}
          </Text>
        </View>
        {allAround ? (
          <View style={styles.aaBox}>
            <Text style={styles.aaScore}>{allAround}</Text>
            <Text style={styles.aaLabel}>AA</Text>
          </View>
        ) : null}
        <Pressable onPress={onEdit} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
          <Ionicons name="create-outline" size={16} color={colors.secondary} />
        </Pressable>
        <Pressable onPress={onDelete} disabled={deleting} style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed, deleting && styles.disabled]}>
          <Ionicons name="trash" size={16} color={colors.danger} />
        </Pressable>
      </View>
      <View style={styles.eventGrid}>
        {events.slice(0, 4).map((event) => (
          <View key={event.key} style={styles.eventBox}>
            <Text style={styles.eventLabel}>{event.label}</Text>
            <Text style={styles.eventScore}>{scoreFor(meet, event.key) || '-'}</Text>
            {placementFor(meet, event.key) ? <Text style={styles.eventPlace}>#{placementFor(meet, event.key)}</Text> : null}
          </View>
        ))}
      </View>
    </View>
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

function scoreFor(meet: MeetWithScores, category: EventKey) {
  return meet.scores.find((score) => score.category === category)?.score ?? '';
}

function placementFor(meet: MeetWithScores, category: EventKey) {
  return meet.scores.find((score) => score.category === category)?.placement ?? null;
}

function calculatedAllAround(meet: MeetWithScores) {
  const total = (['vault', 'bars', 'beam', 'floor'] as EventKey[]).reduce((sum, key) => {
    const value = Number(scoreFor(meet, key));
    return Number.isFinite(value) ? sum + value : sum;
  }, 0);
  return total > 0 ? total.toFixed(3) : '';
}

function bestScoresByEvent(meets: MeetWithScores[]) {
  return events.reduce(
    (best, event) => {
      const values = meets.map((meet) => Number(scoreFor(meet, event.key))).filter((value) => Number.isFinite(value) && value > 0);
      best[event.key] = values.length ? Math.max(...values).toFixed(3) : '';
      return best;
    },
    {} as Record<EventKey, string>,
  );
}

function formatDate(value: string | Date) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateInput(value: string | Date) {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return today();
  return date.toISOString().slice(0, 10);
}

const styles = StyleSheet.create({
  heroCard: { marginBottom: 16 },
  heroIcon: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: 'rgba(251,191,36,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.34)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  heroTitle: { color: colors.text, fontSize: 26, fontWeight: '900', marginBottom: 8 },
  heroCopy: { color: colors.textMuted, lineHeight: 22 },
  summaryRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  summaryBox: { flex: 1, borderRadius: 16, backgroundColor: colors.white10, padding: 12, borderWidth: 1, borderColor: colors.border },
  summaryValue: { color: colors.text, fontSize: 20, fontWeight: '900' },
  summaryLabel: { color: colors.textMuted, marginTop: 2, fontSize: 12 },
  card: { marginBottom: 16 },
  blockTitle: { color: colors.text, fontSize: 18, fontWeight: '900', marginBottom: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  muted: { color: colors.textMuted, lineHeight: 21 },
  loadingLine: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  seasonStack: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  seasonPill: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white10 },
  seasonPillActive: { borderColor: 'rgba(236,72,153,0.72)', backgroundColor: 'rgba(236,72,153,0.16)' },
  seasonCopy: { flex: 1 },
  seasonText: { color: colors.text, fontWeight: '900' },
  seasonTextActive: { color: colors.text },
  seasonYear: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  buttonSpacer: { height: 14 },
  meetCard: { paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  meetHeader: { flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 12 },
  meetIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(251,191,36,0.12)', alignItems: 'center', justifyContent: 'center' },
  meetTitleWrap: { flex: 1 },
  meetName: { color: colors.text, fontSize: 16, fontWeight: '900' },
  meetMeta: { color: colors.textMuted, marginTop: 3, fontSize: 12 },
  aaBox: { alignItems: 'center', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 14, backgroundColor: 'rgba(34,211,238,0.12)', borderWidth: 1, borderColor: 'rgba(34,211,238,0.22)' },
  aaScore: { color: colors.secondary, fontWeight: '900' },
  aaLabel: { color: colors.textMuted, fontSize: 10, fontWeight: '900' },
  eventGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  eventBox: { flexBasis: '47%', flexGrow: 1, padding: 10, borderRadius: 14, backgroundColor: colors.white10, borderWidth: 1, borderColor: colors.border },
  eventLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '800' },
  eventScore: { color: colors.text, fontSize: 18, fontWeight: '900', marginTop: 2 },
  eventPlace: { color: colors.warning, fontSize: 11, fontWeight: '900', marginTop: 2 },
  bestGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  bestBox: { flexBasis: '47%', flexGrow: 1, padding: 12, borderRadius: 16, backgroundColor: colors.white10, borderWidth: 1, borderColor: colors.border },
  deleteButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(251,113,133,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(251,113,133,0.24)',
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(34,211,238,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.24)',
  },
  smallDelete: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(251,113,133,0.12)',
  },
  disabled: { opacity: 0.5 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.62)', justifyContent: 'flex-end' },
  modalSheet: { maxHeight: '92%', backgroundColor: '#0E1727', padding: 20, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, borderColor: colors.border },
  modalTitle: { color: colors.text, fontSize: 24, fontWeight: '900', marginBottom: 14 },
  inputLabel: { color: colors.text, fontWeight: '900', marginBottom: 7 },
  input: { backgroundColor: colors.backgroundAlt, color: colors.text, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: colors.border, marginBottom: 12 },
  modalSpacer: { height: 10 },
  scoreGrid: { marginBottom: 4 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  scoreEvent: { color: colors.text, fontWeight: '900', width: 88 },
  scoreInput: { flex: 1 },
  placeInput: { width: 72 },
});
