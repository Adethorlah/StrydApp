import { useState, useEffect, useCallback, useRef } from "react"
import { supabase } from "../lib/supabase"
import { migrateGuestDataToSupabase } from "../lib/storage"
import { getOrCreateProfile } from "../lib/supabase-users"
import * as WebBrowser from "expo-web-browser"
import { Session, User } from "@supabase/supabase-js"

WebBrowser.maybeCompleteAuthSession()

function stall(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

type PendingAuth = {
  resolve: (user: User) => void
  reject: (err: Error) => void
  timeoutId: ReturnType<typeof setTimeout>
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const pendingAuthRef = useRef<PendingAuth | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setIsLoading(false)
    }).catch(() => {
      setIsLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)

        if (event === "SIGNED_IN" && session?.user && pendingAuthRef.current) {
          clearTimeout(pendingAuthRef.current.timeoutId)
          pendingAuthRef.current.resolve(session.user)
          pendingAuthRef.current = null
        }
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
    if (!data?.url) throw new Error("No OAuth URL returned")

    const result = await WebBrowser.openAuthSessionAsync(data.url, "strydapp://auth/callback")

    if (result.type === "cancel" || result.type === "dismiss") {
      throw new Error("Sign in was cancelled")
    }

    const authResult = await new Promise<User>((resolve, reject) => {
      const timeoutId = setTimeout(async () => {
        for (let i = 0; i < 20; i++) {
          const { data: { session } } = await supabase.auth.getSession()
          if (session?.user) {
            resolve(session.user)
            return
          }
          await stall(300)
        }
        pendingAuthRef.current = null
        reject(new Error("Session not established after sign in"))
      }, 1500)

      pendingAuthRef.current = { resolve, reject, timeoutId }
    })

    return authResult
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
    migrateWithUser,
  }
}
