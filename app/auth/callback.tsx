import { useEffect } from "react"
import { View, Text, ActivityIndicator, StyleSheet } from "react-native"
import { router } from "expo-router"
import { supabase } from "../../src/lib/supabase"

export default function AuthCallback() {
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace("/(tabs)/home")
      } else {
        router.replace("/sign-up")
      }
    })
  }, [])

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" />
      <Text style={styles.text}>Completing sign in...</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  text: {
    fontSize: 16,
    color: "#666",
  },
})
