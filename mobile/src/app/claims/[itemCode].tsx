import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionButton, Field, Heading, Notice, Page } from '@/src/components/ui';
import { useAuth } from '@/src/features/auth/AuthContext';
import { submitClaim } from '@/src/services/api/gapangita';
import type { ImageAttachment } from '@/src/types/api';
import { colors } from '@/src/theme/colors';

export default function ClaimScreen() {
  const { itemCode } = useLocalSearchParams<{ itemCode: string }>();
  const { user, isLoading: authLoading } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [proof, setProof] = useState<ImageAttachment | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function choosePhoto(source: 'camera' | 'library') {
    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.8 });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setProof({ uri: asset.uri, name: asset.fileName || `claim-${Date.now()}.jpg`, mimeType: asset.mimeType || 'image/jpeg', file: asset.file });
  }

  async function handleSubmit() {
    setError('');
    setSuccess('');
    if (!firstName.trim() || !lastName.trim() || !contactNumber.trim() || !proof) {
      setError('First name, last name, contact number, and proof photo are required.');
      return;
    }
    setLoading(true);
    try {
      await submitClaim({ itemCode, firstName, middleName, lastName, contactNumber, proof });
      setSuccess('Claim submitted. Staff will review your proof and contact you.');
      setFirstName('');
      setMiddleName('');
      setLastName('');
      setContactNumber('');
      setProof(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not submit your claim.');
      if (reason && typeof reason === 'object' && 'status' in reason && reason.status === 401) {
        router.push({ pathname: '/login', params: { returnTo: `/claims/${itemCode}` } });
      }
    } finally { setLoading(false); }
  }

  if (!authLoading && !user) {
    return <Page><SafeAreaView edges={['top']} style={styles.safe}><View style={styles.gate}><Heading>Sign in to claim</Heading><Text style={styles.copy}>A staff account is required to submit a claim and proof of ownership.</Text><ActionButton title="Sign in" onPress={() => router.push({ pathname: '/login', params: { returnTo: `/claims/${itemCode}` } })} /></View></SafeAreaView></Page>;
  }

  return (
    <Page>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Claim item',
          headerLeft: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Go back"
              onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
              hitSlop={10}>
              <Ionicons name="arrow-back" size={22} color={colors.maroon} />
            </Pressable>
          ),
        }}
      />
      <SafeAreaView edges={['top', 'bottom']} style={styles.safe}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <Heading>Claim this item</Heading>
            <Notice>Provide your contact details and a photo that helps staff verify ownership. Reference: {itemCode}</Notice>
            {error ? <Notice tone="error">{error}</Notice> : null}
            {success ? <Notice>{success}</Notice> : null}
            <Field label="First name" value={firstName} onChangeText={setFirstName} />
            <Field label="Middle name (optional)" value={middleName} onChangeText={setMiddleName} />
            <Field label="Last name" value={lastName} onChangeText={setLastName} />
            <Field label="Contact number" value={contactNumber} onChangeText={setContactNumber} keyboardType="phone-pad" />
            <View style={styles.photoField}>
              <Text style={styles.label}>Proof photo · required</Text>
              {proof ? <View><Image source={{ uri: proof.uri }} style={styles.preview} /><Pressable onPress={() => setProof(null)} style={styles.remove}><Ionicons name="close-circle" size={25} color={colors.coral} /></Pressable></View> : <View style={styles.photoActions}><ActionButton title="Take photo" variant="secondary" onPress={() => void choosePhoto('camera')} /><ActionButton title="Choose photo" variant="quiet" onPress={() => void choosePhoto('library')} /></View>}
            </View>
            <ActionButton title="Submit claim" onPress={() => void handleSubmit()} loading={loading} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Page>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  content: { padding: 18, gap: 15 },
  back: { color: colors.maroon, fontWeight: '800', fontSize: 13 },
  copy: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  label: { color: colors.ink, fontSize: 13, fontWeight: '700' },
  photoField: { gap: 8 },
  photoActions: { flexDirection: 'row', gap: 9 },
  preview: { height: 180, borderRadius: 10, backgroundColor: colors.maroonLight },
  remove: { position: 'absolute', right: 8, top: 8, backgroundColor: colors.white, borderRadius: 20 },
  gate: { flex: 1, padding: 22, justifyContent: 'center', gap: 14 },
});