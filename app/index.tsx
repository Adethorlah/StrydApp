import { useEffect, useState } from "react"
import { View, Text, StyleSheet } from "react-native"
import { Redirect } from "expo-router"
import { getOnboardingComplete } from "../src/lib/storage"

export default function Index() {
  const [route, setRoute] = useState<"onboarding" | "tabs" | null>(null)

  useEffect(() => {
    getOnboardingComplete().then((complete) => {
      setRoute(complete ? "tabs" : "onboarding")
    })
  }, [])

  if (route === null) {
    return (
      <View style={styles.splash}>
        <Text style={styles.splashText}>STRYD</Text>
      </View>
    )
  }

  if (route === "onboarding") {
    return <Redirect href="/(onboarding)/welcome-1" />
  }
  return <Redirect href="/(tabs)/home" />
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  splashText: {
    fontFamily: "Outfit",
    fontSize: 32,
    fontWeight: "600",
    letterSpacing: 4,
    color: "#000",
  },
})
