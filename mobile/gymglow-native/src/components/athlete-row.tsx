import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { GlassCard } from './glass-card';
import type { Athlete, SportProfile } from '@/lib/types';
import { colors } from '@/theme/colors';

export function AthleteRow({ athlete, profiles = [] }: { athlete: Athlete; profiles?: SportProfile[] }) {
  return (
    <Pressable onPress={() => router.push(`/athletes/${athlete.id}`)}>
      <GlassCard style={styles.card}>
        <View style={styles.row}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{athlete.name.slice(0, 2).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{athlete.name}</Text>
            <Text style={styles.subtext}>
              {profiles.length
                ? profiles.map((profile) => `${profile.sport} • ${profile.level}`).join(' · ')
                : 'No sport profiles yet'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </View>
      </GlassCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(124,58,237,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.text, fontWeight: '800' },
  name: { color: colors.text, fontSize: 16, fontWeight: '800' },
  subtext: { color: colors.textMuted, marginTop: 4, fontSize: 13 },
});
