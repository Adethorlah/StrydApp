import { useEffect, useRef } from "react"
import { View, Animated } from "react-native"
import Svg, { Path, Circle, Defs, RadialGradient, Stop } from "react-native-svg"

interface CompanionAvatarProps {
  size?: number
}

export function CompanionAvatar({ size = 80 }: CompanionAvatarProps) {
  const pulse = useRef(new Animated.Value(1)).current
  const rotate = useRef(new Animated.Value(0)).current
  const gradId = useRef(`avatar-grad-${Math.random().toString(36).slice(2, 8)}`).current

  useEffect(() => {
    const pulseAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.05,
          duration: 2500,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 2500,
          useNativeDriver: true,
        }),
      ])
    )

    const rotateAnim = Animated.loop(
      Animated.timing(rotate, {
        toValue: 1,
        duration: 12000,
        useNativeDriver: true,
      })
    )

    pulseAnim.start()
    rotateAnim.start()

    return () => {
      pulseAnim.stop()
      rotateAnim.stop()
    }
  }, [])

  const spin = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  })

  const r = size / 2

  return (
    <Animated.View style={{ transform: [{ scale: pulse }] }}>
      <View style={{ width: size, height: size }}>
        <View
          style={{
            position: "absolute",
            width: size + 16,
            height: size + 16,
            borderRadius: (size + 16) / 2,
            backgroundColor: "rgba(139, 92, 246, 0.2)",
            top: -8,
            left: -8,
          }}
        />

        <Animated.View
          style={{
            position: "absolute",
            width: size,
            height: size,
            transform: [{ rotate: spin }],
          }}
        >
          <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <Defs>
              <RadialGradient id={gradId} cx="50%" cy="40%" r="60%">
                <Stop offset="0%" stopColor="hsl(239, 84%, 80%)" />
                <Stop offset="100%" stopColor="hsl(239, 84%, 50%)" />
              </RadialGradient>
            </Defs>
            <Circle cx={r} cy={r} r={r} fill={`url(#${gradId})`} />
            <Path
              d={`M ${r * 0.3} ${r * 0.5} Q ${r * 0.5} ${r * 0.1} ${r} ${r * 0.3} Q ${r * 1.5} ${r * 0.5} ${r * 1.2} ${r} Q ${r} ${r * 1.4} ${r * 0.7} ${r * 1.2}`}
              stroke="rgba(255,255,255,0.35)"
              strokeWidth={size * 0.08}
              fill="none"
              strokeLinecap="round"
            />
            <Path
              d={`M ${r * 0.5} ${r * 0.3} Q ${r * 0.8} ${r * 0.0} ${r * 1.2} ${r * 0.4} Q ${r * 1.6} ${r * 0.8} ${r * 1.1} ${r * 1.2} Q ${r * 0.8} ${r * 1.5} ${r * 0.5} ${r * 1.3}`}
              stroke="rgba(255,255,255,0.2)"
              strokeWidth={size * 0.05}
              fill="none"
              strokeLinecap="round"
            />
            <Path
              d={`M ${r * 0.8} ${r * 0.6} Q ${r} ${r * 0.3} ${r * 1.3} ${r * 0.7} Q ${r * 1.5} ${r} ${r * 1.1} ${r * 1.3}`}
              stroke="rgba(255,255,255,0.15)"
              strokeWidth={size * 0.04}
              fill="none"
              strokeLinecap="round"
            />
          </Svg>
        </Animated.View>

        <View
          style={{
            position: "absolute",
            width: size,
            height: size,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <View style={{ flexDirection: "row", gap: size * 0.14, marginBottom: size * 0.06 }}>
            <View
              style={{
                width: size * 0.12,
                height: size * 0.14,
                borderRadius: size * 0.07,
                backgroundColor: "#fff",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <View
                style={{
                  width: size * 0.06,
                  height: size * 0.07,
                  borderRadius: size * 0.04,
                  backgroundColor: "hsl(239, 84%, 40%)",
                }}
              />
            </View>
            <View
              style={{
                width: size * 0.12,
                height: size * 0.14,
                borderRadius: size * 0.07,
                backgroundColor: "#fff",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <View
                style={{
                  width: size * 0.06,
                  height: size * 0.07,
                  borderRadius: size * 0.04,
                  backgroundColor: "hsl(239, 84%, 40%)",
                }}
              />
            </View>
          </View>
          <View
            style={{
              width: size * 0.22,
              height: size * 0.1,
              borderBottomLeftRadius: size * 0.1,
              borderBottomRightRadius: size * 0.1,
              borderWidth: 2,
              borderColor: "rgba(255,255,255,0.9)",
              borderTopWidth: 0,
            }}
          />
        </View>
      </View>
    </Animated.View>
  )
}
