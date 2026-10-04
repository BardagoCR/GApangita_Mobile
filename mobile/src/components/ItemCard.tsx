import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import type { Item } from '@/src/types/api';
import { colors } from '@/src/theme/colors';
import { imageUrl } from '@/src/services/api/client';

export function ItemCard({ item, onPress }: { item: Item; onPress: () => void }) {
  const photo = imageUrl(item.item_file_path);
  const isFound = item.item_type === 'found';

  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      {photo ? (
        <Image source={{ uri: photo }} style={styles.photo} />
      ) : (
        <View style={styles.placeholder}>
          <Ionicons name="cube-outline" size={28} color={colors.maroon} />
          <Text style={styles.placeholderText}>No photo</Text>
        </View>
      )}
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text numberOfLines={1} style={styles.title}>{item.name}</Text>
          <View style={[styles.badge, isFound ? styles.foundBadge : styles.lostBadge]}>
            <Text style={[styles.badgeText, isFound ? styles.foundText : styles.lostText]}>
              {isFound ? 'FOUND' : 'LOST'}
            </Text>
          </View>
        </View>
        <Text numberOfLines={2} style={styles.description}>{item.description || 'No description provided.'}</Text>
        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={14} color={colors.muted} />
          <Text numberOfLines={1} style={styles.meta}>{item.locationName || item.branchName || 'Campus'}</Text>
          {item.categoryName ? <Text numberOfLines={1} style={styles.category}>{item.categoryName}</Text> : null}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.muted} style={styles.chevron} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.white, borderRadius: 12, padding: 10, borderWidth: 1, borderColor: colors.line },
  pressed: { opacity: 0.72 },
  photo: { width: 76, height: 76, borderRadius: 9, backgroundColor: colors.paper },
  placeholder: { width: 76, height: 76, borderRadius: 9, alignItems: 'center', justifyContent: 'center', gap: 3, backgroundColor: colors.maroonLight },
  placeholderText: { color: colors.maroon, fontSize: 9, fontWeight: '700' },
  body: { flex: 1, gap: 5 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { color: colors.ink, fontSize: 15, fontWeight: '800', flex: 1 },
  badge: { borderRadius: 5, paddingHorizontal: 7, paddingVertical: 4 },
  foundBadge: { backgroundColor: colors.maroonLight },
  lostBadge: { backgroundColor: '#F8E5D7' },
  badgeText: { fontSize: 9, fontWeight: '900' },
  foundText: { color: colors.maroonDark },
  lostText: { color: colors.coral },
  description: { color: colors.muted, fontSize: 12, lineHeight: 16 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  meta: { color: colors.muted, fontSize: 11, flex: 1 },
  category: { color: colors.maroon, fontSize: 10, fontWeight: '700', maxWidth: 85 },
  chevron: { marginLeft: -4 },
});