import { useAppDialog } from '@/src/components/AppDialog';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Image, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionButton, Field, Heading, Notice, Page, TAB_BAR_CONTENT_PADDING } from '@/src/components/ui';
import { OptionalDateTimeField } from '@/src/components/OptionalDateTimeField';
import { submitClaim } from '@/src/services/api/gapangita';
import type { ClaimInput, ImageAttachment } from '@/src/types/api';
import { useAuth } from '@/src/features/auth/AuthContext';
import { validateClaim, type ClaimErrors, type ClaimField } from '@/src/features/claims/validation';
import { colors } from '@/src/theme/colors';

const affiliations = ['Student', 'Faculty', 'Staff', 'Visitor'] as const;

export default function ClaimScreen() {
  const { confirm, notify, dialog } = useAppDialog();
  const { user, isLoading: authLoading, authError, refreshAuth } = useAuth();
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
  const submitting = useRef(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [fieldErrors, setFieldErrors] = useState<ClaimErrors>({});
  const [feedbackRevision, setFeedbackRevision] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const positions = useRef<Partial<Record<ClaimField | 'summary', number>>>({});
  const revealTarget = useRef<ClaimField | 'summary' | null>(null);

  function scrollToFeedback() {
    const target = revealTarget.current;
    if (target) scrollRef.current?.scrollTo({ y: Math.max(0, (positions.current[target] || 0) - 18), animated: true });
  }

  useEffect(() => {
    if (!feedbackRevision) return;
    Keyboard.dismiss();
    const frame = requestAnimationFrame(scrollToFeedback);
    return () => cancelAnimationFrame(frame);
  }, [feedbackRevision]);

  function changeField(field: ClaimField, setter: (value: string) => void, value: string) {
    revealTarget.current = null;
    setter(value);
    setFieldErrors((previous) => ({ ...previous, [field]: undefined }));
  }

  async function chooseEvidence(source: 'camera' | 'library' | 'document') {
    try {
      if (source === 'document') {
        const DocumentPicker = await import('expo-document-picker');
        const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], copyToCacheDirectory: true });
        if (result.canceled || !result.assets?.[0]) return;
        const asset = result.assets[0];
        setEvidence({
          uri: asset.uri,
          name: asset.name,
          mimeType: asset.mimeType || 'application/pdf',
          size: asset.size,
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
        size: asset.fileSize,
        file: asset.file,
      });
    } catch (reason) {
      revealTarget.current = 'summary';
      setError(reason instanceof Error ? reason.message : 'Unable to open the attachment picker. Evidence is optional.');
      setFeedbackRevision((value) => value + 1);
    }
  }

  async function handleSubmit() {
    if (submitting.current || loading || user || authLoading || authError) return;
    setError('');
    setSuccess('');
    const input: ClaimInput = {
      itemCode, firstName, middleName, lastName, contactNumber, email, affiliation,
      lastSeenLocation, lastSeenDateTime: lastSeenDateTime.trim(), itemDescription,
      identifyingFeatures, contents, additionalEvidence, evidence,
    };
    const invalid = validateClaim(input);
    setFieldErrors(invalid);
    const firstInvalid = (['firstName', 'middleName', 'lastName', 'contactNumber', 'email', 'lastSeenLocation', 'lastSeenDateTime', 'itemDescription', 'identifyingFeatures', 'contents', 'additionalEvidence'] as ClaimField[]).find((field) => invalid[field]);
    if (firstInvalid) {
      revealTarget.current = firstInvalid;
      setError('Please correct the highlighted fields. Evidence attachments are optional.');
      setFeedbackRevision((value) => value + 1);
      return;
    }
    revealTarget.current = 'summary';
    submitting.current = true;
    const confirmed = await confirm({ title: 'Submit this claim?', message: `Send your ownership details for item ${itemCode} to staff for review? ${evidence ? 'Your evidence attachment will be included.' : 'No evidence attachment is included; it is optional.'}`, confirmLabel: 'Submit claim' });
    if (!confirmed) { submitting.current = false; return; }
    setLoading(true);
    try {
      await submitClaim(input);
      setSuccess('Claim submitted. Staff will review the ownership details and evidence.');
      setFeedbackRevision((value) => value + 1);
      setFirstName(''); setMiddleName(''); setLastName(''); setContactNumber(''); setEmail(''); setLastSeenLocation(''); setLastSeenDateTime('');
      setItemDescription(''); setIdentifyingFeatures(''); setContents(''); setAdditionalEvidence(''); setEvidence(null);
      await notify({ title: 'Claim submitted', message: 'Staff will review your ownership details. The item is reserved while your claim is pending.', tone: 'success' });
    } catch (reason) {
      revealTarget.current = 'summary';
      setError(reason instanceof Error ? reason.message : 'Unable to submit the claim.');
      setFeedbackRevision((value) => value + 1);
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  }

  if (user || authLoading || authError) {
    return <Page>{dialog}<SafeAreaView edges={['top', 'bottom']} style={styles.content}>
      <Heading>Public claim unavailable</Heading>
      <Notice>{user ? 'Sign out to submit a public claim.' : authLoading ? 'Checking your session...' : authError}</Notice>
      {authError ? <ActionButton title="Retry session check" onPress={() => void refreshAuth()} disabled={authLoading} /> : null}
      <ActionButton title="Back to listings" onPress={() => router.replace('/(tabs)')} />
    </SafeAreaView></Page>;
  }

  return (
    <Page>{dialog}
      <Stack.Screen options={{ headerShown: true, title: 'Claim item', headerLeft: () => <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} hitSlop={10}><Ionicons name="arrow-back" size={22} color={colors.maroon} /></Pressable> }} />
      <SafeAreaView edges={['top', 'bottom']} style={styles.safe}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
          <ScrollView ref={scrollRef} onContentSizeChange={scrollToFeedback} onScrollBeginDrag={() => { revealTarget.current = null; }} onTouchStart={() => { revealTarget.current = null; }} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <Heading>Claim this item</Heading>
            <Notice>Reference: {itemCode}. Your claim is public to submit, but staff-only review protects the identity details.</Notice>
            <View onLayout={(event) => { positions.current.summary = event.nativeEvent.layout.y; }}>
              {error ? <Notice tone="error">{error}</Notice> : null}
              {success ? <Notice>{success}</Notice> : null}
            </View>
            <Field label="First name *" value={firstName} error={fieldErrors.firstName} onLayout={(event) => { positions.current.firstName = event.nativeEvent.layout.y; }} onChangeText={(value) => changeField('firstName', setFirstName, value)} />
            <Field label="Middle name (optional)" value={middleName} error={fieldErrors.middleName} onLayout={(event) => { positions.current.middleName = event.nativeEvent.layout.y; }} onChangeText={(value) => changeField('middleName', setMiddleName, value)} />
            <Field label="Last name *" value={lastName} error={fieldErrors.lastName} onLayout={(event) => { positions.current.lastName = event.nativeEvent.layout.y; }} onChangeText={(value) => changeField('lastName', setLastName, value)} />
            <Field label="Contact number *" value={contactNumber} error={fieldErrors.contactNumber} onLayout={(event) => { positions.current.contactNumber = event.nativeEvent.layout.y; }} onChangeText={(value) => changeField('contactNumber', setContactNumber, value)} keyboardType="phone-pad" />
            <Field label="Email address *" value={email} error={fieldErrors.email} onLayout={(event) => { positions.current.email = event.nativeEvent.layout.y; }} onChangeText={(value) => changeField('email', setEmail, value)} keyboardType="email-address" />
            <View style={styles.affiliationWrap}><Text style={styles.label}>Affiliation *</Text><View style={styles.affiliationRow}>{affiliations.map((option) => <Pressable key={option} accessibilityRole="button" onPress={() => setAffiliation(option)} style={[styles.affiliation, affiliation === option && styles.affiliationActive]}><Text style={[styles.affiliationText, affiliation === option && styles.affiliationTextActive]}>{option}</Text></Pressable>)}</View></View>
            <Field label="Last-seen location (optional)" value={lastSeenLocation} error={fieldErrors.lastSeenLocation} onLayout={(event) => { positions.current.lastSeenLocation = event.nativeEvent.layout.y; }} onChangeText={(value) => changeField('lastSeenLocation', setLastSeenLocation, value)} placeholder="Building, room, or place" />
            <OptionalDateTimeField label="Approximate last-seen date/time (optional)" value={lastSeenDateTime} error={fieldErrors.lastSeenDateTime} onLayout={(event) => { positions.current.lastSeenDateTime = event.nativeEvent.layout.y; }} onChange={(value) => changeField('lastSeenDateTime', setLastSeenDateTime, value)} />
            <Field label="Item description *" value={itemDescription} error={fieldErrors.itemDescription} onLayout={(event) => { positions.current.itemDescription = event.nativeEvent.layout.y; }} onChangeText={(value) => changeField('itemDescription', setItemDescription, value)} multiline placeholder="What was the item and how did you lose or find it?" />
            <Field label="What unique characteristics does this item have? *" value={identifyingFeatures} error={fieldErrors.identifyingFeatures} onLayout={(event) => { positions.current.identifyingFeatures = event.nativeEvent.layout.y; }} onChangeText={(value) => changeField('identifyingFeatures', setIdentifyingFeatures, value)} multiline placeholder="Scratches, stickers, engravings, damage, decorations, initials, or accessories" />
            <Field label="Contents (optional)" value={contents} error={fieldErrors.contents} onLayout={(event) => { positions.current.contents = event.nativeEvent.layout.y; }} onChangeText={(value) => changeField('contents', setContents, value)} multiline placeholder="List contents or accessories" />
            <Field label="Additional evidence (optional)" value={additionalEvidence} error={fieldErrors.additionalEvidence} onLayout={(event) => { positions.current.additionalEvidence = event.nativeEvent.layout.y; }} onChangeText={(value) => changeField('additionalEvidence', setAdditionalEvidence, value)} multiline placeholder="Explain any additional proof or context" />
            <View style={styles.evidenceField}><Text style={styles.label}>Ownership evidence (optional)</Text><Text style={styles.helper}>Images and PDF documents are accepted. Actual file signatures are validated.</Text>
              {evidence ? <View style={styles.evidencePreview}>{evidence.mimeType === 'application/pdf' ? <Text style={styles.helper}>{evidence.name}</Text> : <Image source={{ uri: evidence.uri }} style={styles.preview} />}<Pressable onPress={() => setEvidence(null)} accessibilityRole="button"><Ionicons name="close-circle" size={25} color={colors.coral} /></Pressable></View> : <View style={styles.evidenceActions}><ActionButton title="Take photo" variant="secondary" onPress={() => void chooseEvidence('camera')} /><ActionButton title="Choose image" variant="quiet" onPress={() => void chooseEvidence('library')} /><ActionButton title="Choose PDF" variant="quiet" onPress={() => void chooseEvidence('document')} /></View>}
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