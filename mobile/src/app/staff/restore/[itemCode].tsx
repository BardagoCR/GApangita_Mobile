import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionButton, Field, Heading, Notice, Page } from '@/src/components/ui';
import { useAuth } from '@/src/features/auth/AuthContext';
import { restoreItem } from '@/src/services/api/gapangita';
import { colors } from '@/src/theme/colors';

export default function RestoreItemScreen() {
  const { itemCode, itemName } = useLocalSearchParams<{ itemCode: string; itemName?: string }>();
  const { user, isLoading: authLoading } = useAuth();
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleRestore() {
    if (reason.trim().length < 8) { setError('Enter a reason of at least 8 characters.'); return; }
    setError('');
    setLoading(true);
    try {
      await restoreItem(itemCode, reason.trim());
      Alert.alert('Item restored', 'This item is active in the open listings again.', [{ text: 'Done', onPress: () => router.replace('/staff/archive') }]);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not restore this item.');
    } finally { setLoading(false); }
  }

  if (authLoading || !user || !['Admin', 'Staff'].includes(user.user_role)) {
    return <Page><SafeAreaView edges={['top']} style={styles.gate}><Notice tone="error">Sign in with staff access to restore archived records.</Notice></SafeAreaView></Page>;
  }

  return (
    <Page>
      <SafeAreaView edges={['top', 'bottom']} style={styles.safe}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <Text onPress={() => router.back()} style={styles.back}><Ionicons name="arrow-back" size={18} color={colors.maroon} />  Archived items</Text>
            <Text style={styles.kicker}>RESTORE RECORD</Text>
            <Heading>{itemName || 'Restore item'}</Heading>
            <Notice>The item will return to the active listings. Add a reason to keep a history record.</Notice>
            {error ? <Notice tone="error">{error}</Notice> : null}
            <Field label="Reason · at least 8 characters" value={reason} onChangeText={setReason} placeholder="Why is this item being restored?" multiline />
            <ActionButton title="Restore item" onPress={() => void handleRestore()} loading={loading} disabled={reason.trim().length < 8} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Page>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  gate: { flex: 1, padding: 20, justifyContent: 'center' },
  content: { padding: 18, gap: 15 },
  back: { color: colors.maroon, fontWeight: '800', fontSize: 13 },
  kicker: { color: colors.coral, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
});