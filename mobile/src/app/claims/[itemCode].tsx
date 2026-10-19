import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionButton, Field, Heading, Notice, Page, TAB_BAR_CONTENT_PADDING } from '@/src/components/ui';
import { submitClaim } from '@/src/services/api/gapangita';
import type { ImageAttachment } from '@/src/types/api';
import { colors } from '@/src/theme/colors';

const affiliations = ['Student', 'Faculty', 'Staff', 'Visitor'] as const;

export default function ClaimScreen() {
  const { itemCode } = useLocalSearchParams<{ itemCode: string }>();
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [email, setEmail] = useState('');
  const [affiliation, setAffiliation] = useState<(typeof affiliations)[number]>('Student');
  const [lastSeenLocation, setLastSeenLocation] = useState('');
  const [lastSeenDateTime, setLastSeenDateTime] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [identifyingFeatures, setIdentifyingFeatures] = useState('');
  const [contents, setContents] = useState('');
  const [additionalEvidence, setAdditionalEvidence] = useState('');
  const [evidence, setEvidence] = useState<ImageAttachment | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function chooseEvidence(source: 'camera' | 'library' | 'document') {
    if (source === 'document') {
      const DocumentPicker = await import('expo-document-picker');
      const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'] });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      setEvidence({
        uri: asset.uri,
        name: asset.name,
        mimeType: asset.mimeType || 'application/pdf',
        file: asset.file,
      });
      return;
    }

    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.8 });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setEvidence({
      uri: asset.uri,
      name: asset.fileName || 'claim-evidence.jpg',
      mimeType: asset.mimeType || 'image/jpeg',
      file: asset.file,
    });
  }

  async function handleSubmit() {
    setError('');
    setSuccess('');
    if (!firstName.trim() || !lastName.trim() || !contactNumber.trim() || !email.trim() || !itemDescription.trim() || !identifyingFeatures.trim()) {
      setError('First name, last name, contact number, email, item description, and identifying features are required.');
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError('Enter a valid email address.');
      return;
    }
    setLoading(true);
    try {
      await submitClaim({
        itemCode,
        firstName: firstName.trim(),
        middleName: middleName.trim(),
        lastName: lastName.trim(),
        contactNumber: contactNumber.trim(),
        email: email.trim(),
        affiliation,
        lastSeenLocation: lastSeenLocation.trim(),
        lastSeenDateTime,
        itemDescription: itemDescription.trim(),
        identifyingFeatures: identifyingFeatures.trim(),
        contents: contents.trim(),
        additionalEvidence: additionalEvidence.trim(),
        evidence,
      });
      setSuccess('Claim submitted. Staff will review the ownership details and evidence.');
      setFirstName(''); setMiddleName(''); setLastName(''); setContactNumber(''); setEmail(''); setLastSeenLocation(''); setLastSeenDateTime('');
      setItemDescription(''); setIdentifyingFeatures(''); setContents(''); setAdditionalEvidence(''); setEvidence(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to submit the claim.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Page>
      <Stack.Screen options={{ headerShown: true, title: 'Claim item', headerLeft: () => <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} hitSlop={10}><Ionicons name="arrow-back" size={22} color={colors.maroon} /></Pressable> }} />
      <SafeAreaView edges={['top', 'bottom']} style={styles.safe}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <Heading>Claim this item</Heading>
            <Notice>Reference: {itemCode}. Your claim is public to submit, but staff-only review protects the identity details.</Notice>
            {error ? <Notice tone="error">{error}</Notice> : null}
            {success ? <Notice>{success}</Notice> : null}
            <Field label="First name *" value={firstName} onChangeText={setFirstName} />
            <Field label="Middle name (optional)" value={middleName} onChangeText={setMiddleName} />
            <Field label="Last name *" value={lastName} onChangeText={setLastName} />
            <Field label="Contact number *" value={contactNumber} onChangeText={setContactNumber} keyboardType="phone-pad" />
            <Field label="Email address *" value={email} onChangeText={setEmail} keyboardType="email-address" />
            <View style={styles.affiliationWrap}><Text style={styles.label}>Affiliation *</Text><View style={styles.affiliationRow}>{affiliations.map((option) => <Pressable key={option} accessibilityRole="button" onPress={() => setAffiliation(option)} style={[styles.affiliation, affiliation === option && styles.affiliationActive]}><Text style={[styles.affiliationText, affiliation === option && styles.affiliationTextActive]}>{option}</Text></Pressable>)}</View></View>
            <Field label="Last-seen location (optional)" value={lastSeenLocation} onChangeText={setLastSeenLocation} placeholder="Building, room, or place" />
            <Field label="Approximate last-seen date/time (optional)" value={lastSeenDateTime} onChangeText={setLastSeenDateTime} placeholder="YYYY-MM-DDTHH:MM" />
            <Field label="Item description *" value={itemDescription} onChangeText={setItemDescription} multiline placeholder="What was the item and how did you lose or find it?" />
            <Field label="What unique characteristics does this item have? *" value={identifyingFeatures} onChangeText={setIdentifyingFeatures} multiline placeholder="Scratches, stickers, engravings, damage, decorations, initials, or accessories" />
            <Field label="Contents (optional)" value={contents} onChangeText={setContents} multiline placeholder="List contents or accessories" />
            <Field label="Additional evidence (optional)" value={additionalEvidence} onChangeText={setAdditionalEvidence} multiline placeholder="Explain any additional proof or context" />
            <View style={styles.evidenceField}><Text style={styles.label}>Ownership evidence (optional)</Text><Text style={styles.helper}>Images and PDF documents are accepted. Actual file signatures are validated.</Text>
              {evidence ? <View style={styles.evidencePreview}><Image source={{ uri: evidence.uri }} style={styles.preview} /><Pressable onPress={() => setEvidence(null)} accessibilityRole="button"><Ionicons name="close-circle" size={25} color={colors.coral} /></Pressable></View> : <View style={styles.evidenceActions}><ActionButton title="Take photo" variant="secondary" onPress={() => void chooseEvidence('camera')} /><ActionButton title="Choose image" variant="quiet" onPress={() => void chooseEvidence('library')} /><ActionButton title="Choose PDF" variant="quiet" onPress={() => void chooseEvidence('document')} /></View>}
            </View>
            <ActionButton title="Submit claim" onPress={() => void handleSubmit()} loading={loading} disabled={loading} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Page>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 }, flex: { flex: 1 }, content: { padding: 18, paddingBottom: TAB_BAR_CONTENT_PADDING, gap: 15 },
  label: { color: colors.ink, fontSize: 13, fontWeight: '700' }, helper: { color: colors.muted, fontSize: 11, lineHeight: 16 },
  affiliationWrap: { gap: 7 }, affiliationRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  affiliation: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  affiliationActive: { borderColor: colors.maroon, backgroundColor: colors.maroonLight }, affiliationText: { color: colors.ink, fontSize: 12, fontWeight: '700' }, affiliationTextActive: { color: colors.maroonDark },
  evidenceField: { gap: 7 }, evidenceActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, evidencePreview: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  preview: { width: 90, height: 90, borderRadius: 9, backgroundColor: colors.maroonLight },
});