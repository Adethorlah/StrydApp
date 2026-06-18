import { useState, useEffect, useCallback } from "react"
import { getOnboardingComplete, getUserName, setUserName } from "../lib/storage"

export function useOnboarding() {
  const [isComplete, setIsComplete] = useState<boolean | null>(null)
  const [userName, setUserNameState] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([getOnboardingComplete(), getUserName()]).then(
      ([complete, name]) => {
        setIsComplete(complete)
        setUserNameState(name)
      }
    )
  }, [])

  const updateName = useCallback(async (name: string) => {
    await setUserName(name)
    setUserNameState(name)
  }, [])

  return { isComplete, userName, updateName }
}
