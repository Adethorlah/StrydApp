import { useEffect, useState } from "react"
import { useFonts, Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold, Outfit_700Bold } from "@expo-google-fonts/outfit"

export function useAppFonts() {
  const [fontsLoaded, fontsError] = useFonts({
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
  })
  
  const [fontTimeout, setFontTimeout] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setFontTimeout(true), 2500)
    return () => clearTimeout(timer)
  }, [])

  return { fontsLoaded: fontsLoaded || fontTimeout, fontsError }
}