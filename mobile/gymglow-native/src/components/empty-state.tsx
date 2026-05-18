import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme/colors';

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    padding: 24,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardSoft,
    alignItems: 'center',
  },
  title: { color: colors.text, fontSize: 16, fontWeight: '700' },
  description: { color: colors.textMuted, textAlign: 'center', marginTop: 8, lineHeight: 20 },
});
