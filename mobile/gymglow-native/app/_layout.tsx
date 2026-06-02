import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LogBox } from 'react-native';
import { QueryProvider } from '@/providers/query-provider';
import { SessionProvider } from '@/providers/session-provider';

LogBox.ignoreLogs([
  '[RevenueCat]',
  'Purchase was cancelled',
  'There is an issue with your configuration',
  'There\'s a problem with your configuration',
]);

export default function RootLayout() {
  return (
    <SessionProvider>
      <QueryProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            animation: 'slide_from_right',
            contentStyle: { backgroundColor: '#07111F' },
            headerStyle: { backgroundColor: '#07111F' },
            headerTintColor: '#F8FAFC',
            headerShadowVisible: false,
            headerBackTitle: '',
            headerBackButtonDisplayMode: 'minimal',
            headerTitleStyle: { fontWeight: '800' },
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)/sign-in" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)/sign-up" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="athletes/[id]" options={{ title: 'Athlete' }} />
          <Stack.Screen name="meets/[athleteId]" options={{ title: 'Meet Tracker', headerBackTitle: 'More' }} />
          <Stack.Screen name="sessions/[id]" options={{ title: 'Analysis' }} />
          <Stack.Screen name="analyses/[id]" options={{ title: 'Analysis' }} />
          <Stack.Screen name="challenges/[id]" options={{ title: 'Challenge' }} />
          <Stack.Screen name="submissions/[id]" options={{ title: 'Challenge Result' }} />
        </Stack>
      </QueryProvider>
    </SessionProvider>
  );
}
