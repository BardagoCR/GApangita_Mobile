import { useAppDialog } from '@/src/components/AppDialog';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionButton, Field, Heading, Notice, Page, TAB_BAR_CONTENT_PADDING } from '@/src/components/ui';
import { useAuth } from '@/src/features/auth/AuthContext';
import { restoreItem } from '@/src/services/api/gapangita';
import { colors } from '@/src/theme/colors';

export default function RestoreItemScreen() {
  const { confirm, notify, dialog } = useAppDialog();
  const { itemCode, itemName } = useLocalSearchParams<{ itemCode: string; itemName?: string }>();
  const { user, isLoading: authLoading } = useAuth();
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleRestore() {
    if (loading) return;
    if (reason.trim().length < 8) { setError('Enter a reason of at least 8 characters.'); return; }
    setError('');
    setLoading(true);
    try {
      if (!await confirm({ title: 'Restore this item?', message: 'This starts a new three-week listing period. Claim history and evidence will be kept. Your reason will be saved in the restore history.', confirmLabel: 'Restore item', tone: 'warning' })) return;
      await restoreItem(itemCode, reason.trim());
      await notify({ title: 'Item restored', message: 'This item is active in the listings again. Its claim history has been preserved.', tone: 'success' });
      router.replace('/staff/archive');
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not restore this item.');
    } finally { setLoading(false); }
  }

  if (authLoading || !user || !['Admin', 'Staff'].includes(user.user_role)) {
    return <Page>{dialog}<SafeAreaView edges={['top']} style={styles.gate}><Notice tone="error">Sign in with staff access to restore archived records.</Notice></SafeAreaView></Page>;
  }

  return (
    <Page>{dialog}
      <SafeAreaView edges={['top', 'bottom']} style={styles.safe}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <Text onPress={() => router.back()} style={styles.back}><Ionicons name="arrow-back" size={18} color={colors.maroon} />  Archived items</Text>
            <Text style={styles.kicker}>RESTORE RECORD</Text>
            <Heading>{itemName || 'Restore item'}</Heading>
            <Notice>Restore an expired item for another three weeks. Claim history and evidence are retained. Approved or returned items cannot be restored.</Notice>
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
  content: { padding: 18, paddingBottom: TAB_BAR_CONTENT_PADDING, gap: 15 },
  back: { color: colors.maroon, fontWeight: '800', fontSize: 13 },
  kicker: { color: colors.coral, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
});