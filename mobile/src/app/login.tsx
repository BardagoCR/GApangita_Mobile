import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionButton, Eyebrow, Field, Heading, Notice, Page, TAB_BAR_CONTENT_PADDING } from '@/src/components/ui';
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
      const destination = returnTo && (returnTo.startsWith('/(tabs)/') || returnTo.startsWith('/staff/'))
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
        <Pressable
          onPress={() => router.back()}
          style={styles.back}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={10}
        >
          
          <Ionicons name="arrow-back" size={18} color={colors.maroon} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          
          <View style={styles.brandRow}>
            <View style={styles.mark}>
              <Ionicons name="key" size={23} color={colors.maroonDark} />
            </View>
            <Eyebrow>STAFF ACCESS</Eyebrow>
          </View> 
            <Heading>Welcome back!</Heading>
            <Text style={styles.copy}>Sign in to report an item or manage campus records. Claims are submitted while signed out.</Text>
            {error ? <Notice tone="error">{error}</Notice> : null}
            <Field label="Username" value={username} onChangeText={setUsername} placeholder="e.g. jdelacruz" />
            <Field label="Password" value={password} onChangeText={setPassword} placeholder="At least 8 characters" secureTextEntry />
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
  content: {
    justifyContent: 'center',
    padding: 22,
    paddingTop: 56,
    paddingBottom: TAB_BAR_CONTENT_PADDING,
    gap: 16,
  },
  back: {
    position: 'absolute',
    top: 12,
    left: 22,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backText: {
    color: colors.maroon,
    fontWeight: '800',
    fontSize: 13,
  },
  mark: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: colors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
  },

  brandRow: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 12,
  },
  copy: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: -7,
  },
});