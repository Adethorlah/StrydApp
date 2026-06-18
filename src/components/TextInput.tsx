import { useState, useCallback } from "react"
import {
  TextInput as RNTextInput,
  StyleSheet,
  TextInputProps,
  View,
  Platform,
} from "react-native"
import { theme } from "../theme/tokens"

interface StyledInputProps extends TextInputProps {
  variant?: "large" | "standard"
  inputStyle?: object
}

export function StyledInput({ variant = "standard", style, inputStyle, multiline, onContentSizeChange, ...props }: StyledInputProps) {
  const [inputHeight, setInputHeight] = useState<number | undefined>(undefined)

  const handleContentSizeChange = useCallback((e: any) => {
    if (multiline) {
      const newHeight = e.nativeEvent.contentSize.height
      setInputHeight(newHeight)
    }
    onContentSizeChange?.(e)
  }, [multiline, onContentSizeChange])

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
          Platform.OS === "web" && { outlineStyle: "none" },
          multiline && inputHeight ? { height: Math.max(inputHeight, 40) } : undefined,
          inputStyle,
        ]}
        placeholderTextColor={theme.colors.onSurfaceVariant}
        multiline={multiline}
        onContentSizeChange={handleContentSizeChange}
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
    backgroundColor: theme.colors.surfaceContainerLow,
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
