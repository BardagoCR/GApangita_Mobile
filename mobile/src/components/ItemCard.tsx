import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Item } from '@/src/types/api';
import { colors } from '@/src/theme/colors';

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

  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text numberOfLines={1} style={styles.title}>{item.item_type === 'found' ? 'Found item' : 'Lost item'}</Text>
          <Text style={[styles.status, !item.can_claim && styles.verifiedStatus]}>{statusLabel}</Text>
        </View>
        <View style={styles.metaRow}>
          {item.public_color ? <Text numberOfLines={1} style={styles.color}>Color: {item.public_color}</Text> : null}
          {item.categoryName ? <Text numberOfLines={1} style={styles.category}>{item.categoryName}</Text> : null}
          {item.branchName ? <Text numberOfLines={1} style={styles.meta}>{item.branchName}</Text> : null}
        </View>
        <View style={styles.dateRow}>
          <Ionicons name="calendar-outline" size={13} color={colors.muted} />
          <Text style={styles.meta}>{item.date_found ? `Reported ${item.date_found.slice(0, 10)}` : 'Date not available'}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.muted} style={styles.chevron} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.white, borderRadius: 12, padding: 13, borderWidth: 1, borderColor: colors.line },
  pressed: { opacity: 0.72 },
  body: { flex: 1, gap: 7 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  title: { color: colors.ink, fontSize: 15, fontWeight: '800' },
  status: { color: colors.maroon, fontSize: 10, fontWeight: '800', textAlign: 'right' },
  verifiedStatus: { color: colors.muted },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  color: { color: colors.ink, fontSize: 11, fontWeight: '700' },
  category: { color: colors.maroon, fontSize: 10, fontWeight: '700' },
  meta: { color: colors.muted, fontSize: 11 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  chevron: { marginLeft: -4 },
});