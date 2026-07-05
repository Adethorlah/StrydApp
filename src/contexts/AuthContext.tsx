import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react"
import { supabase } from "../services/supabase.service"
import { migrateGuestDataToSupabase } from "../lib/storage"
import { getOrCreateProfile } from "../services/users.service"
import * as Linking from "expo-linking"
import * as WebBrowser from "expo-web-browser"
import { Session, User } from "@supabase/supabase-js"

WebBrowser.maybeCompleteAuthSession()

interface AuthContextType {
  user: User | null
  session: Session | null
  isLoading: boolean
  isAuthenticated: boolean
  signInWithGoogle: () => Promise<User>
  signInWithEmail: (email: string, password: string) => Promise<User | null>
  signUpWithEmail: (email: string, password: string) => Promise<any>
  signOut: () => Promise<void>
  migrateGuestData: () => Promise<void>
  migrateWithUser: (u: User) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Linking.createURL generates the correct exp:// URL for Expo Go
const redirectTo = Linking.createURL("")

// Log during development so we can verify the redirect URI
console.log("[Auth] Redirect URI:", redirectTo)

function extractSessionParams(url: string): { access_token: string; refresh_token: string } | null {
  const parsedUrl = new URL(url)
  // Supabase puts tokens in the URL fragment (hash)
  const fragment = parsedUrl.hash.substring(1)
  const params = new URLSearchParams(fragment)

  // Also check query params as a fallback
  const accessToken = params.get("access_token") || parsedUrl.searchParams.get("access_token")
  const refreshToken = params.get("refresh_token") || parsedUrl.searchParams.get("refresh_token")

  if (accessToken && refreshToken) {
    return { access_token: accessToken, refresh_token: refreshToken }
  }
  return null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setIsLoading(false)
    }).catch(() => {
      setIsLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signInWithGoogle = useCallback(async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        skipBrowserRedirect: true,
      },
    })

    if (error) throw error
    if (!data?.url) throw new Error("No OAuth URL returned")

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo)

    if (result.type !== "success" || !result.url) {
      throw new Error("Sign in was cancelled")
    }

    // Extract tokens from the redirect URL
    const sessionParams = extractSessionParams(result.url)
    if (!sessionParams) {
      throw new Error("No session tokens found in redirect URL")
    }

    // Explicitly set the session with the extracted tokens
    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
      access_token: sessionParams.access_token,
      refresh_token: sessionParams.refresh_token,
    })

    if (sessionError) throw sessionError
    if (!sessionData.user) throw new Error("Session established but no user returned")

    return sessionData.user
  }, [])

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    const user = data.session?.user ?? null
    if (user) {
      setUser(user)
      setSession(data.session)
    }
    return user
  }, [])

  const signUpWithEmail = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    return data
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  const migrateGuestData = useCallback(async () => {
    if (!user) return
    await migrateGuestDataToSupabase(user.id, supabase)
    await getOrCreateProfile(user.id, user.email ?? undefined)
  }, [user])

  const migrateWithUser = useCallback(async (u: User) => {
    await migrateGuestDataToSupabase(u.id, supabase)
    await getOrCreateProfile(u.id, u.email ?? undefined)
  }, [])

  return (
    <AuthContext.Provider value={{
      user,
      session,
      isLoading,
      isAuthenticated: !!user,
      signInWithGoogle,
      signInWithEmail,
      signUpWithEmail,
      signOut,
      migrateGuestData,
      migrateWithUser,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext(): AuthContextType {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuthContext must be used within AuthProvider")
  return ctx
}
