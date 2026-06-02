import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PrimaryButton } from './primary-button';
import { colors } from '@/theme/colors';

type Props = {
  title: string;
  description: string;
  icon?: keyof typeof Ionicons.glyphMap;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ title, description, icon = 'sparkles', actionLabel, onAction }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.icon}>
        <Ionicons name={icon} size={24} color={colors.text} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {actionLabel && onAction ? (
        <View style={styles.action}>
          <PrimaryButton label={actionLabel} onPress={onAction} variant="secondary" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    padding: 22,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardSoft,
    alignItems: 'center',
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(34,211,238,0.16)',
    borderWidth: 1,
    borderColor: colors.white16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: { color: colors.text, fontSize: 17, fontWeight: '900', textAlign: 'center' },
  description: { color: colors.textMuted, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  action: { alignSelf: 'stretch', marginTop: 16 },
});
