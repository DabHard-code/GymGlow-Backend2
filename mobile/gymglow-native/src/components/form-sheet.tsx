import { PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardScrollView } from './keyboard-scroll-view';

export function FormSheet({ children }: PropsWithChildren) {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <KeyboardScrollView automaticallyAdjustKeyboardInsets={false} style={styles.scroll} contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: Math.max(insets.bottom, 16) }}>
        <View>{children}</View>
      </KeyboardScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.65)', paddingHorizontal: 16 },
  scroll: { flexGrow: 0, flexShrink: 1 },
});
