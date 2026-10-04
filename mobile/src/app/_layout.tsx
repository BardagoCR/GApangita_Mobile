import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from '@/src/features/auth/AuthContext';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#F3F4EC' } }}>
          <Stack.Screen name="claims/[itemCode]" options={{ headerShown: true, title: 'Claim item' }} />
        </Stack>
      </AuthProvider>
    </SafeAreaProvider>
  );
}