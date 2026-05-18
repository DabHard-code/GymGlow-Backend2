import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
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
      {loading ? (
        <ActivityIndicator color={isGhost ? colors.text : '#fff'} />
      ) : (
        <Text style={[styles.label, isGhost && styles.ghostLabel]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.cardSoft,
    borderWidth: 1,
    borderColor: colors.white16,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.white16,
  },
  disabled: { opacity: 0.6 },
  pressed: { transform: [{ scale: 0.98 }] },
  label: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  ghostLabel: { color: colors.text },
});
