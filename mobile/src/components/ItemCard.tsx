import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Item } from '@/src/types/api';
import { colors } from '@/src/theme/colors';
import { formatDisplayDate } from '@/src/utils/dates';

export function ItemCard({ item, onPress }: { item: Item; onPress: () => void }) {
  const statusLabel = item.status === 'Available'
    ? 'Available'
    : item.status === 'Under Verification'
      ? 'Under verification'
      : item.status === 'Contact Staff'
        ? 'Contact staff'
        : item.status === 'Unavailable'
          ? 'Unavailable'
          : 'Closed';

  const isFound = item.item_type === 'found';

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={[styles.iconTile, isFound ? styles.iconFound : styles.iconLost]}>
        <Ionicons
          name={isFound ? 'cube-outline' : 'search-outline'}
          size={22}
          color={isFound ? colors.maroonDark : colors.maroon}
        />
      </View>

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text numberOfLines={1} style={styles.title}>{item.name || (isFound ? 'Found item' : 'Lost item')}</Text>
          <View style={[styles.statusPill, !item.can_claim && styles.statusPillMuted]}>
            <Text style={[styles.statusText, !item.can_claim && styles.statusTextMuted]}>{statusLabel}</Text>
          </View>
        </View>

        <Text style={styles.meta}>{isFound ? 'Found item' : 'Lost item'}</Text>

        {(item.public_color || item.categoryName) ? (
          <View style={styles.chipRow}>
            {item.public_color ? (
              <View style={styles.chip}>
                <Text numberOfLines={1} style={styles.chipText}>{item.public_color}</Text>
              </View>
            ) : null}
            {item.categoryName ? (
              <View style={[styles.chip, styles.chipCategory]}>
                <Text numberOfLines={1} style={[styles.chipText, styles.chipCategoryText]}>{item.categoryName}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        <View style={styles.metaRow}>
          {item.branchName ? (
            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={13} color={colors.muted} />
              <Text numberOfLines={1} style={styles.meta}>{item.branchName}</Text>
            </View>
          ) : null}
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={13} color={colors.muted} />
            <Text style={styles.meta}>
              {item.date_found ? `Reported ${formatDisplayDate(item.date_found)}` : 'Date not available'}
            </Text>
          </View>
        </View>
      </View>

      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.line,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  pressed: { opacity: 0.72 },

  iconTile: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLost: { backgroundColor: colors.maroonLight },
  iconFound: { backgroundColor: colors.yellow },

  body: { flex: 1, gap: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  title: { flexShrink: 1, color: colors.ink, fontSize: 15, fontWeight: '800' },

  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
    backgroundColor: colors.maroonLight,
  },
  statusPillMuted: { backgroundColor: colors.line },
  statusText: { color: colors.maroonDark, fontSize: 10, fontWeight: '800' },
  statusTextMuted: { color: colors.muted },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 9,
    paddingVertical: 3,
    backgroundColor: colors.white,
  },
  chipText: { color: colors.ink, fontSize: 11, fontWeight: '700' },
  chipCategory: { backgroundColor: colors.maroonLight, borderColor: colors.maroonLight },
  chipCategoryText: { color: colors.maroonDark },

  metaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 12, rowGap: 4 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  meta: { color: colors.muted, fontSize: 11 },
});