import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors } from '@/src/theme/colors';

export function Page({ children }: { children: ReactNode }) {
  return <View style={styles.page}>{children}</View>;
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <Text style={styles.eyebrow}>{children}</Text>;
}

export function Heading({ children }: { children: ReactNode }) {
  return <Text style={styles.heading}>{children}</Text>;
}

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  secureTextEntry = false,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        style={[styles.input, multiline && styles.multiline]}
      />
    </View>
  );
}

export function ActionButton({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'quiet';
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary' && styles.primaryButton,
        variant === 'secondary' && styles.secondaryButton,
        variant === 'quiet' && styles.quietButton,
        (disabled || pressed) && styles.dimmed,
      ]}>
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.white : colors.maroon} />
      ) : (
        <Text style={[styles.buttonText, variant !== 'primary' && styles.secondaryButtonText]}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

export function Notice({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'error' }) {
  return (
    <View style={[styles.notice, tone === 'error' && styles.errorNotice]}>
      <Text style={[styles.noticeText, tone === 'error' && styles.errorText]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.paper },
  eyebrow: { color: colors.coral, fontSize: 11, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' },
  heading: { color: colors.ink, fontSize: 29, fontWeight: '800' },
  fieldWrap: { gap: 7 },
  label: { color: colors.ink, fontSize: 13, fontWeight: '700' },
  input: {
    minHeight: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    color: colors.ink,
    fontSize: 15,
  },
  multiline: { minHeight: 100, paddingTop: 13 },
  button: { minHeight: 48, paddingHorizontal: 18, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  primaryButton: { backgroundColor: colors.maroon },
  secondaryButton: { backgroundColor: colors.maroonLight },
  quietButton: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.line },
  buttonText: { color: colors.white, fontSize: 14, fontWeight: '800' },
  secondaryButtonText: { color: colors.maroonDark },
  dimmed: { opacity: 0.55 },
  notice: { borderRadius: 10, backgroundColor: colors.maroonLight, padding: 13 },
  errorNotice: { backgroundColor: '#F8E6E1' },
  noticeText: { color: colors.maroonDark, fontSize: 13, lineHeight: 18 },
  errorText: { color: colors.error },
});