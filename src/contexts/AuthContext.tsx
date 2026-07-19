import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react"
import { supabase } from "../services/supabase.service"
import { migrateGuestDataToSupabase } from "../lib/storage"
import { getOrCreateProfile } from "../services/users.service"
import { Session, User } from "@supabase/supabase-js"

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

  useEffect(() => {
    if (user && !hasAutoMigrated.current) {
      hasAutoMigrated.current = true
      migrateGuestDataToSupabase(user.id, supabase)
        .then(() => getOrCreateProfile(user.id, user.email ?? undefined))
        .catch((err) => console.warn("[Auth] Auto-migration failed:", err))
    }
  }, [user])

  const signInWithGoogle = useCallback(async () => {
    throw new Error("Google sign-in is not enabled yet.")
  }, [])

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
      isGoogleAuthEnabled: false,
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
