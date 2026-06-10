import {
  TextInput as RNTextInput,
  StyleSheet,
  TextInputProps,
  View,
} from "react-native"
import { theme } from "../theme/tokens"

interface StyledInputProps extends TextInputProps {
  variant?: "large" | "standard"
}

export function StyledInput({ variant = "standard", style, ...props }: StyledInputProps) {
  return (
    <View
      style={[
        styles.container,
        variant === "large" && styles.largeContainer,
        style,
      ]}
    >
      <RNTextInput
        style={[
          styles.input,
          variant === "large" && styles.largeInput,
        ]}
        placeholderTextColor={theme.colors.onSurfaceVariant}
        {...props}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: theme.colors.outline,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
  },
  largeContainer: {
    paddingVertical: theme.spacing.md,
  },
  input: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body.medium.fontSize,
    color: theme.colors.onSurface,
    lineHeight: theme.typography.body.medium.lineHeight,
  },
  largeInput: {
    fontSize: theme.typography.title.fontSize,
    lineHeight: theme.typography.title.lineHeight,
    textAlign: "center",
  },
})
