import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionButton, Field, Heading, Notice, Page, SelectField, TAB_BAR_CONTENT_PADDING } from '@/src/components/ui';
import { useAuth } from '@/src/features/auth/AuthContext';
import { getBranches, getCategories, getLocations, submitReport } from '@/src/services/api/gapangita';
import type { Branch, Category, ImageAttachment, Location, PublicColor } from '@/src/types/api';
import { colors } from '@/src/theme/colors';

const PUBLIC_COLORS: PublicColor[] = [
  'Black', 'White', 'Gray', 'Silver', 'Brown', 'Beige', 'Red', 'Orange', 'Yellow',
  'Green', 'Blue', 'Purple', 'Pink', 'Gold', 'Multicolor', 'Transparent / Clear', 'Other', 'Unknown',
];

export default function ReportScreen() {
  const { user, isLoading: authLoading } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [itemType, setItemType] = useState<'lost' | 'found'>('lost');
  const [categoryCode, setCategoryCode] = useState('');
  const [branchCode, setBranchCode] = useState('');
  const [locationCode, setLocationCode] = useState('');
  const [publicColor, setPublicColor] = useState<PublicColor>('Unknown');
  const [dateFound, setDateFound] = useState(new Date());
  const [pickerMode, setPickerMode] = useState<'date' | 'time' | null>(null);
  const [image, setImage] = useState<ImageAttachment | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    void Promise.all([getCategories(), getBranches()]).then(([categoryRows, branchRows]) => {
      setCategories(categoryRows);
      setBranches(branchRows);
    }).catch((reason: Error) => setError(reason.message));
  }, []);

  useEffect(() => {
    if (!branchCode) return;
    let cancelled = false;
    void getLocations(branchCode)
      .then((rows) => { if (!cancelled) setLocations(rows); })
      .catch((reason: Error) => { if (!cancelled) setError(reason.message); });
    return () => { cancelled = true; };
  }, [branchCode]);

  async function chooseImage(source: 'camera' | 'library') {
    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.8 });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setImage({ uri: asset.uri, name: asset.fileName || `item-${Date.now()}.jpg`, mimeType: asset.mimeType || 'image/jpeg', file: asset.file });
  }

  async function handleSubmit() {
    setError('');
    setSuccess('');
    if (!name.trim() || !description.trim() || !categoryCode || !branchCode || !locationCode) {
      setError('Complete all required fields before submitting.');
      return;
    }
    if (description.trim().length < 8) { setError('Please add at least 8 characters to the description.'); return; }
    if (itemType === 'found' && !image) { setError('Add a photo for a found item.'); return; }

    setLoading(true);
    try {
      const dateValue = `${dateFound.getFullYear()}-${String(dateFound.getMonth() + 1).padStart(2, '0')}-${String(dateFound.getDate()).padStart(2, '0')}T${String(dateFound.getHours()).padStart(2, '0')}:${String(dateFound.getMinutes()).padStart(2, '0')}`;
      await submitReport({ name, description, itemType, categoryCode, branchCode, locationCode, dateFound: dateValue, publicColor, image });
      setSuccess('Report submitted. Your item is now in the open campus listings.');
      setName(''); setDescription(''); setImage(null); setPublicColor('Unknown');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not submit this report.');
      if (reason && typeof reason === 'object' && 'status' in reason && reason.status === 401) {
        router.push({ pathname: '/login', params: { returnTo: '/(tabs)/report' } });
      }
    } finally { setLoading(false); }
  }

  if (!authLoading && !user) {
    return <Page><SafeAreaView edges={['top']} style={styles.safe}><View style={styles.gate}><Heading>Sign in to report</Heading><Text style={styles.help}>A staff account is required to add an item to the campus listings.</Text><ActionButton title="Sign in" onPress={() => router.push({ pathname: '/login', params: { returnTo: '/(tabs)/report' } })} /></View></SafeAreaView></Page>;
  }

  return (
    <Page>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.headingBlock}><Text style={styles.kicker}>HELP IT FIND ITS WAY</Text><Heading>Report an item</Heading><Text style={styles.help}>Add enough detail for its owner to recognize it.</Text></View>
            {error ? <Notice tone="error">{error}</Notice> : null}
            {success ? <Notice>{success}</Notice> : null}
            <View style={styles.segment}>
              {(['lost', 'found'] as const).map((kind) => <Pressable key={kind} onPress={() => setItemType(kind)} style={[styles.segmentButton, itemType === kind && styles.segmentActive]}><Text style={[styles.segmentText, itemType === kind && styles.segmentTextActive]}>{kind === 'lost' ? 'I lost it' : 'I found it'}</Text></Pressable>)}
            </View>
            <Field label="Item name" value={name} onChangeText={setName} placeholder="e.g. Black water bottle" />
            <Field label="Description" value={description} onChangeText={setDescription} placeholder="Brand, markings, or other details" multiline />
            <SelectField
              label="Public color"
              value={publicColor}
              onChange={(value) => setPublicColor(value as PublicColor)}
              options={PUBLIC_COLORS.map((color) => ({ label: color, value: color }))}
            />
            <SelectField
              label="Category"
              value={categoryCode}
              onChange={setCategoryCode}
              options={[
                { label: 'Choose category', value: '' },
                ...categories.map((entry) => ({ label: entry.name, value: entry.category_code })),
              ]}
            />
            <SelectField
              label="School branch"
              value={branchCode}
              onChange={(value) => {
                setBranchCode(value);
                setLocationCode('');
                setLocations([]);
              }}
              options={[
                { label: 'Choose branch', value: '' },
                ...branches.map((entry) => ({ label: entry.name, value: entry.branch_code })),
              ]}
            />
            <SelectField
              label="Location"
              value={locationCode}
              onChange={setLocationCode}
              disabled={!branchCode}
              options={[
                { label: branchCode ? 'Choose location' : 'Choose a branch first', value: '' },
                ...locations.map((entry) => ({ label: entry.name, value: entry.location_code })),
              ]}
            />
            <View style={styles.field}>
              <Text style={styles.label}>Date and time {itemType === 'found' ? 'found' : 'last seen'}</Text>
              <View style={styles.dateRow}>
                <Pressable onPress={() => setPickerMode('date')} style={styles.dateButton}><Ionicons name="calendar-outline" size={18} color={colors.maroon} /><Text style={styles.dateText}>{dateFound.toLocaleDateString()}</Text></Pressable>
                <Pressable onPress={() => setPickerMode('time')} style={styles.dateButton}><Ionicons name="time-outline" size={18} color={colors.maroon} /><Text style={styles.dateText}>{dateFound.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text></Pressable>
              </View>
            </View>
            {pickerMode ? <DateTimePicker value={dateFound} mode={pickerMode} maximumDate={pickerMode === 'date' ? new Date() : undefined} onChange={(_, date) => { setPickerMode(Platform.OS === 'ios' ? pickerMode : null); if (date) setDateFound(date); }} /> : null}
            <View style={styles.field}><Text style={styles.label}>Item photo {itemType === 'found' ? '· required' : '· optional'}</Text>{image ? <View style={styles.previewWrap}><Image source={{ uri: image.uri }} style={styles.preview} /><Pressable onPress={() => setImage(null)} style={styles.remove}><Ionicons name="close-circle" size={25} color={colors.coral} /></Pressable></View> : <View style={styles.photoActions}><ActionButton title="Take photo" variant="secondary" onPress={() => void chooseImage('camera')} /><ActionButton title="Choose photo" variant="quiet" onPress={() => void chooseImage('library')} /></View>}</View>
            <ActionButton title="Submit report" onPress={() => void handleSubmit()} loading={loading} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Page>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  content: { padding: 18, paddingBottom: TAB_BAR_CONTENT_PADDING, gap: 12 },
  headingBlock: { gap: 5 },
  kicker: { color: colors.coral, fontSize: 10, fontWeight: '900', letterSpacing: 1.1 },
  help: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  segment: { flexDirection: 'row', padding: 4, borderRadius: 11, backgroundColor: colors.maroonLight, gap: 4 },
  segmentButton: { flex: 1, height: 39, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  segmentActive: { backgroundColor: colors.maroon },
  segmentText: { 
    color: colors.maroonDark, 
    fontSize: 13, 
    fontWeight: '800', 
    textTransform: 'capitalize' 
  },
  segmentTextActive: { 
    color: colors.white 
  },
  field: { 
    gap: 7 
  },
  label: { 
    color: colors.ink, 
    fontSize: 13, 
    fontWeight: '700' 
  },
  dateButton: {
    flex: 1,
    minHeight: 52,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  dateRow: { flexDirection: 'row', gap: 8 },
  dateText: { flex: 1, color: colors.ink, fontSize: 13 },
  photoActions: { flexDirection: 'row', gap: 9 },
  previewWrap: { position: 'relative' },
  preview: { height: 180, borderRadius: 10, backgroundColor: colors.maroonLight },
  remove: { position: 'absolute', right: 8, top: 8, backgroundColor: colors.white, borderRadius: 20 },
  gate: { flex: 1, padding: 22, justifyContent: 'center', gap: 14 },
});