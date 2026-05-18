import { Redirect, Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { useSession } from '@/providers/session-provider';

export default function TabsLayout() {
  const { session, loading } = useSession();

  if (!loading && !session) {
    return <Redirect href='/(auth)/sign-in' />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: '#07111F' },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: '900' },
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: '#0A1222',
          borderTopColor: 'rgba(255,255,255,0.08)',
          height: 84,
          paddingTop: 10,
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} /> }} />
      <Tabs.Screen name="athletes" options={{ title: 'Athletes', tabBarIcon: ({ color, size }) => <Ionicons name="people" color={color} size={size} /> }} />
      <Tabs.Screen name="upload" options={{ title: 'Upload', tabBarIcon: ({ color, size }) => <Ionicons name="cloud-upload" color={color} size={size} /> }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: ({ color, size }) => <Ionicons name="settings" color={color} size={size} /> }} />
    </Tabs>
  );
}
