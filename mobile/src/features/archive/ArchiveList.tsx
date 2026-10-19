import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ItemCard } from '@/src/components/ItemCard';
import { Notice, Page } from '@/src/components/ui';
import { useAuth } from '@/src/features/auth/AuthContext';
import { getUnarchivedItem, searchItems } from '@/src/services/api/gapangita';
import type { Item } from '@/src/types/api';
import { colors } from '@/src/theme/colors';

export function ArchiveList({ history = false }: { history?: boolean }) {
  const { user, isLoading: authLoading } = useAuth();
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      setLoading(true);
      setError('');
      void searchItems({ name: query, status: 'closed', unarchivePage: history, page: 1, limit: 30 })
        .then((result) => { if (!cancelled) setItems(result.items); })
        .catch((reason: Error) => { if (!cancelled) setError(reason.message); })
        .finally(() => { if (!cancelled) setLoading(false); });
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [history, query, user]);

  if (authLoading) return <Page><SafeAreaView style={styles.center}><ActivityIndicator color={colors.maroon} /></SafeAreaView></Page>;
  if (!user) return <Page><SafeAreaView style={styles.center}><Notice>Sign in to view staff records.</Notice></SafeAreaView></Page>;
  if (!['Admin', 'Staff'].includes(user.user_role)) return <Page><SafeAreaView style={styles.center}><Notice tone="error">You do not have permission to view these records.</Notice></SafeAreaView></Page>;

  return (
    <Page>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <FlatList
          data={items}
          keyExtractor={(item) => `${item.item_code}-${item.date_reported || ''}`}
          contentContainerStyle={styles.content}
          ListHeaderComponent={
            <View style={styles.header}>
              <Text onPress={() => router.back()} style={styles.back}><Ionicons name="arrow-back" size={17} color={colors.maroon} />  Account</Text>
              <Text style={styles.kicker}>STAFF RECORDS</Text>
              <Text style={styles.title}>{history ? 'Restore history' : 'Archived items'}</Text>
              <Text style={styles.subtitle}>{history ? 'Review records that have been restored.' : 'Closed records can be restored to active listings.'}</Text>
              <View style={styles.searchBox}><Ionicons name="search" size={18} color={colors.muted} /><TextInput value={query} onChangeText={setQuery} placeholder="Search item names" placeholderTextColor={colors.muted} style={styles.input} /></View>
              {error ? <Notice tone="error">{error}</Notice> : null}
              {loading ? <ActivityIndicator color={colors.maroon} style={styles.loader} /> : null}
              {!loading && !items.length && !error ? <Notice>No records found.</Notice> : null}
            </View>
          }
          renderItem={({ item }) => (
            <ItemCard item={item} onPress={() => {
              if (!history) {
                router.push({ pathname: '/staff/restore/[itemCode]', params: { itemCode: item.item_code } });
              } else {
                void getUnarchivedItem(item.item_code).then((record) => {
                  Alert.alert(item.item_code, `Restored ${record.date_unarchived || 'date unavailable'}\nReason: ${record.reason || 'No reason recorded.'}`);
                }).catch((reason: Error) => Alert.alert('Unable to load history', reason.message));
              }
            }} />
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      </SafeAreaView>
    </Page>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, padding: 20, justifyContent: 'center' },
  content: { paddingHorizontal: 18, paddingBottom: 25 },
  header: { gap: 10, paddingBottom: 18 },
  back: { color: colors.maroon, fontSize: 13, fontWeight: '800', paddingVertical: 8 },
  kicker: { color: colors.coral, fontSize: 10, fontWeight: '900', letterSpacing: 1.2, marginTop: 5 },
  title: { color: colors.ink, fontSize: 27, fontWeight: '900' },
  subtitle: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  searchBox: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 5,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  input: { flex: 1, color: colors.ink, fontSize: 14, paddingVertical: 10 },
  loader: { padding: 14 },
  separator: { height: 9 },
});