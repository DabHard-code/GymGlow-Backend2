import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/theme/colors';

type Props = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
};

export function PrimaryButton({ label, onPress, loading, variant = 'primary', disabled }: Props) {
  const isGhost = variant === 'ghost';
  const isSecondary = variant === 'secondary';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        isGhost ? styles.ghost : isSecondary ? styles.secondary : styles.primary,
        (disabled || loading) && styles.disabled,
        pressed && !disabled && !loading && styles.pressed,
      ]}
    >
      {isGhost || isSecondary ? (
        loading ? (
          <ActivityIndicator color={isGhost ? colors.text : '#fff'} />
        ) : (
          <Text style={[styles.label, isGhost && styles.ghostLabel]}>{label}</Text>
        )
      ) : (
        <LinearGradient colors={[colors.primary, colors.primaryDeep]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradient}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.label}>{label}</Text>}
        </LinearGradient>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 54,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  primary: {
    backgroundColor: colors.primaryDeep,
  },
  secondary: {
    backgroundColor: colors.cardSoft,
    borderWidth: 1,
    borderColor: colors.white16,
    paddingHorizontal: 20,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.white16,
    paddingHorizontal: 20,
  },
  gradient: { minHeight: 54, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, width: '100%' },
  disabled: { opacity: 0.6 },
  pressed: { transform: [{ scale: 0.98 }] },
  label: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },
  ghostLabel: { color: colors.text },
});
