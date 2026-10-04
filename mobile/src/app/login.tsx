import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionButton, Eyebrow, Field, Heading, Notice, Page } from '@/src/components/ui';
import { useAuth } from '@/src/features/auth/AuthContext';
import { colors } from '@/src/theme/colors';

export default function LoginScreen() {
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const { signIn } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setError('');
    setLoading(true);
    try {
      await signIn(username, password);
      const destination = returnTo && (returnTo.startsWith('/(tabs)/') || returnTo.startsWith('/staff/') || returnTo.startsWith('/claims/'))
        ? returnTo
        : '/(tabs)/account';
      router.replace(destination as never);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to sign in.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Page>
      <SafeAreaView edges={['top', 'bottom']} style={styles.safe}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <Text onPress={() => router.back()} style={styles.back}><Ionicons name="arrow-back" size={18} color={colors.maroon} />  Back</Text>
            <View style={styles.mark}><Ionicons name="key" size={23} color={colors.maroonDark} /></View>
            <Eyebrow>STAFF ACCESS</Eyebrow>
            <Heading>Welcome back.</Heading>
            <Text style={styles.copy}>Sign in to report an item, submit a claim, or manage campus records.</Text>
            {error ? <Notice tone="error">{error}</Notice> : null}
            <Field label="Username" value={username} onChangeText={setUsername} placeholder="Your username" />
            <Field label="Password" value={password} onChangeText={setPassword} placeholder="Your password" secureTextEntry />
            <ActionButton title="Sign in" onPress={handleLogin} disabled={!username.trim() || !password} loading={loading} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Page>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', padding: 22, gap: 16 },
  back: { color: colors.maroon, fontWeight: '800', fontSize: 13, marginBottom: 24 },
  mark: { width: 54, height: 54, borderRadius: 16, backgroundColor: colors.yellow, alignItems: 'center', justifyContent: 'center' },
  copy: { color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: -7 },
});