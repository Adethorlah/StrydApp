import { useEffect, useRef } from "react"
import { View, Animated } from "react-native"
import { SvgXml } from "react-native-svg"
import { MASCOT_SVG } from "../assets/images/mascot"

interface CompanionAvatarProps {
  size?: number
}

export function CompanionAvatar({ size = 72 }: CompanionAvatarProps) {
  const anim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 2500, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 2500, useNativeDriver: true }),
      ])
    )
    loop.start()
    return () => loop.stop()
  }, [])

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -6],
  })

  const scale = anim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1.04, 1],
  })

  return (
    <Animated.View style={{ transform: [{ translateY }, { scale }] }}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: "transparent",
          shadowColor: "#6366F1",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.35,
          shadowRadius: 8,
          elevation: 8,
        }}
      >
        <SvgXml xml={MASCOT_SVG} width={size} height={size} />
      </View>
    </Animated.View>
  )
}
