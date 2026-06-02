import { Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { PrimaryButton } from '@/components/primary-button';
import { PurchaseCancelledError, restorePlanPurchases, startPlanCheckout, type PaidPlan } from '@/lib/billing';
import { colors } from '@/theme/colors';

export function PlanPickerModal({ visible, onClose, message }: { visible: boolean; onClose: () => void; message?: string }) {
  const [loadingPlan, setLoadingPlan] = useState<PaidPlan | null>(null);
  const [restoring, setRestoring] = useState(false);
  const queryClient = useQueryClient();

  async function startCheckout(plan: PaidPlan) {
    try {
      setLoadingPlan(plan);
      await startPlanCheckout(plan);
      await queryClient.invalidateQueries({ queryKey: ['me'] });
      onClose();
    } catch (error: any) {
      if (error instanceof PurchaseCancelledError) return;
      Alert.alert('Could not open checkout', error?.message ?? 'Please try again.');
    } finally {
      setLoadingPlan(null);
    }
  }

  async function restorePurchases() {
    try {
      setRestoring(true);
      const result = await restorePlanPurchases();
      await queryClient.invalidateQueries({ queryKey: ['me'] });
      Alert.alert('Purchases restored', result.plan === 'none' ? 'No active GymGlow subscription was found.' : 'Your GymGlow plan is active again.');
      onClose();
    } catch (error: any) {
      Alert.alert('Could not restore purchases', error?.message ?? 'Please try again.');
    } finally {
      setRestoring(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.heroIcon}>
            <Ionicons name="sparkles" size={26} color={colors.text} />
          </View>
          <Text style={styles.title}>Choose a plan to continue</Text>
          <Text style={styles.copy}>
            {message ?? 'You used the starter upload. Pick a GymGlow plan to keep getting AI analysis, progress tracking, and badges.'}
          </Text>

          <PlanCard
            title="Coach Mode"
            price="$9.99/mo"
            copy="AI analysis, athlete progress, meet score tracking, and badges."
            icon="barbell"
            loading={loadingPlan === 'coach'}
            disabled={loadingPlan !== null}
            onPress={() => startCheckout('coach')}
          />
          <PlanCard
            title="Competition Mode"
            price="$19.99/mo"
            copy="Everything in Coach plus weekly challenges, leaderboard competition, spotlight eligibility, and Crimson badges."
            icon="trophy"
            loading={loadingPlan === 'competition'}
            disabled={loadingPlan !== null}
            onPress={() => startCheckout('competition')}
          />

          <View style={styles.cancelWrap}>
            <PrimaryButton label={restoring ? 'Restoring...' : 'Restore purchases'} onPress={restorePurchases} variant="ghost" disabled={loadingPlan !== null || restoring} />
            <PrimaryButton label="Not now" onPress={onClose} variant="ghost" disabled={loadingPlan !== null || restoring} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function PlanCard({
  title,
  price,
  copy,
  icon,
  loading,
  disabled,
  onPress,
}: {
  title: string;
  price: string;
  copy: string;
  icon: keyof typeof Ionicons.glyphMap;
  loading: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.planCard, pressed && styles.pressed, disabled && styles.disabled]}>
      <View style={styles.planIcon}>
        <Ionicons name={icon} size={21} color={colors.secondary} />
      </View>
      <View style={styles.planCopy}>
        <Text style={styles.planTitle}>{title}</Text>
        <Text style={styles.planDescription}>{copy}</Text>
      </View>
      <View style={styles.pricePill}>
        <Text style={styles.priceText}>{loading ? 'Opening...' : price}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.68)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#0E1727', padding: 20, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, borderColor: colors.border },
  heroIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: 'rgba(236,72,153,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(236,72,153,0.46)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: { color: colors.text, fontSize: 24, fontWeight: '900', marginBottom: 8 },
  copy: { color: colors.textMuted, lineHeight: 21, marginBottom: 14 },
  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 13,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white10,
    marginTop: 10,
  },
  planIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(34,211,238,0.12)', alignItems: 'center', justifyContent: 'center' },
  planCopy: { flex: 1 },
  planTitle: { color: colors.text, fontSize: 16, fontWeight: '900' },
  planDescription: { color: colors.textMuted, lineHeight: 18, marginTop: 4, fontSize: 12 },
  pricePill: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 999, backgroundColor: 'rgba(236,72,153,0.18)', borderWidth: 1, borderColor: 'rgba(236,72,153,0.38)' },
  priceText: { color: colors.text, fontSize: 12, fontWeight: '900' },
  cancelWrap: { marginTop: 14 },
  pressed: { opacity: 0.72 },
  disabled: { opacity: 0.7 },
});
