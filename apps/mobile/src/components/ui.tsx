import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { formatEventDate, toIsoDate } from '@amigo/shared/format';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export const colors = {
  primary: '#C8102E',
  primaryText: '#FFFFFF',
  text: '#1F2933',
  muted: '#6B7280',
  background: '#F6F5F2',
  card: '#FFFFFF',
  border: '#E3E1DC',
  success: '#15803D',
  danger: '#B91C1C',
  chip: '#EFEDE8',
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };

export function Screen({
  children,
  refreshing,
  onRefresh,
}: {
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
}) {
  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.screen}
        keyboardShouldPersistTaps="handled"
        refreshControl={onRefresh ? <RefreshControl refreshing={refreshing ?? false} onRefresh={onRefresh} /> : undefined}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function Loading() {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

export function H1({ children }: { children: ReactNode }) {
  return <Text style={styles.h1}>{children}</Text>;
}

export function H2({ children }: { children: ReactNode }) {
  return <Text style={styles.h2}>{children}</Text>;
}

export function P({ children, muted }: { children: ReactNode; muted?: boolean }) {
  return <Text style={[styles.p, muted && styles.muted]}>{children}</Text>;
}

export function Card({ children }: { children: ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

export function Row({ children }: { children: ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  small,
}: {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  small?: boolean;
}) {
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [
        styles.button,
        small && styles.buttonSmall,
        styles[variant],
        pressed && styles.pressed,
        inactive && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' || variant === 'danger' ? colors.primaryText : colors.primary} />
      ) : (
        <Text style={[styles.buttonText, small && styles.buttonTextSmall, styles[`${variant}Text`]]}>{title}</Text>
      )}
    </Pressable>
  );
}

export function Field({ label, error, ...input }: TextInputProps & { label: string; error?: string | null }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput placeholderTextColor={colors.muted} style={styles.input} {...input} />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

export function ErrorBox({ message }: { message: string | null | undefined }) {
  if (!message) return null;
  return (
    <View style={styles.errorBox}>
      <Text style={styles.errorBoxText}>{message}</Text>
    </View>
  );
}

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'success' | 'primary' }) {
  return (
    <View style={[styles.badge, tone === 'success' && styles.badgeSuccess, tone === 'primary' && styles.badgePrimary]}>
      <Text style={[styles.badgeText, tone !== 'neutral' && styles.badgeTextStrong]}>{label}</Text>
    </View>
  );
}

export function SwitchRow({
  label,
  help,
  value,
  onValueChange,
  disabled,
}: {
  label: string;
  help?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.switchRow}>
      <View style={styles.flex}>
        <Text style={styles.p}>{label}</Text>
        {help ? <Text style={[styles.small, styles.muted]}>{help}</Text> : null}
      </View>
      <Switch value={value} onValueChange={onValueChange} disabled={disabled} trackColor={{ true: colors.primary }} />
    </View>
  );
}

/** Selector de una opción entre varias, como fichas. */
export function ChipSelect<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.chips}>
      {options.map((o) => (
        <Pressable
          key={o.value}
          onPress={() => onChange(o.value)}
          style={[styles.chip, o.value === value && styles.chipSelected]}
        >
          <Text style={[styles.chipText, o.value === value && styles.chipTextSelected]}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

/** Fecha en formato `YYYY-MM-DD`, con el selector nativo de Android. */
export function DateField({
  label,
  value,
  onChange,
  minimumDate,
}: {
  label: string;
  value: string;
  onChange: (isoDate: string) => void;
  minimumDate?: Date;
}) {
  const open = () => {
    const [y, m, d] = value.split('-').map(Number);
    DateTimePickerAndroid.open({
      value: new Date(y ?? 2026, (m ?? 1) - 1, d ?? 1),
      mode: 'date',
      minimumDate,
      onChange: (event, date) => {
        if (event.type === 'set' && date) onChange(toIsoDate(date));
      },
    });
  };
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Pressable onPress={open} style={styles.input}>
        <Text style={styles.p}>{formatEventDate(value)}</Text>
      </Pressable>
    </View>
  );
}

export const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  screen: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xl * 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  flex: { flex: 1 },
  h1: { fontSize: 26, fontWeight: '700', color: colors.text },
  h2: { fontSize: 18, fontWeight: '700', color: colors.text },
  p: { fontSize: 16, color: colors.text, lineHeight: 22 },
  small: { fontSize: 13, lineHeight: 18 },
  muted: { color: colors.muted },
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  button: {
    minHeight: 48,
    borderRadius: 12,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSmall: { minHeight: 36, paddingHorizontal: spacing.md, borderRadius: 10 },
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  danger: { backgroundColor: colors.danger },
  ghost: { backgroundColor: 'transparent' },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.5 },
  buttonText: { fontSize: 16, fontWeight: '600' },
  buttonTextSmall: { fontSize: 14 },
  primaryText: { color: colors.primaryText },
  secondaryText: { color: colors.text },
  dangerText: { color: colors.primaryText },
  ghostText: { color: colors.primary },
  field: { gap: spacing.xs },
  label: { fontSize: 14, fontWeight: '600', color: colors.text },
  input: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
    fontSize: 16,
    color: colors.text,
  },
  errorText: { fontSize: 13, color: colors.danger },
  errorBox: { backgroundColor: '#FDECEC', borderRadius: 12, padding: spacing.md },
  errorBoxText: { color: colors.danger, fontSize: 15, lineHeight: 21 },
  badge: { backgroundColor: colors.chip, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  badgeSuccess: { backgroundColor: '#E3F4E8' },
  badgePrimary: { backgroundColor: '#FBE5E8' },
  badgeText: { fontSize: 12, color: colors.muted },
  badgeTextStrong: { color: colors.text, fontWeight: '600' },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { backgroundColor: colors.chip, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  chipSelected: { backgroundColor: colors.primary },
  chipText: { fontSize: 14, color: colors.text },
  chipTextSelected: { color: colors.primaryText, fontWeight: '600' },
});
