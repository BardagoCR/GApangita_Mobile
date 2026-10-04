import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionButton, Notice, Page } from '@/src/components/ui';
import { imageUrl, request } from '@/src/services/api/client';
import type { Item } from '@/src/types/api';
import { colors } from '@/src/theme/colors';

export default function ItemDetailsScreen() {
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

  const photo = imageUrl(item?.item_file_path);

  return (
    <Page>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text onPress={() => router.back()} style={styles.back}><Ionicons name="arrow-back" size={18} color={colors.maroon} />  Back to listings</Text>
          {loading ? <ActivityIndicator color={colors.maroon} style={styles.loader} /> : null}
          {error ? <Notice tone="error">{error}</Notice> : null}
          {item ? (
            <>
              {photo ? <Image source={{ uri: photo }} style={styles.image} /> : <View style={styles.imageFallback}><Ionicons name="cube-outline" size={48} color={colors.maroon} /><Text style={styles.fallbackText}>No item photo</Text></View>}
              <View style={styles.details}>
                <View style={[styles.badge, item.item_type === 'found' ? styles.found : styles.lost]}>
                  <Text style={styles.badgeText}>{item.item_type.toUpperCase()} ITEM</Text>
                </View>
                <Text style={styles.title}>{item.name}</Text>
                <Text style={styles.description}>{item.description || 'No description provided.'}</Text>
                <View style={styles.rule} />
                <DetailRow icon="pricetag-outline" label="Category" value={item.categoryName || 'Not specified'} />
                <DetailRow icon="location-outline" label="Found at" value={[item.locationName, item.branchName].filter(Boolean).join(', ') || 'Not specified'} />
                <DetailRow icon="calendar-outline" label="Date reported" value={item.date_found || item.date_reported || 'Not specified'} />
                <Text style={styles.itemCode}>REFERENCE  {item.item_code}</Text>
                <ActionButton title="This is mine · Start a claim" onPress={() => router.push(`/claims/${encodeURIComponent(item.item_code)}` as never)} />
              </View>
            </>
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
  content: { padding: 18, gap: 15 },
  back: { color: colors.maroon, fontSize: 13, fontWeight: '800', paddingVertical: 5 },
  loader: { padding: 30 },
  image: { width: '100%', height: 245, borderRadius: 14, backgroundColor: colors.maroonLight },
  imageFallback: { height: 245, borderRadius: 14, alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.maroonLight },
  fallbackText: { color: colors.maroon, fontSize: 12, fontWeight: '700' },
  details: { gap: 14, backgroundColor: colors.white, borderRadius: 14, borderWidth: 1, borderColor: colors.line, padding: 17 },
  badge: { alignSelf: 'flex-start', borderRadius: 5, paddingHorizontal: 9, paddingVertical: 5 },
  found: { backgroundColor: colors.maroonLight },
  lost: { backgroundColor: '#F8E5D7' },
  badgeText: { color: colors.maroonDark, fontSize: 10, fontWeight: '900' },
  title: { color: colors.ink, fontSize: 26, lineHeight: 31, fontWeight: '900' },
  description: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  rule: { height: 1, backgroundColor: colors.line },
  detailRow: { flexDirection: 'row', gap: 11, alignItems: 'center' },
  detailIcon: { width: 34, height: 34, borderRadius: 9, backgroundColor: colors.maroonLight, alignItems: 'center', justifyContent: 'center' },
  detailText: { flex: 1, gap: 3 },
  detailLabel: { color: colors.muted, fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  detailValue: { color: colors.ink, fontSize: 13, fontWeight: '600' },
  itemCode: { color: colors.muted, fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
});