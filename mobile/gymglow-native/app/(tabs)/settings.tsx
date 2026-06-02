import { Alert, Linking, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/screen';
import { GlassCard } from '@/components/glass-card';
import { PrimaryButton } from '@/components/primary-button';
import { PlanPickerModal } from '@/components/plan-picker-modal';
import { SectionTitle } from '@/components/section-title';
import { useMe } from '@/hooks/use-me';
import { apiDelete, apiPatch, apiPost } from '@/lib/api';
import { signOut } from '@/lib/auth';
import { config } from '@/lib/config';
import { formatPlan } from '@/lib/format';
import type { UserMe } from '@/lib/types';
import { colors } from '@/theme/colors';

export default function SettingsTab() {
  const { data: me } = useMe();
  const queryClient = useQueryClient();
  const [displayName, setDisplayName] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [supportMessage, setSupportMessage] = useState('');
  const [supportType, setSupportType] = useState<'bug' | 'feature' | 'question' | 'safety' | 'ai_feedback'>('question');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [planPickerOpen, setPlanPickerOpen] = useState(false);

  const saveName = useMutation({
    mutationFn: () => apiPatch<UserMe>('/api/users/me', { displayName }),
    onSuccess: async () => {
      setEditOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['me'] });
    },
    onError: (error: any) => Alert.alert('Could not save name', error?.message ?? 'Please try again.'),
  });

  const submitSupport = useMutation({
    mutationFn: () => apiPost('/api/support-reports', { type: supportType, message: supportMessage, context: { source: 'native_settings' } }),
    onSuccess: () => {
      setSupportMessage('');
      setSupportOpen(false);
      Alert.alert('Sent', 'Thanks. Your message was saved for support review.');
    },
    onError: (error: any) => Alert.alert('Could not send report', error?.message ?? 'Please try again.'),
  });

  const deleteAccount = useMutation({
    mutationFn: () => apiDelete('/api/users/me', { confirmation: deleteConfirmation }),
    onSuccess: async () => {
      await signOut();
      router.replace('/(auth)/sign-in');
    },
    onError: (error: any) => Alert.alert('Could not delete account', error?.message ?? 'Please try again.'),
  });

  function openNameEditor() {
    setDisplayName(me?.displayName || 'GymGlow Parent');
    setEditOpen(true);
  }

  async function handleLogout() {
    try {
      await signOut();
      router.replace('/(auth)/sign-in');
    } catch (error: any) {
      Alert.alert('Logout failed', error?.message ?? 'Please try again.');
    }
  }

  async function openWebPage(path: string) {
    try {
      await Linking.openURL(`${config.apiBaseUrl}${path}`);
    } catch (error: any) {
      Alert.alert('Could not open link', error?.message ?? 'Please try again.');
    }
  }

  return (
    <Screen>
      <SectionTitle title="Settings" subtitle="Account details, plan status, and session controls." />

      <GlassCard style={styles.accountCard}>
        <View style={styles.accountIcon}>
          <Ionicons name="person" size={24} color={colors.text} />
        </View>
        <Text style={styles.accountTitle}>{me?.displayName || 'GymGlow Parent'}</Text>
        <Text style={styles.accountSubtitle}>Your private parent or coach workspace.</Text>
        <View style={styles.buttonSpacer} />
        <PrimaryButton label="Edit display name" onPress={openNameEditor} variant="secondary" />
      </GlassCard>

      <GlassCard style={styles.detailsCard}>
        <View style={styles.row}>
          <Text style={styles.label}>Plan</Text>
          <Text style={styles.value}>{formatPlan(me?.plan)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Trial credits</Text>
          <Text style={styles.value}>{me?.trialCredits ?? '-'}</Text>
        </View>
        <View style={styles.rowLast}>
          <Text style={styles.label}>Status</Text>
          <Text style={styles.value}>{formatStatus(me?.subscriptionStatus)}</Text>
        </View>
        <View style={styles.buttonSpacer} />
        <PrimaryButton label={me?.plan === 'none' ? 'Choose a plan' : 'Manage plan'} onPress={() => setPlanPickerOpen(true)} variant="secondary" />
      </GlassCard>

      <GlassCard style={styles.detailsCard}>
        <Text style={styles.blockTitle}>Privacy & support</Text>
        <SettingsAction
          icon="shield-checkmark"
          title="Privacy policy"
          copy="How GymGlow collects, protects, and deletes account data."
          onPress={() => openWebPage('/privacy')}
        />
        <SettingsAction
          icon="document-text"
          title="Terms"
          copy="Rules for using GymGlow and AI coaching feedback."
          onPress={() => openWebPage('/terms')}
        />
        <SettingsAction
          icon="options"
          title="Privacy choices"
          copy="Request data access or deletion outside the app."
          onPress={() => openWebPage('/privacy-choices')}
        />
        <SettingsAction icon="chatbubble-ellipses" title="Contact support" copy="Report a bug, safety concern, or AI feedback issue." onPress={() => setSupportOpen(true)} />
        <SettingsAction icon="trash" title="Delete account" copy="Remove your account and GymGlow data." danger onPress={() => setDeleteOpen(true)} />
      </GlassCard>

      <PrimaryButton label="Log out" onPress={handleLogout} variant="ghost" />

      <Modal visible={editOpen} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Edit display name</Text>
            <Text style={styles.modalCopy}>This is only shown inside your private account.</Text>
            <TextInput style={styles.input} value={displayName} onChangeText={setDisplayName} placeholder="GymGlow Parent" placeholderTextColor={colors.textMuted} />
            <PrimaryButton label="Save" onPress={() => saveName.mutate()} loading={saveName.isPending} />
            <View style={styles.modalButtonSpacer} />
            <PrimaryButton label="Cancel" onPress={() => setEditOpen(false)} variant="ghost" />
          </View>
        </View>
      </Modal>

      <Modal visible={supportOpen} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Contact support</Text>
            <View style={styles.typeRow}>
              {(['question', 'bug', 'safety', 'ai_feedback'] as const).map((type) => (
                <Pressable key={type} onPress={() => setSupportType(type)} style={[styles.typePill, supportType === type && styles.typePillActive]}>
                  <Text style={styles.typeText}>{type.replace('_', ' ')}</Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              style={[styles.input, styles.messageInput]}
              value={supportMessage}
              onChangeText={setSupportMessage}
              placeholder="What should we know?"
              placeholderTextColor={colors.textMuted}
              multiline
            />
            <PrimaryButton label="Send" onPress={() => submitSupport.mutate()} loading={submitSupport.isPending} disabled={!supportMessage.trim()} />
            <View style={styles.modalButtonSpacer} />
            <PrimaryButton label="Cancel" onPress={() => setSupportOpen(false)} variant="ghost" />
          </View>
        </View>
      </Modal>

      <Modal visible={deleteOpen} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Delete account</Text>
            <Text style={styles.modalCopy}>This removes your GymGlow account data. Type DELETE MY ACCOUNT to confirm.</Text>
            <TextInput style={styles.input} value={deleteConfirmation} onChangeText={setDeleteConfirmation} placeholder="DELETE MY ACCOUNT" placeholderTextColor={colors.textMuted} autoCapitalize="characters" />
            <PrimaryButton label="Delete my account" onPress={() => deleteAccount.mutate()} loading={deleteAccount.isPending} disabled={deleteConfirmation !== 'DELETE MY ACCOUNT'} />
            <View style={styles.modalButtonSpacer} />
            <PrimaryButton label="Cancel" onPress={() => setDeleteOpen(false)} variant="ghost" />
          </View>
        </View>
      </Modal>

      <PlanPickerModal visible={planPickerOpen} onClose={() => setPlanPickerOpen(false)} />
    </Screen>
  );
}

function formatStatus(status?: string) {
  if (!status) return 'Not subscribed';
  return status.replace(/_/g, ' ');
}

function SettingsAction({ icon, title, copy, onPress, danger }: { icon: keyof typeof Ionicons.glyphMap; title: string; copy: string; onPress?: () => void; danger?: boolean }) {
  return (
    <Pressable disabled={!onPress} onPress={onPress} style={({ pressed }) => [styles.actionRow, pressed && styles.pressed]}>
      <View style={[styles.actionIcon, danger && styles.dangerIcon]}>
        <Ionicons name={icon} size={18} color={danger ? colors.danger : colors.text} />
      </View>
      <View style={styles.actionCopyColumn}>
        <Text style={[styles.actionTitle, danger && styles.dangerText]}>{title}</Text>
        <Text style={styles.actionCopy}>{copy}</Text>
      </View>
      {onPress ? <Ionicons name="chevron-forward" size={19} color={colors.textMuted} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  accountCard: { marginBottom: 16, alignItems: 'center' },
  detailsCard: { marginBottom: 16 },
  buttonSpacer: { height: 14 },
  modalButtonSpacer: { height: 10 },
  accountIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: 'rgba(34,211,238,0.14)',
    borderWidth: 1,
    borderColor: colors.white16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  accountTitle: { color: colors.text, fontSize: 22, fontWeight: '900', textAlign: 'center' },
  accountSubtitle: { color: colors.textMuted, marginTop: 6, textAlign: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  rowLast: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12 },
  label: { color: colors.textMuted },
  value: { color: colors.text, fontWeight: '900', textTransform: 'capitalize' },
  blockTitle: { color: colors.text, fontSize: 18, fontWeight: '900', marginBottom: 12 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  actionIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.white10, alignItems: 'center', justifyContent: 'center' },
  dangerIcon: { backgroundColor: 'rgba(251,113,133,0.13)' },
  actionTitle: { color: colors.text, fontWeight: '900', fontSize: 16 },
  dangerText: { color: colors.danger },
  actionCopyColumn: { flex: 1 },
  actionCopy: { color: colors.textMuted, marginTop: 3, lineHeight: 18 },
  pressed: { opacity: 0.72 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.62)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#0E1727', padding: 20, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, borderColor: colors.border },
  modalTitle: { color: colors.text, fontSize: 24, fontWeight: '900', marginBottom: 8 },
  modalCopy: { color: colors.textMuted, lineHeight: 20, marginBottom: 14 },
  input: { backgroundColor: colors.backgroundAlt, color: colors.text, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1, borderColor: colors.border, marginBottom: 12 },
  messageInput: { minHeight: 120, textAlignVertical: 'top' },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  typePill: { paddingHorizontal: 11, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white10 },
  typePillActive: { borderColor: 'rgba(236,72,153,0.72)', backgroundColor: 'rgba(236,72,153,0.16)' },
  typeText: { color: colors.text, fontWeight: '800', textTransform: 'capitalize', fontSize: 12 },
});
