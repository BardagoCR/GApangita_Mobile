import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ItemCard } from '@/src/components/ItemCard';
import { Notice, Page } from '@/src/components/ui';
import { getBranches, getCategories, getLocations, searchItems } from '@/src/services/api/gapangita';
import type { Branch, Category, Item, Location } from '@/src/types/api';
import { colors } from '@/src/theme/colors';
import { LinearGradient } from 'expo-linear-gradient';

type ItemTypeFilter = 'all' | 'lost' | 'found';

export default function FindScreen() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<ItemTypeFilter>('all');
  const [categoryCode, setCategoryCode] = useState('');
  const [branchCode, setBranchCode] = useState('');
  const [locationCode, setLocationCode] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasLoadedResults, setHasLoadedResults] = useState(false);
  const hasCriteria = Boolean(name.trim() || description.trim() || categoryCode || branchCode || locationCode);

  useEffect(() => {
    void Promise.all([getCategories(), getBranches()]).then(([categoryRows, branchRows]) => {
      setCategories(categoryRows);
      setBranches(branchRows);
    }).catch((reason: Error) => setError(reason.message));
  }, []);

  useEffect(() => {
    if (!branchCode) return;
    let cancelled = false;
    void getLocations(branchCode)
      .then((rows) => { if (!cancelled) setLocations(rows); })
      .catch((reason: Error) => { if (!cancelled) setError(reason.message); });
    return () => { cancelled = true; };
  }, [branchCode]);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      setLoading(true);
      setError('');
      void searchItems({ name, description, type, categoryCode, branchCode, page, limit: 15, browseAll: !hasCriteria })
        .then((result) => {
          if (cancelled) return;
          setItems(result.items);
          setTotal(result.total);
          setHasLoadedResults(true);
        })
        .catch((reason: Error) => {
          if (!cancelled) setError(reason.message);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [name, description, type, categoryCode, branchCode, locationCode, page, hasCriteria]);

  function updateType(nextType: ItemTypeFilter) {
    setType(nextType);
    setPage(1);
  }

  function renderSearchFilters() {
    return (
      <View style={styles.searchSection}>
        <Text style={styles.sectionTitle}>Find an item</Text>

        <View style={styles.searchBox}>
          <Ionicons name="search" size={19} color={colors.muted} />
          <TextInput
            value={name}
            onChangeText={(value) => { setName(value); setPage(1); }}
            placeholder="What are you looking for?"
            placeholderTextColor={colors.muted}
            returnKeyType="search"
            style={styles.searchInput}
          />
          {name ? (
            <Pressable accessibilityLabel="Clear item search" onPress={() => setName('')}>
              <Ionicons name="close-circle" size={19} color={colors.muted} />
            </Pressable>
          ) : null}
        </View>

        <TextInput
          value={description}
          onChangeText={(value) => { setDescription(value); setPage(1); }}
          placeholder="Add details like color or brand"
          placeholderTextColor={colors.muted}
          style={styles.detailInput}
        />

        <View style={styles.typeRow}>
          {(['all', 'lost', 'found'] as const).map((option) => (
            <Pressable
              key={option}
              onPress={() => updateType(option)}
              style={[styles.typeChip, type === option && styles.typeChipActive]}
            >
              <Text style={[styles.typeText, type === option && styles.typeTextActive]}>
                {option === 'all' ? 'Everything' : option}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.pickerRow}>
          <Picker selectedValue={categoryCode} onValueChange={(value) => { setCategoryCode(value); setPage(1); }} style={styles.picker}>
            <Picker.Item label="All categories" value="" />
            {categories.map((category) => (
              <Picker.Item key={category.category_code} label={category.name} value={category.category_code} />
            ))}
          </Picker>

          <Picker selectedValue={branchCode} onValueChange={(value) => { setBranchCode(value); setLocationCode(''); setLocations([]); setPage(1); }} style={styles.picker}>
            <Picker.Item label="All branches" value="" />
            {branches.map((branch) => (
              <Picker.Item key={branch.branch_code} label={branch.name} value={branch.branch_code} />
            ))}
          </Picker>

          {branchCode ? (
            <Picker selectedValue={locationCode} onValueChange={(value) => { setLocationCode(value); setPage(1); }} style={styles.picker}>
              <Picker.Item label="All locations" value="" />
              {locations.map((location) => (
                <Picker.Item key={location.location_code} label={location.name} value={location.location_code} />
              ))}
            </Picker>
          ) : null}
        </View>

        <View style={styles.resultsHeader}>
          <Text style={styles.sectionTitle}>Open listings</Text>
          {hasLoadedResults && !loading ? <Text style={styles.resultCount}>{total} results</Text> : null}
        </View>

        {error ? <Notice tone="error">{error}</Notice> : null}
        {loading ? <ActivityIndicator color={colors.maroon} style={styles.loader} /> : null}
        {!loading && hasLoadedResults && items.length === 0 && !error ? (
          <Notice>No matching listings yet. Try another name or filter.</Notice>
        ) : null}
      </View>
    );
  }

  return (
    <Page>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <FlatList
          data={items}
          keyExtractor={(item) => item.item_code}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <View style={styles.headerContent}>
              <View style={styles.brandRow}>
                <View style={styles.brandMark}><Ionicons name="search" size={19} color={colors.maroonDark} /></View>
                <Text style={styles.brand}>GApangita<Text style={styles.brandQuestion}>?</Text></Text>
              </View>
            
            <LinearGradient
              colors={[colors.maroonDark, colors.maroon]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.hero}
              >
            

              <View style={styles.hero}>
                <Text style={styles.heroKicker}>LOST & FOUND · CAMPUS</Text>
                <Text style={styles.heroTitle}>Let’s get it{ '\n' }back to you.</Text>
                <Text style={styles.heroCopy}>Search the campus listings or report something you found.</Text>
                <View style={styles.heroStamp}><Ionicons name="cube" size={23} color={colors.maroonDark} /></View>
              </View>
              
              </LinearGradient>

              {renderSearchFilters()}
            </View>
          }
          renderItem={({ item }) => (
            <ItemCard item={item} onPress={() => router.push(`/items/${encodeURIComponent(item.item_code)}` as never)} />
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListFooterComponent={items.length > 0 ? (
            <View style={styles.pagination}>
              <Pressable disabled={page <= 1} onPress={() => setPage((value) => Math.max(1, value - 1))} style={styles.pageButton}>
                <Text style={[styles.pageText, page <= 1 && styles.disabledText]}>Previous</Text>
              </Pressable>
              <Text style={styles.pageLabel}>Page {page}</Text>
              <Pressable disabled={page * 15 >= total} onPress={() => setPage((value) => value + 1)} style={styles.pageButton}>
                <Text style={[styles.pageText, page * 15 >= total && styles.disabledText]}>Next</Text>
              </Pressable>
            </View>
          ) : null}
        />
      </SafeAreaView>
    </Page>
  );
}

const field = {
  borderWidth: 1,
  borderColor: colors.line,
  borderRadius: 10,
  backgroundColor: colors.white,
} as const;

const styles = StyleSheet.create({
  // Layout
  safe: { flex: 1 },
  content: {
    paddingHorizontal: 18,
    paddingBottom: 28,
  },
  headerContent: { gap: 18 },

  // Brand
  brandRow: {
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  brandMark: {
    width: 31,
    height: 31,
    borderRadius: 9,
    backgroundColor: colors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: {
    fontSize: 19,
    fontWeight: '900',
    color: colors.ink,
  },
  brandQuestion: { color: colors.coral },

  // Hero
  hero: {
    minHeight: 188,
    overflow: 'hidden',
    borderRadius: 14,
    padding: 20,
    justifyContent: 'center',
  },
  heroKicker: {
    color: colors.yellow,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.1,
    marginBottom: 9,
  },
  heroTitle: {
    color: colors.white,
    fontSize: 33,
    lineHeight: 35,
    fontWeight: '900',
  },
  heroCopy: {
    color: colors.maroonLight,
    fontSize: 13,
    lineHeight: 19,
    maxWidth: '75%',
    marginTop: 8,
  },
  heroStamp: {
    position: 'absolute',
    right: 20,
    bottom: 18,
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: colors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '7deg' }],
  },

  // Search
  searchSection: { gap: 11 },
  sectionTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: '800',
  },
  searchBox: {
    ...field,
    minHeight: 50,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  searchInput: {
    flex: 1,
    color: colors.ink,
    fontSize: 14,
    paddingVertical: 10,
  },
  detailInput: {
    ...field,
    height: 45,
    paddingHorizontal: 13,
    color: colors.ink,
    fontSize: 13,
  },

  // Type chips
  typeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  typeChip: {
    minHeight: 35,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 14,
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  typeChipActive: {
    borderColor: colors.maroon,
    backgroundColor: colors.maroon,
  },
  typeText: {
    textTransform: 'capitalize',
    color: colors.ink,
    fontSize: 12,
    fontWeight: '700',
  },
  typeTextActive: { color: colors.white },

  // Pickers
  pickerRow: {
    ...field,
    overflow: 'hidden',
  },
  picker: {
    color: colors.ink,
    height: 48,
  },

  // Results
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  resultCount: {
    color: colors.muted,
    fontSize: 12,
  },
  loader: { paddingVertical: 18 },
  separator: { height: 9 },

  // Pagination
  pagination: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 15,
  },
  pageButton: {
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  pageText: {
    color: colors.maroon,
    fontWeight: '800',
    fontSize: 12,
  },
  pageLabel: {
    color: colors.muted,
    fontSize: 12,
  },
  disabledText: { color: colors.line },
});