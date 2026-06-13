import { useFonts, Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold } from "@expo-google-fonts/outfit"

export function useAppFonts() {
  const [fontsLoaded, fontsError] = useFonts({
    "Outfit": Outfit_400Regular,
    "Outfit-Medium": Outfit_500Medium,
    "Outfit-SemiBold": Outfit_600SemiBold,
  })

  return { fontsLoaded, fontsError }
}