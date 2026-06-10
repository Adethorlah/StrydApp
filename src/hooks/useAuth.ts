import { useState, useEffect, useCallback } from "react"
import { supabase } from "../lib/supabase"
import { migrateGuestDataToSupabase } from "../lib/storage"
import { getOrCreateProfile } from "../lib/supabase-users"
import * as WebBrowser from "expo-web-browser"
import { Session, User } from "@supabase/supabase-js"

WebBrowser.maybeCompleteAuthSession()

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
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
        redirectTo: "strydapp://auth/callback",
        skipBrowserRedirect: true,
      },
    })

    if (error) throw error
    if (data?.url) {
      await WebBrowser.openAuthSessionAsync(data.url, "strydapp://auth/callback")
    }
  }, [])

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
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

  return {
    user,
    session,
    isLoading,
    isAuthenticated: !!user,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    migrateGuestData,
  }
}
