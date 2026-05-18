import { PropsWithChildren } from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';
import { BlurView } from 'expo-blur';
import { colors } from '@/theme/colors';

type Props = PropsWithChildren<ViewProps>;

export function GlassCard({ children, style, ...props }: Props) {
  return (
    <View style={[styles.outer, style]} {...props}>
      <BlurView intensity={20} tint="dark" style={styles.inner}>
        {children}
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  inner: {
    padding: 18,
  },
});
