import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryProvider } from '@/providers/query-provider';
import { SessionProvider } from '@/providers/session-provider';

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
            headerTitleStyle: { fontWeight: '800' },
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="athletes/[id]" options={{ title: 'Athlete' }} />
        </Stack>
      </QueryProvider>
    </SessionProvider>
  );
}
