import { useEffect, useRef, useState } from "react"
import { View, Text, Animated, StyleSheet } from "react-native"
import { Redirect } from "expo-router"
import { getOnboardingComplete } from "../src/lib/storage"
import { StrydLogo } from "../src/components/icons/StrydLogo"
import { theme } from "../src/theme/tokens"

const LOGO_SIZE = 76

export default function Index() {
  const [route, setRoute] = useState<"onboarding" | "tabs" | null>(null)

  const wordmarkScale = useRef(new Animated.Value(0.3)).current
  const wordmarkFade = useRef(new Animated.Value(0)).current
  const wordmarkRotate = useRef(new Animated.Value(-3)).current

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(wordmarkScale, {
          toValue: 1,
          friction: 4,
          tension: 60,
          useNativeDriver: true,
        }),
        Animated.spring(wordmarkRotate, {
          toValue: 0,
          friction: 5,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(wordmarkFade, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(2000),
    ]).start(() => {
      getOnboardingComplete().then((complete) => {
        setRoute(complete ? "tabs" : "onboarding")
      })
    })
  }, [])

  if (route === null) {
    return (
      <View style={styles.container}>
        <Animated.View
          style={[
            styles.logoRow,
            {
              opacity: wordmarkFade,
              transform: [
                { scale: wordmarkScale },
                {
                  rotate: wordmarkRotate.interpolate({
                    inputRange: [-3, 0],
                    outputRange: ["-3deg", "0deg"],
                  }),
                },
              ],
            },
          ]}
        >
          <StrydLogo color={theme.colors.onPrimary} size={LOGO_SIZE} />
          <Text style={styles.wordText}>TRYD</Text>
        </Animated.View>
        <Text style={styles.tagline}>Turn big tasks into small steps.</Text>
      </View>
    )
  }

  if (route === "onboarding") {
    return <Redirect href="/(onboarding)/welcome-2" />
  }
  return <Redirect href="/(tabs)/home" />
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.colors.primary,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  wordText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 36,
    fontWeight: "700",
    color: theme.colors.onPrimary,
    letterSpacing: -1,
    marginLeft: -2,
  },
  tagline: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body.large.fontSize,
    fontWeight: theme.typography.weight.medium,
    color: theme.colors.onPrimary,
    textAlign: "center",
    paddingHorizontal: theme.spacing.xl,
    marginTop: theme.spacing.md,
  },
})
