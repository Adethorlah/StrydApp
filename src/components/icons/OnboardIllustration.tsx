import { Dimensions, StyleSheet, View } from "react-native"
import Svg, { Rect, Image as SvgImage } from "react-native-svg"

const { width: W, height: H } = Dimensions.get("window")

export function OnboardIllustration() {
  return (
    <View style={StyleSheet.absoluteFill}>
      <Svg width={W} height={H} viewBox="0 0 419 504" preserveAspectRatio="xMidYMid slice">
        <SvgImage
          x="0"
          y="0"
          width="418.429"
          height="503.388"
          href={require("../../assets/images/onboard-1.png")}
          opacity={0.65}
        />
        <Rect x="130" y="130" width="70" height="70" rx="35" fill="#ceddf1" />
        <Rect x="60" y="180" width="50" height="50" rx="25" fill="#ecf1f9" />
      </Svg>
    </View>
  )
}
