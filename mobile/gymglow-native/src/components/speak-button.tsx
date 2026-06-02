import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { colors } from '@/theme/colors';

type Props = {
  label?: string;
  text: string;
};

export function SpeakButton({ label = 'Phone readout', text }: Props) {
  const [speaking, setSpeaking] = useState(false);
  const cleanText = useMemo(() => text.replace(/\s+/g, ' ').trim(), [text]);

  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, []);

  async function toggleSpeech() {
    if (!cleanText) return;
    const alreadySpeaking = await Speech.isSpeakingAsync();
    if (alreadySpeaking || speaking) {
      Speech.stop();
      setSpeaking(false);
      return;
    }

    setSpeaking(true);
    Speech.speak(cleanText, {
      language: 'en-US',
      rate: 0.92,
      pitch: 1.02,
      onDone: () => setSpeaking(false),
      onStopped: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    });
  }

  return (
    <Pressable onPress={toggleSpeech} disabled={!cleanText} style={({ pressed }) => [styles.button, pressed && styles.pressed, !cleanText && styles.disabled]}>
      <Ionicons name={speaking ? 'stop-circle' : 'volume-high'} size={17} color={colors.text} />
      <Text style={styles.label}>{speaking ? 'Stop' : label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: 'rgba(236,72,153,0.18)',
    borderWidth: 1,
    borderColor: colors.white16,
  },
  label: { color: colors.text, fontWeight: '900', fontSize: 13 },
  pressed: { opacity: 0.72 },
  disabled: { opacity: 0.45 },
});
