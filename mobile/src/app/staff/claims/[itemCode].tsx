import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionButton, Field, Heading, Notice, Page, TAB_BAR_CONTENT_PADDING } from '@/src/components/ui';
import { useAuth } from '@/src/features/auth/AuthContext';
import { getClaimDetails, getClaimEvidence, updateClaimStatus } from '@/src/services/api/gapangita';
import type { Claim } from '@/src/types/api';
import { API_BASE_URL } from '@/src/services/api/client';
import { colors } from '@/src/theme/colors';

type ClaimDetails = Claim & {
  item_name: string;
  item_description_private: string;
  item_status: string;
  location_code: string;
  item_file_path: string | null;
  public_color: string | null;
};

const statuses: Claim['status'][] = ['Pending', 'Under Review', 'Approved', 'Rejected', 'Returned'];

export default function ClaimDetailsScreen() {
  const { itemCode } = useLocalSearchParams<{ itemCode: string }>();
  const { user, isLoading } = useAuth();
  const [claim, setClaim] = useState<ClaimDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const isStaff = Boolean(user && ['Admin', 'Staff'].includes(user.user_role));

  useEffect(() => {
    if (!isStaff) return;
    let cancelled = false;
    getClaimDetails(itemCode)
      .then((result) => {
        if (!cancelled) {
          setClaim(result);
          setNotes(result.staff_notes || '');
        }
      })
      .catch((reason: Error) => { if (!cancelled) setError(reason.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [itemCode, isStaff]);

  async function saveStatus(status: Claim['status']) {
    if (!claim) return;
    setSaving(true);
    setError('');
    try {
      await updateClaimStatus(claim.item_code, status, notes);
      setClaim({ ...claim, status, staff_notes: notes, date_updated: new Date().toISOString() });
      Alert.alert('Claim updated', `Status changed to ${status}.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to update the claim.');
    } finally {
      setSaving(false);
    }
  }

  async function downloadEvidence() {
    if (!claim?.evidence_file_path) return;
    try {
      await getClaimEvidence(claim.item_code);
      await Linking.openURL(`${API_BASE_URL.replace(/\/api$/, '')}/uploads/${claim.evidence_file_path}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to open evidence.');
    }
  }

  if (isLoading || !isStaff) {
    return <Page><SafeAreaView edges={['top']} style={styles.gate}><Notice tone="error">Sign in with staff access to view this claim.</Notice></SafeAreaView></Page>;
  }

  return (
    <Page>
      <SafeAreaView edges={['top', 'bottom']} style={styles.safe}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text onPress={() => router.back()} style={styles.back}><Ionicons name="arrow-back" size={17} color={colors.maroon} /> Claim queue</Text>
          {loading ? <ActivityIndicator color={colors.maroon} style={styles.loader} /> : null}
          {error ? <Notice tone="error">{error}</Notice> : null}
          {claim ? (
            <View style={styles.contentStack}>
              <Heading>{claim.item_name}</Heading>
              <Text style={styles.itemCode}>Item reference: {claim.item_code}</Text>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Claimant</Text>
                <Text style={styles.name}>{claim.claimer_first_name} {claim.claimer_middle_name || ''} {claim.claimer_last_name}</Text>
                <Text style={styles.detail}>{claim.contact_number}</Text>
                <Text style={styles.detail}>{claim.claimant_email}</Text>
                <Text style={styles.detail}>Affiliation: {claim.claimant_affiliation}</Text>
              </View>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Ownership details</Text>
                <Text style={styles.detail}>Description: {claim.item_description_private}</Text>
                <Text style={styles.detail}>Identifying features: {claim.identifying_features}</Text>
                <Text style={styles.detail}>Contents: {claim.contents || 'Not provided'}</Text>
                <Text style={styles.detail}>Last seen: {claim.last_seen_location || 'Not provided'} · {claim.last_seen_date_time || 'Not provided'}</Text>
                <Text style={styles.detail}>Additional evidence: {claim.additional_evidence || 'Not provided'}</Text>
              </View>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Evidence</Text>
                {claim.evidence_file_path ? <ActionButton title="Open evidence" variant="secondary" onPress={() => void downloadEvidence()} /> : <Text style={styles.detail}>No evidence attached.</Text>}
              </View>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Review status</Text>
                <View style={styles.statusRow}>{statuses.map((status) => <Pressable key={status} accessibilityRole="button" disabled={saving || claim.status === status} onPress={() => void saveStatus(status)} style={[styles.statusButton, claim.status === status && styles.statusActive]}><Text style={[styles.statusText, claim.status === status && styles.statusTextActive]}>{status}</Text></Pressable>)}</View>
                <Field label="Staff notes" value={notes} onChangeText={setNotes} multiline placeholder="Record verification findings or follow-up instructions." />
                <ActionButton title="Save notes and status" onPress={() => void saveStatus(claim.status)} loading={saving} disabled={saving} />
              </View>
              <Text style={styles.updated}>Last updated {claim.date_updated}</Text>
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </Page>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 }, gate: { flex: 1, padding: 20, justifyContent: 'center' }, content: { padding: 18, paddingBottom: TAB_BAR_CONTENT_PADDING, gap: 16 }, contentStack: { gap: 16 },
  back: { color: colors.maroon, fontSize: 13, fontWeight: '800', paddingVertical: 5 }, loader: { padding: 30 }, itemCode: { color: colors.muted, fontSize: 11, fontWeight: '700' },
  section: { gap: 8, backgroundColor: colors.white, borderRadius: 12, borderWidth: 1, borderColor: colors.line, padding: 15 }, sectionTitle: { color: colors.maroonDark, fontSize: 13, fontWeight: '900' },
  name: { color: colors.ink, fontSize: 16, fontWeight: '800' }, detail: { color: colors.ink, fontSize: 12, lineHeight: 18 }, statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  statusButton: { borderWidth: 1, borderColor: colors.line, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 }, statusActive: { backgroundColor: colors.maroon, borderColor: colors.maroon },
  statusText: { color: colors.ink, fontSize: 10, fontWeight: '700' }, statusTextActive: { color: colors.white }, updated: { color: colors.muted, fontSize: 10 },
});
