import { ScrollView, ScrollViewProps } from 'react-native';

// iOS adjusts the scroll viewport and scrolls the focused input into view.
// Android uses windowSoftInputMode=adjustResize (app.json).
export function KeyboardScrollView(props: ScrollViewProps) {
  return <ScrollView automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" {...props} />;
}
