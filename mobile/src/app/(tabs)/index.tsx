import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ItemCard } from '@/src/components/ItemCard';
import { Notice, Page, SelectField, TAB_BAR_CONTENT_PADDING } from '@/src/components/ui';
import { getBranches, getCategories, getLocations, searchItems } from '@/src/services/api/gapangita';
import type { Branch, Category, Item, Location } from '@/src/types/api';
import { colors } from '@/src/theme/colors';

type ItemTypeFilter = 'all' | 'lost' | 'found';

export default function FindScreen() {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const logoSize = Math.min(104, Math.max(72, windowWidth * 0.26));
  const searchRef = useRef<TextInput>(null);
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
  const hasCriteria = Boolean(
    name.trim() || description.trim() || type !== 'all' || categoryCode || branchCode || locationCode,
  );

  useEffect(() => {
    void Promise.all([getCategories(), getBranches()])
      .then(([categoryRows, branchRows]) => {
        setCategories(categoryRows);
        setBranches(branchRows);
      })
      .catch((reason: Error) => setError(reason.message));
  }, []);

  useEffect(() => {
    if (!branchCode) return;
    let cancelled = false;
    void getLocations(branchCode)
      .then((rows) => {
        if (!cancelled) setLocations(rows);
      })
      .catch((reason: Error) => {
        if (!cancelled) setError(reason.message);
      });
    return () => {
      cancelled = true;
    };
  }, [branchCode]);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      setLoading(true);
      setError('');
      void searchItems({
        name,
        description,
        type,
        categoryCode,
        branchCode,
        locationCode,
        page,
        limit: 15,
        browseAll: !hasCriteria,
      })
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
            ref={searchRef}
            value={name}
            onChangeText={(value) => {
              setName(value);
              setPage(1);
            }}
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
          onChangeText={(value) => {
            setDescription(value);
            setPage(1);
          }}
          placeholder="Add details like color or brand"
          placeholderTextColor={colors.muted}
          style={styles.detailInput}
        />

        <View style={styles.typeRow}>
          {(['all', 'lost', 'found'] as const).map((option) => (
            <Pressable
              key={option}
              onPress={() => updateType(option)}
              style={[styles.typeChip, type === option && styles.typeChipActive]}>
              <Text style={[styles.typeText, type === option && styles.typeTextActive]}>
                {option === 'all' ? 'Everything' : option}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.pickerRow}>
          <SelectField
            value={categoryCode}
            options={[
              { label: 'All categories', value: '' },
              ...categories.map((c) => ({ label: c.name, value: c.category_code })),
            ]}
            onChange={(v) => {
              setCategoryCode(v);
              setPage(1);
            }}
          />

          <SelectField
            value={branchCode}
            options={[
              { label: 'All branches', value: '' },
              ...branches.map((b) => ({ label: b.name, value: b.branch_code })),
            ]}
            onChange={(v) => {
              setBranchCode(v);
              setLocationCode('');
              setLocations([]);
              setPage(1);
            }}
          />

          {branchCode ? (
            <SelectField
              value={locationCode}
              options={[
                { label: 'All locations', value: '' },
                ...locations.map((l) => ({ label: l.name, value: l.location_code })),
              ]}
              onChange={(v) => {
                setLocationCode(v);
                setPage(1);
              }}
            />
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
          contentContainerStyle={[styles.content, { paddingBottom: TAB_BAR_CONTENT_PADDING + insets.bottom }]}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <View style={styles.headerContent}>
              <View style={styles.brandRow}>
                <View style={styles.brandMark}>
                  <Ionicons name="search" size={19} color={colors.maroonDark} />
                </View>
                <Text style={styles.brand}>
                  GApangita<Text style={styles.brandQuestion}>?</Text>
                </Text>
              </View>

              <LinearGradient
                colors={[colors.maroonDark, colors.maroon]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.hero}>
                <View style={styles.heroContent}>
                  <View style={styles.heroText}>
                    <Text style={styles.heroKicker}>LOST & FOUND · CAMPUS</Text>
                    <Text style={styles.heroTitle}>Let’s get it{'\n'}back to you.</Text>
                    <Text style={styles.heroCopy}>Search the campus listings or report something you found.</Text>
                    <View style={styles.heroActions}>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => searchRef.current?.focus()}
                        style={({ pressed }) => [styles.ctaPrimary, pressed && styles.ctaPressed]}>
                        <Text style={styles.ctaPrimaryText}>Search</Text>
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => router.push('/(tabs)/report' as never)}
                        style={({ pressed }) => [styles.ctaSecondary, pressed && styles.ctaPressed]}>
                        <Text style={styles.ctaSecondaryText}>I found something</Text>
                      </Pressable>
                    </View>
                  </View>
                  <Image
                    source={require('@/assets/images/logo.png')}
                    style={[styles.logo, { width: logoSize, height: logoSize }]}
                  />
                </View>
              </LinearGradient>

              {renderSearchFilters()}
            </View>
          }
          renderItem={({ item }) => (
            <ItemCard item={item} onPress={() => router.push(`/items/${encodeURIComponent(item.item_code)}` as never)} />
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListFooterComponent={
            items.length > 0 ? (
              <View style={styles.pagination}>
                <Pressable
                  disabled={page <= 1}
                  onPress={() => setPage((value) => Math.max(1, value - 1))}
                  style={styles.pageButton}>
                  <Text style={[styles.pageText, page <= 1 && styles.disabledText]}>Previous</Text>
                </Pressable>
                <Text style={styles.pageLabel}>Page {page}</Text>
                <Pressable
                  disabled={page * 15 >= total}
                  onPress={() => setPage((value) => value + 1)}
                  style={styles.pageButton}>
                  <Text style={[styles.pageText, page * 15 >= total && styles.disabledText]}>Next</Text>
                </Pressable>
              </View>
            ) : null
          }
        />
      </SafeAreaView>
    </Page>
  );
}

const field = {
  borderWidth: 1,
  borderColor: colors.line,
  borderRadius: 14,
  backgroundColor: colors.white,
  shadowColor: '#000',
  shadowOpacity: 0.08,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 4 },
  elevation: 3,
} as const;

const styles = StyleSheet.create({
  // Layout
  safe: { flex: 1 },
  content: { paddingHorizontal: 18 },
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
    overflow: 'hidden',
    borderRadius: 14,
    padding: 22,
    justifyContent: 'center',
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heroText: {
    flex: 1,
    minWidth: 0,
  },
  heroKicker: {
    color: colors.yellow,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.4,
    marginBottom: 12,
  },
  heroTitle: {
    color: colors.white,
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '900',
  },
  heroCopy: {
    color: colors.white,
    opacity: 0.85,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
  },
  heroActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  ctaPrimary: {
    backgroundColor: colors.yellow,
    borderRadius: 12,
    paddingHorizontal: 14,
    minHeight: 38,
    justifyContent: 'center',
  },
  ctaPrimaryText: { color: colors.maroonDark, fontWeight: '800', fontSize: 13 },
  ctaSecondary: {
    borderWidth: 1.5,
    borderColor: colors.yellow,
    borderRadius: 12,
    paddingHorizontal: 14,
    minHeight: 38,
    justifyContent: 'center',
  },
  ctaSecondaryText: { color: colors.yellow, fontWeight: '800', fontSize: 13 },
  ctaPressed: { opacity: 0.85 },
  logo: {
    borderRadius: 16,
    resizeMode: 'contain',
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
    height: 52,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    color: colors.ink,
    fontSize: 14,
    paddingVertical: 10,
  },
  detailInput: {
    ...field,
    height: 52,
    paddingHorizontal: 16,
    color: colors.ink,
    fontSize: 14,
  },

  // Type chips
  typeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  typeChip: {
    ...field,
    minHeight: 35,
    paddingHorizontal: 14,
    justifyContent: 'center',
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

  // Select fields
  pickerRow: { gap: 12 },

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
