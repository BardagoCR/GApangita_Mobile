import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionButton, Eyebrow, Heading, Notice, Page, TAB_BAR_CONTENT_PADDING } from '@/src/components/ui';
import { useAuth } from '@/src/features/auth/AuthContext';
import { colors } from '@/src/theme/colors';

export default function AccountScreen() {
  const { user, isLoading, authError, refreshAuth, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
    } catch (error) {
      Alert.alert('Sign out issue', error instanceof Error ? error.message : 'Unable to confirm sign-out. Please retry.');
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <Page>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <ScrollView contentContainerStyle={styles.content}>
          <Eyebrow>YOUR ACCOUNT</Eyebrow>
          <Heading>Account</Heading>
          {authError ? <><Notice tone="error">{authError}</Notice><ActionButton title="Retry session check" onPress={() => void refreshAuth()} disabled={isLoading} /></> : null}
          {isLoading ? <Notice>Checking your sign-in status…</Notice> : null}
          {!isLoading && !user ? (
            <View style={styles.panel}>
              <View style={styles.icon}><Ionicons name="person-outline" size={22} color={colors.maroon} /></View>
              <Text style={styles.panelTitle}>Sign in for staff actions</Text>
              <Text style={styles.panelCopy}>Browsing is open to everyone. Sign in to report items or manage the archive. Claims are submitted while signed out.</Text>
              <ActionButton title="Sign in" onPress={() => router.push('/login')} />
            </View>
          ) : null}
          {user ? (
            <>
              <View style={styles.profile}>
                <View style={styles.avatar}><Text style={styles.avatarText}>{user.username.slice(0, 1).toUpperCase()}</Text></View>
                <View style={styles.profileText}><Text style={styles.name}>{user.username}</Text><Text style={styles.role}>{user.user_role}</Text></View>
              </View>
              <Text style={styles.sectionLabel}>RECORDS</Text>
              {['Admin', 'Staff'].includes(user.user_role) ? (
                <MenuRow icon="shield-checkmark-outline" label="Claim queue" onPress={() => router.push('/staff/claims' as never)} />
              ) : null}
              <MenuRow icon="archive-outline" label="Archived items" onPress={() => router.push('/staff/archive')} />
              <MenuRow icon="time-outline" label="Restore history" onPress={() => router.push('/staff/unarchive-history')} />
              <View style={styles.signout}><ActionButton title="Sign out" variant="quiet" onPress={() => void handleSignOut()} loading={signingOut} /></View>
            </>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </Page>
  );
}

function MenuRow({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.menuRow}>
      <Ionicons name={icon} size={20} color={colors.maroon} />
      <Text style={styles.menuLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={17} color={colors.muted} />
    </Pressable>
  );
}

const card = {
  borderWidth: 1,
  borderColor: colors.line,
  backgroundColor: colors.white,
} as const;

const styles = StyleSheet.create({
  // Layout
  safe: { flex: 1 },
  content: {
    padding: 20,
    paddingBottom: TAB_BAR_CONTENT_PADDING,
    gap: 14,
  },

  // Panel
  panel: {
    ...card,
    marginTop: 8,
    padding: 18,
    borderRadius: 13,
    gap: 12,
  },
  icon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.maroonLight,
  },
  panelTitle: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: '800',
  },
  panelCopy: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
  },

  // Profile
  profile: {
    ...card,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 12,
    gap: 12,
    marginTop: 4,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: colors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.maroonDark,
    fontSize: 18,
    fontWeight: '900',
  },
  profileText: { gap: 3 },
  name: {
    color: colors.ink,
    fontWeight: '800',
    fontSize: 16,
  },
  role: {
    color: colors.muted,
    fontSize: 12,
  },

  // Menu
  sectionLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    marginTop: 13,
  },
  menuRow: {
    minHeight: 53,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 5,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  menuLabel: {
    flex: 1,
    color: colors.ink,
    fontSize: 14,
    fontWeight: '700',
  },
  signout: { marginTop: 18 },
});