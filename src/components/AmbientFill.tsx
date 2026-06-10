import { useEffect, useRef } from "react"
import { Animated, StyleSheet } from "react-native"
import { theme } from "../theme/tokens"

interface AmbientFillProps {
  durationMinutes: number
  isActive: boolean
}

export function AmbientFill({ durationMinutes, isActive }: AmbientFillProps) {
  const fillHeight = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (!isActive || durationMinutes <= 0) return

    const durationMs = durationMinutes * 60 * 1000

    fillHeight.setValue(0)
    const animation = Animated.timing(fillHeight, {
      toValue: 1,
      duration: durationMs,
      useNativeDriver: false,
    })
    animation.start()

    return () => animation.stop()
  }, [isActive, durationMinutes, fillHeight])

  return (
    <Animated.View
      style={[
        styles.fill,
        {
          height: fillHeight.interpolate({
            inputRange: [0, 1],
            outputRange: ["0%", "100%"],
          }),
        },
      ]}
      pointerEvents="none"
    />
  )
}

const styles = StyleSheet.create({
  fill: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.primaryContainer,
    opacity: 0.3,
  },
})
