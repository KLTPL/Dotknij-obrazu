import { Pressable, StyleSheet, Text } from 'react-native';

import { COLORS, MIN_TARGET, RADIUS, SPACING, TYPE } from '@/theme';

type Props = {
  label: string;
  onPress: () => void;
  /** What a screen reader says instead of the visible label, when the label alone is unclear. */
  accessibilityLabel?: string;
  accessibilityHint?: string;
  /** The main action of a screen: yellow and taller. */
  primary?: boolean;
};

/** A button at least the size of a fingertip that grows with the phone's font size instead of cutting text. */
export function Button({ label, onPress, accessibilityLabel, accessibilityHint, primary = false }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.button, primary && styles.primary, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
    >
      <Text style={[styles.label, primary && styles.primaryLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: MIN_TARGET,
    minWidth: MIN_TARGET,
    justifyContent: 'center',
    paddingHorizontal: SPACING.l,
    paddingVertical: SPACING.s,
    borderRadius: RADIUS,
    backgroundColor: COLORS.surfaceRaised,
  },
  primary: { minHeight: 56, backgroundColor: COLORS.accent },
  pressed: { opacity: 0.7 },
  label: { ...TYPE.body, color: COLORS.text, textAlign: 'center' },
  primaryLabel: { ...TYPE.heading, color: COLORS.onAccent },
});
