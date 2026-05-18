import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme/colors';

export function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 16, marginTop: 8 },
  title: { color: colors.text, fontSize: 24, fontWeight: '900', letterSpacing: 0 },
  subtitle: { color: colors.textMuted, marginTop: 6, fontSize: 14, lineHeight: 21 },
});
