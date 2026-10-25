import { useAppDialog } from '@/src/components/AppDialog';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionButton, Field, Heading, Notice, Page, TAB_BAR_CONTENT_PADDING } from '@/src/components/ui';
import { useAuth } from '@/src/features/auth/AuthContext';
import { getClaimDetails, getClaimEvidence, updateClaimStatus } from '@/src/services/api/gapangita';
import type { Claim } from '@/src/types/api';
import { API_BASE_URL } from '@/src/services/api/client';
import { colors } from '@/src/theme/colors';

type ClaimDetails = Claim & {
  item_description: string;
  item_name: string;
  item_description_private: string;
  item_status: string;
  location_code: string;
  item_file_path: string | null;
  public_color: string | null;
};

const transitions: Record<Claim['status'], Claim['status'][]> = {
  Pending: ['Under Review', 'Approved', 'Rejected'],
  'Under Review': ['Pending', 'Approved', 'Rejected'],
  Approved: ['Returned'], Rejected: [], Returned: ['Approved'],
};

const statuses: Claim['status'][] = ['Pending', 'Under Review', 'Approved', 'Rejected', 'Returned'];

export default function ClaimDetailsScreen() {
  const { confirm, notify, dialog } = useAppDialog();
  const { itemCode, claimId } = useLocalSearchParams<{ itemCode: string; claimId?: string }>();
  const recordId = claimId && /^\d+$/.test(claimId) ? Number(claimId) : undefined;
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
    getClaimDetails(itemCode, recordId)
      .then((result) => {
        if (!cancelled) {
          setClaim(result);
          setNotes(result.staff_notes || '');
        }
      })
      .catch((reason: Error) => { if (!cancelled) setError(reason.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [itemCode, recordId, isStaff]);

  async function saveStatus(status: Claim['status']) {
    if (!claim || saving) return;
    setSaving(true);
    setError('');
    try {
      const consequence = status === claim.status ? 'Save the staff notes for this claim without changing its status?'
        : status === 'Returned' ? 'Confirm that the item has been handed back to its owner. The item will remain archived. If this was recorded by mistake, you can correct it back to Approved.'
          : status === 'Rejected' ? 'Reject this claim? The item becomes claimable again until its original expiry. This decision is final; the claim and evidence stay in history.'
            : status === 'Approved' ? claim.status === 'Returned' ? 'Correct the returned status back to Approved? The item stays archived and unavailable for new claims. Use the staff notes to explain the correction.' : 'Approve ownership and archive this item? It will no longer be claimable in the listings.'
              : `Change this claim from ${claim.status} to ${status}? The item will stay reserved while it is being reviewed.`;
      if (!await confirm({ title: status === claim.status ? 'Save staff notes?' : `Mark claim ${status.toLowerCase()}?`, message: consequence + (status !== claim.status ? ' Your current staff notes will also be saved.' : ''), confirmLabel: status === claim.status ? 'Save notes' : `Confirm ${status}`, tone: ['Approved', 'Rejected', 'Returned'].includes(status) ? 'warning' : 'default' })) return;
      await updateClaimStatus(claim.item_code, status, notes, claim.claimed_item_id);
      setClaim({ ...claim, status, staff_notes: notes, date_updated: new Date().toISOString() });
      await notify({ title: 'Claim saved', message: status === claim.status ? 'Your staff notes have been saved.' : `Status changed to ${status}.`, tone: 'success' });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to update the claim.');
    } finally {
      setSaving(false);
    }
  }

  async function downloadEvidence() {
    if (!claim?.evidence_file_path) return;
    try {
      await getClaimEvidence(claim.item_code, claim.claimed_item_id);
      await Linking.openURL(`${API_BASE_URL.replace(/\/api$/, '')}/uploads/${claim.evidence_file_path}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to open evidence.');
    }
  }

  if (isLoading || !isStaff) {
    return <Page>{dialog}<SafeAreaView edges={['top']} style={styles.gate}><Notice tone="error">Sign in with staff access to view this claim.</Notice></SafeAreaView></Page>;
  }

  return (
    <Page>{dialog}
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
                <Text style={styles.detail}>Claimant description: {claim.item_description}</Text>
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
                <Text style={styles.detail}>Rejecting a claim makes the item claimable again until its original three-week expiry. Approval archives the item. Rejected decisions remain in the history.</Text>
                {claim.status === 'Returned' ? <Notice>Recorded as handed to its owner. If this was a mistake, change it back to Approved and explain the correction in staff notes. The item will remain archived.</Notice> : null}
                <View style={styles.statusRow}>{statuses.map((status) => <Pressable key={status} accessibilityRole="button" disabled={saving || !transitions[claim.status].includes(status)} onPress={() => void saveStatus(status)} style={[styles.statusButton, claim.status === status && styles.statusActive, !transitions[claim.status].includes(status) && claim.status !== status && styles.statusDisabled]}><Text style={[styles.statusText, claim.status === status && styles.statusTextActive]}>{status}</Text></Pressable>)}</View>
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
  statusDisabled: { opacity: 0.35 },
  statusButton: { borderWidth: 1, borderColor: colors.line, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 }, statusActive: { backgroundColor: colors.maroon, borderColor: colors.maroon },
  statusText: { color: colors.ink, fontSize: 10, fontWeight: '700' }, statusTextActive: { color: colors.white }, updated: { color: colors.muted, fontSize: 10 },
});
