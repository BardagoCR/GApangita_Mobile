import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Notice, Page } from '@/src/components/ui';
import { useAuth } from '@/src/features/auth/AuthContext';
import { getClaimQueue } from '@/src/services/api/gapangita';
import type { Claim } from '@/src/types/api';
import { colors } from '@/src/theme/colors';

export default function ClaimsQueueScreen() {
  const { user, isLoading } = useAuth();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const isStaff = Boolean(user && ['Admin', 'Staff'].includes(user.user_role));

  useEffect(() => {
    if (!isStaff) return;
    let cancelled = false;
    getClaimQueue()
      .then((result) => { if (!cancelled) setClaims(result.claims); })
      .catch((reason: Error) => { if (!cancelled) setError(reason.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [isStaff]);

  if (isLoading || !isStaff) {
    return <Page><SafeAreaView edges={['top']} style={styles.gate}><Notice tone="error">Sign in with staff access to review claims.</Notice></SafeAreaView></Page>;
  }

  return (
    <Page>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <FlatList
          data={claims}
          keyExtractor={(claim) => claim.claimed_item_id.toString()}
          contentContainerStyle={styles.content}
          ListHeaderComponent={
            <View style={styles.header}>
              <Text onPress={() => router.back()} style={styles.back}><Ionicons name="arrow-back" size={17} color={colors.maroon} /> Account</Text>
              <Text style={styles.kicker}>STAFF REVIEW</Text>
              <Text style={styles.title}>Claim queue</Text>
              <Text style={styles.subtitle}>Review claimant identity, item ownership evidence, and staff notes.</Text>
              {error ? <Notice tone="error">{error}</Notice> : null}
              {loading ? <ActivityIndicator color={colors.maroon} /> : null}
              {!loading && !claims.length && !error ? <Notice>No claims are awaiting review.</Notice> : null}
            </View>
          }
          renderItem={({ item }) => (
            <Pressable accessibilityRole="button" onPress={() => router.push(`/staff/claims/${encodeURIComponent(item.item_code)}` as never)} style={styles.row}>
              <View style={styles.icon}><Ionicons name="shield-checkmark-outline" size={22} color={colors.maroon} /></View>
              <View style={styles.body}>
                <Text style={styles.name}>{item.claimer_first_name} {item.claimer_last_name}</Text>
                <Text style={styles.item}>Item {item.item_code}</Text>
                <Text style={styles.date}>Claimed {item.date_claimed}</Text>
              </View>
              <View style={[styles.status, item.status === 'Rejected' && styles.rejected, item.status === 'Approved' && styles.approved]}>
                <Text style={styles.statusText}>{item.status}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </Pressable>
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      </SafeAreaView>
    </Page>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 }, gate: { flex: 1, padding: 20, justifyContent: 'center' }, content: { paddingHorizontal: 18, paddingBottom: 25 },
  header: { gap: 10, paddingBottom: 18 }, back: { color: colors.maroon, fontSize: 13, fontWeight: '800', paddingVertical: 5 },
  kicker: { color: colors.coral, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 }, title: { color: colors.ink, fontSize: 27, fontWeight: '900' },
  subtitle: { color: colors.muted, fontSize: 13, lineHeight: 19 }, row: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.white, borderRadius: 12, padding: 13, borderWidth: 1, borderColor: colors.line },
  icon: { width: 42, height: 42, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.maroonLight }, body: { flex: 1, gap: 3 },
  name: { color: colors.ink, fontSize: 14, fontWeight: '800' }, item: { color: colors.muted, fontSize: 11 }, date: { color: colors.muted, fontSize: 10 },
  status: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6, backgroundColor: colors.maroonLight }, rejected: { backgroundColor: '#F8E6E1' }, approved: { backgroundColor: '#E1F1E7' },
  statusText: { color: colors.maroonDark, fontSize: 9, fontWeight: '800' }, separator: { height: 9 },
});
