import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { GlassCard } from './glass-card';
import type { Athlete, SportProfile } from '@/lib/types';
import { colors } from '@/theme/colors';

export function AthleteRow({ athlete, profiles = [] }: { athlete: Athlete; profiles?: SportProfile[] }) {
  const initials = athlete.name.slice(0, 2).toUpperCase();

  return (
    <Pressable onPress={() => router.push({ pathname: '/(tabs)/athletes/[id]', params: { id: athlete.id } })}>
      <GlassCard style={styles.card}>
        <View style={styles.row}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.body}>
            <Text style={styles.name}>{athlete.name}</Text>
            {athlete.publicDisplayName ? <Text style={styles.alias}>Leaderboard: {athlete.publicDisplayName}</Text> : null}
            <Text style={styles.subtext}>
              {profiles.length
                ? profiles.map((profile) => `${profile.sport} - ${profile.level}`).join('  |  ')
                : 'No sport profiles yet'}
            </Text>
          </View>
          <View style={styles.chevron}>
            <Ionicons name="chevron-forward" size={18} color={colors.text} />
          </View>
        </View>
      </GlassCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(236,72,153,0.22)',
    borderWidth: 1,
    borderColor: colors.white16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.text, fontWeight: '900' },
  body: { flex: 1, minWidth: 0 },
  name: { color: colors.text, fontSize: 17, fontWeight: '900' },
  alias: { color: colors.secondary, marginTop: 3, fontSize: 12, fontWeight: '800' },
  subtext: { color: colors.textMuted, marginTop: 5, fontSize: 13, lineHeight: 18 },
  chevron: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.white10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
