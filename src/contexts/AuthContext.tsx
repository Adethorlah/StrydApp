import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react"
import { supabase } from "../services/supabase.service"
import { migrateGuestDataToSupabase } from "../lib/storage"
import { getOrCreateProfile } from "../services/users.service"
import * as Google from "expo-auth-session/providers/google"
import * as WebBrowser from "expo-web-browser"
import { makeRedirectUri } from "expo-auth-session"
import { Session, User } from "@supabase/supabase-js"

WebBrowser.maybeCompleteAuthSession()

const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? ""
const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? ""

// Set to true to enable Google sign-in (requires valid client IDs in Google Cloud Console)
const GOOGLE_AUTH_ENABLED = false

// Set to true to enable email sign-up/sign-in
const EMAIL_AUTH_ENABLED = false

interface AuthContextType {
  user: User | null
  session: Session | null
  isLoading: boolean
  isAuthenticated: boolean
  isGoogleAuthEnabled: boolean
  isEmailAuthEnabled: boolean
  signInWithGoogle: () => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<User | null>
  signUpWithEmail: (email: string, password: string) => Promise<any>
  signOut: () => Promise<void>
  migrateGuestData: () => Promise<void>
  migrateWithUser: (u: User) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const hasAutoMigrated = useRef(false)

  // Google auth via expo-auth-session: gets id_token directly, no redirect needed
  const redirectUri = makeRedirectUri({
    scheme: "strydapp",
    path: "redirect",
  })

  const [googleRequest, googleResponse, googlePromptAsync] = Google.useIdTokenAuthRequest({
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
    webClientId: GOOGLE_WEB_CLIENT_ID,
    redirectUri,
  })

  // Initialize session on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      if (currentSession) {
        setSession(currentSession)
        setUser(currentSession.user ?? null)
      }
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

  // Handle Google auth response: pass id_token to Supabase
  useEffect(() => {
    if (googleResponse?.type !== "success") return

    const idToken = googleResponse.params?.id_token
    if (!idToken) {
      console.error("[Auth] Google auth succeeded but no id_token returned")
      return
    }

    supabase.auth.signInWithIdToken({
      provider: "google",
      token: idToken,
    }).then(({ error }) => {
      if (error) {
        console.error("[Auth] signInWithIdToken error:", error.message)
      }
    }).catch((err) => {
      console.error("[Auth] signInWithIdToken failed:", err)
    })
  }, [googleResponse])

  // Auto-migrate guest data when user transitions from null to non-null
  useEffect(() => {
    if (user && !hasAutoMigrated.current) {
      hasAutoMigrated.current = true
      migrateGuestDataToSupabase(user.id, supabase)
        .then(() => getOrCreateProfile(user.id, user.email ?? undefined))
        .catch((err) => console.warn("[Auth] Auto-migration failed:", err))
    }
  }, [user])

  const signInWithGoogle = useCallback(async () => {
    if (!GOOGLE_AUTH_ENABLED) {
      throw new Error("Google sign-in is not enabled yet.")
    }
    if (!googleRequest) {
      throw new Error("Google auth not ready. Please try again.")
    }
    await googlePromptAsync()
  }, [googleRequest, googlePromptAsync])

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    const u = data.session?.user ?? null
    if (u) {
      setUser(u)
      setSession(data.session)
    }
    return u
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
      isGoogleAuthEnabled: GOOGLE_AUTH_ENABLED,
      isEmailAuthEnabled: EMAIL_AUTH_ENABLED,
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
