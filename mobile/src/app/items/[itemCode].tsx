import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionButton, Notice, Page, TAB_BAR_CONTENT_PADDING } from '@/src/components/ui';
import { request } from '@/src/services/api/client';
import type { Item } from '@/src/types/api';
import { useAuth } from '@/src/features/auth/AuthContext';
import { colors } from '@/src/theme/colors';

export default function ItemDetailsScreen() {
  const { user, isLoading: authLoading, authError, refreshAuth } = useAuth();
  const { itemCode } = useLocalSearchParams<{ itemCode: string }>();
  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    void request<Item>(`/items/${encodeURIComponent(itemCode)}`)
      .then((result) => { if (!cancelled) setItem(result); })
      .catch((reason: Error) => { if (!cancelled) setError(reason.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [itemCode]);

  const statusLabel = item?.status === 'Available'
    ? 'Available'
    : item?.status === 'Under Verification'
      ? 'Under verification'
      : item?.status === 'Contact Staff'
        ? 'Contact staff'
        : item?.status === 'Unavailable'
          ? 'Unavailable'
          : 'Closed';

  return (
    <Page>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text onPress={() => router.back()} style={styles.back}><Ionicons name="arrow-back" size={18} color={colors.maroon} /> Back to listings</Text>
          {loading ? <ActivityIndicator color={colors.maroon} style={styles.loader} /> : null}
          {error ? <Notice tone="error">{error}</Notice> : null}
          {authError ? <><Notice tone="error">{authError}</Notice><ActionButton title="Retry session check" onPress={() => void refreshAuth()} disabled={authLoading} /></> : null}
          {item ? (
            <View style={styles.details}>
              <View style={[styles.badge, item.item_type === 'found' ? styles.found : styles.lost]}>
                <Text style={styles.badgeText}>{item.item_type.toUpperCase()} ITEM</Text>
              </View>
              <Text style={styles.status}>{statusLabel}</Text>
              <Text style={styles.itemCode}>REFERENCE {item.item_code}</Text>
              <View style={styles.rule} />
              <DetailRow icon="pricetag-outline" label="Category" value={item.categoryName || 'Not specified'} />
              <DetailRow icon="color-filter-outline" label="Public color" value={item.public_color || 'Not specified'} />
              <DetailRow icon="location-outline" label="Campus" value={item.branchName || 'Not specified'} />
              <DetailRow icon="calendar-outline" label="Reported" value={item.date_found ? item.date_found.slice(0, 10) : 'Not specified'} />
              <Notice>Private item details and original photos are available only to authorized staff.</Notice>
              <ActionButton
                title={user ? 'Sign out to claim' : authLoading || authError ? 'Session check required' : item.can_claim ? 'This is mine · Start a claim' : 'Claim unavailable'}
                disabled={!item.can_claim || !!user || authLoading || !!authError}
                onPress={() => router.push(`/claims/${encodeURIComponent(item.item_code)}` as never)}
              />
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </Page>
  );
}

function DetailRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailIcon}><Ionicons name={icon} size={17} color={colors.maroon} /></View>
      <View style={styles.detailText}><Text style={styles.detailLabel}>{label}</Text><Text style={styles.detailValue}>{value}</Text></View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 18, paddingBottom: TAB_BAR_CONTENT_PADDING, gap: 15 },
  back: { color: colors.maroon, fontSize: 13, fontWeight: '800', paddingVertical: 5 },
  loader: { padding: 30 },
  details: { gap: 14, backgroundColor: colors.white, borderRadius: 14, borderWidth: 1, borderColor: colors.line, padding: 17 },
  badge: { alignSelf: 'flex-start', borderRadius: 5, paddingHorizontal: 9, paddingVertical: 5 },
  found: { backgroundColor: colors.maroonLight },
  lost: { backgroundColor: '#F8E5D7' },
  badgeText: { color: colors.maroonDark, fontSize: 10, fontWeight: '900' },
  status: { color: colors.maroon, fontSize: 16, fontWeight: '900' },
  rule: { height: 1, backgroundColor: colors.line },
  detailRow: { flexDirection: 'row', gap: 11, alignItems: 'center' },
  detailIcon: { width: 34, height: 34, borderRadius: 9, backgroundColor: colors.maroonLight, alignItems: 'center', justifyContent: 'center' },
  detailText: { flex: 1, gap: 3 },
  detailLabel: { color: colors.muted, fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  detailValue: { color: colors.ink, fontSize: 13, fontWeight: '600' },
  itemCode: { color: colors.muted, fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
});