import { View, Text, StyleSheet } from "react-native"
import { Stack } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useAppFonts } from "../src/theme/useAppFonts"
import { ChatProvider } from "../src/contexts/ChatContext"
import { AuthProvider } from "../src/contexts/AuthContext"

const queryClient = new QueryClient()

export default function RootLayout() {
  const { fontsLoaded } = useAppFonts()

  if (!fontsLoaded) {
    return (
      <View style={styles.splash}>
        <Text style={styles.splashText}>STRYD</Text>
      </View>
    )
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ChatProvider>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false, animation: "fade" }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="focus-timer"
          options={{ headerShown: false, presentation: "fullScreenModal" }}
        />
        <Stack.Screen
          name="sign-up"
          options={{ headerShown: false, presentation: "modal" }}
        />
      </Stack>
        </ChatProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
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
