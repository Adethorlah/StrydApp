import { useState, useEffect } from "react"
import { Dimensions, StyleSheet, View, Image } from "react-native"
import Svg, { Rect } from "react-native-svg"

export function OnboardIllustration() {
  const [dims, setDims] = useState(() => Dimensions.get("window"))

  useEffect(() => {
    const sub = Dimensions.addEventListener("change", ({ window }) => setDims(window))
    return () => sub.remove()
  }, [])

  const { width: W, height: H } = dims

  return (
    <View style={StyleSheet.absoluteFill}>
      <Image
        source={require("../../assets/images/onboard-1.png")}
        style={{ width: W, height: H, opacity: 0.65, position: "absolute" }}
        resizeMode="cover"
      />
      <Svg width={W} height={H} viewBox="0 0 419 504" preserveAspectRatio="xMidYMid slice" style={StyleSheet.absoluteFill}>
        <Rect x="141" y="141" width="46" height="46" rx="23" fill="#C7D5EF" />
        <Rect x="62" y="180" width="46" height="46" rx="23" fill="#E3E9F6" />
      </Svg>
    </View>
  )
}
