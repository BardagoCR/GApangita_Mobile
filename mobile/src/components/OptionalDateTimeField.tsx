import DateTimePicker from '@react-native-community/datetimepicker';
import { createElement, useState, type ChangeEvent } from 'react';
import { Platform, StyleSheet, Text, View, type ViewProps } from 'react-native';

import { ActionButton } from '@/src/components/ui';
import { colors } from '@/src/theme/colors';

function localDateTime(date: Date) {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function OptionalDateTimeField({ label, value, onChange, error, onLayout }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  onLayout?: ViewProps['onLayout'];
}) {
  const [mode, setMode] = useState<'date' | 'time' | null>(null);
  const [draft, setDraft] = useState(new Date());
  const parsed = new Date(value);
  const selected = value && Number.isFinite(parsed.getTime()) ? parsed : null;

  function openPicker(nextMode: 'date' | 'time') {
    const initial = selected ? new Date(selected) : new Date();
    if (!selected) initial.setHours(0, 0, 0, 0);
    setDraft(initial);
    setMode(nextMode);
  }

  function confirm(date: Date) {
    onChange(localDateTime(date));
    setMode(null);
  }

  return (
    <View style={styles.field} onLayout={onLayout}>
      <Text style={styles.label}>{label}</Text>
      {Platform.OS === 'web' ? createElement('input', {
        type: 'datetime-local',
        value,
        'aria-label': label,
        'aria-invalid': !!error,
        onChange: (event: ChangeEvent<HTMLInputElement>) => onChange(event.currentTarget.value),
        style: { minHeight: 48, borderRadius: 12, border: `1px solid ${error ? colors.error : colors.line}`, padding: '0 12px', font: 'inherit', color: colors.ink, backgroundColor: colors.white },
      }) : (
        <View style={styles.row}>
          <ActionButton title={selected ? selected.toLocaleDateString() : 'Choose date'} variant="secondary" onPress={() => openPicker('date')} />
          <ActionButton title={selected ? selected.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Choose time'} variant="secondary" disabled={!selected} onPress={() => openPicker('time')} />
        </View>
      )}
      {value ? <ActionButton title="Clear date and time" variant="quiet" onPress={() => { setMode(null); onChange(''); }} /> : null}
      {mode && Platform.OS !== 'web' ? (
        <View style={styles.field}>
          <DateTimePicker
            value={draft}
            mode={mode}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            maximumDate={mode === 'date' ? new Date() : undefined}
            onValueChange={(_, date) => {
              if (Platform.OS === 'android') {
                confirm(date);
              } else {
                setDraft(date);
              }
            }}
            onDismiss={() => setMode(null)}
          />
          {Platform.OS === 'ios' ? <View style={styles.row}>
            <ActionButton title="Done" onPress={() => confirm(draft)} />
            <ActionButton title="Cancel" variant="quiet" onPress={() => setMode(null)} />
          </View> : null}
        </View>
      ) : null}
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 7 },
  label: { color: colors.ink, fontSize: 13, fontWeight: '700' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  error: { color: colors.error, fontSize: 12 },
});
