import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useSession } from '@/providers/session-provider';
import { colors } from '@/theme/colors';

export default function IndexScreen() {
  const { session, loading } = useSession();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.secondary} />
      </View>
    );
  }

  return <Redirect href={session ? '/(tabs)' : '/(auth)/sign-in'} />;
}
