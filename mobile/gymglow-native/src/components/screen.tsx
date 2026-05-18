import { PropsWithChildren } from 'react';
import { ScrollView, ScrollViewProps, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/theme/colors';

type ScreenProps = PropsWithChildren<ScrollViewProps & { padded?: boolean }>;

export function Screen({ children, padded = true, contentContainerStyle, ...props }: ScreenProps) {
  return (
    <LinearGradient colors={[colors.background, '#0B1530', '#0E1B2B']} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          {...props}
          style={styles.scroll}
          contentContainerStyle={[
            padded && styles.content,
            contentContainerStyle,
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View>{children}</View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safeArea: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 120 },
});
