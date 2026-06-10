import { useEffect, useRef } from "react"
import { View, Text, StyleSheet, Animated } from "react-native"
import { theme } from "../theme/tokens"

interface LoadingStateProps {
  message: string
}

export function LoadingState({ message }: LoadingStateProps) {
  const opacity = useRef(new Animated.Value(0.3)).current

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    )
    animation.start()
    return () => animation.stop()
  }, [opacity])

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.indicator, { opacity }]}>
        <View style={styles.dot} />
      </Animated.View>
      <Text style={styles.message}>{message}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacing.xl,
  },
  indicator: {
    marginBottom: theme.spacing.lg,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.primary,
  },
  message: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body.large.fontSize,
    color: theme.colors.onSurfaceVariant,
    textAlign: "center",
    lineHeight: theme.typography.body.large.lineHeight,
  },
})
