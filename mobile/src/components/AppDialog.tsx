import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionButton } from '@/src/components/ui';
import { colors } from '@/src/theme/colors';

type DialogOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  tone?: 'default' | 'warning' | 'success' | 'error';
};
type ActiveDialog = DialogOptions & { confirmation: boolean };

/** Cancel/back/unmount never authorizes an action. Only the primary button does. */
export function useAppDialog() {
  const [active, setActive] = useState<ActiveDialog | null>(null);
  const pending = useRef<((confirmed: boolean) => void) | null>(null);
  useEffect(() => () => { pending.current?.(false); pending.current = null; }, []);

  const open = useCallback((options: DialogOptions, confirmation: boolean) => {
    if (pending.current) return Promise.resolve(false);
    Keyboard.dismiss();
    return new Promise<boolean>((resolve) => {
      pending.current = resolve;
      setActive({ ...options, confirmation });
    });
  }, []);
  const close = useCallback((confirmed: boolean) => {
    const resolve = pending.current;
    pending.current = null;
    setActive(null);
    resolve?.(confirmed);
  }, []);
  const confirm = useCallback((options: DialogOptions) => open(options, true), [open]);
  const notify = useCallback((options: DialogOptions) => open(options, false), [open]);
  const icon = active?.tone === 'success' ? 'checkmark-circle-outline'
    : active?.tone === 'error' ? 'alert-circle-outline'
      : active?.tone === 'warning' ? 'warning-outline' : 'shield-checkmark-outline';

  const dialog = (
    <Modal visible={Boolean(active)} transparent animationType="fade" onRequestClose={() => close(false)}>
      <SafeAreaView style={styles.backdrop}>
        {active ? <View accessibilityViewIsModal style={styles.card}>
          <View style={styles.accent} />
          <ScrollView contentContainerStyle={styles.content} bounces={false}>
            <View style={styles.icon}><Ionicons name={icon} size={29} color={colors.maroon} /></View>
            <Text style={styles.kicker}>{active.confirmation ? 'PLEASE CONFIRM' : active.tone === 'success' ? 'ALL SET' : 'GAPANGITA'}</Text>
            <Text accessibilityRole="header" style={styles.title}>{active.title}</Text>
            <Text style={styles.message}>{active.message}</Text>
            <View style={styles.actions}>
              <ActionButton title={active.confirmLabel || (active.confirmation ? 'Confirm' : 'Done')} onPress={() => close(true)} />
              {active.confirmation ? <ActionButton title="Cancel" variant="secondary" onPress={() => close(false)} /> : null}
            </View>
          </ScrollView>
        </View> : null}
      </SafeAreaView>
    </Modal>
  );
  return { confirm, notify, dialog };
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(23,40,34,0.58)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 420, maxHeight: '90%', backgroundColor: colors.paper, borderRadius: 22, overflow: 'hidden', borderWidth: 1, borderColor: colors.line },
  accent: { height: 7, backgroundColor: colors.maroon },
  content: { padding: 24, gap: 12 },
  icon: { width: 58, height: 58, borderRadius: 18, backgroundColor: colors.maroonLight, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  kicker: { color: colors.maroon, fontSize: 10, fontWeight: '900', letterSpacing: 1.8 },
  title: { color: colors.ink, fontSize: 23, fontWeight: '800' },
  message: { color: colors.muted, fontSize: 14, lineHeight: 22 },
  actions: { gap: 10, marginTop: 10 },
});
