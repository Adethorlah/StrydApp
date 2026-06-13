import { TouchableOpacity, Text, StyleSheet, ViewStyle } from "react-native"
import { theme } from "../theme/tokens"

interface ButtonProps {
  title: string
  onPress: () => void
  variant?: "primary" | "secondary" | "link" | "quiet"
  disabled?: boolean
  style?: ViewStyle
}

export function Button({ title, onPress, variant = "primary", disabled, style }: ButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.base,
        variant === "primary" && styles.primary,
        variant === "secondary" && styles.secondary,
        variant === "link" && styles.link,
        variant === "quiet" && styles.quiet,
        disabled && styles.disabled,
        style,
      ]}
      activeOpacity={0.7}
    >
      <Text
        style={[
          styles.text,
          variant === "primary" && styles.primaryText,
          variant === "secondary" && styles.secondaryText,
          variant === "link" && styles.linkText,
          variant === "quiet" && styles.quietText,
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 12,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  primary: {
    backgroundColor: theme.colors.primary,
  },
  secondary: {
    backgroundColor: theme.colors.secondaryContainer,
  },
  link: {
    backgroundColor: "transparent",
    paddingVertical: theme.spacing.sm,
  },
  quiet: {
    backgroundColor: "transparent",
    paddingVertical: theme.spacing.sm,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body.medium.fontSize,
    fontWeight: theme.typography.weight.medium,
  },
  primaryText: {
    color: theme.colors.onPrimary,
    fontWeight: theme.typography.weight.semibold,
  },
  secondaryText: {
    color: theme.colors.onSecondaryContainer,
  },
  linkText: {
    color: theme.colors.primary,
    textDecorationLine: "underline",
  },
  quietText: {
    color: theme.colors.onSurfaceVariant,
    fontSize: theme.typography.body.small.fontSize,
  },
})
