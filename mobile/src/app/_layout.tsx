import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { initialWindowMetrics, SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from '@/src/features/auth/AuthContext';

export const unstable_settings = { initialRouteName: '(tabs)' };

export default function RootLayout() {
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <AuthProvider>
        <StatusBar style="dark" />
        <Stack initialRouteName="(tabs)" screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#F3F4EC' } }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="claims/[itemCode]" options={{ headerShown: true, title: 'Claim item' }} />
          <Stack.Screen name="staff/claims" options={{ headerShown: true, title: 'Claim queue' }} />
          <Stack.Screen name="staff/claims/[itemCode]" options={{ headerShown: true, title: 'Claim details' }} />
        </Stack>
      </AuthProvider>
    </SafeAreaProvider>
  );
}