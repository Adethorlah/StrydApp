import { useState, useEffect, useCallback } from "react"
import { View, Text, StyleSheet, ScrollView } from "react-native"
import { router } from "expo-router"
import { theme } from "../../src/theme/tokens"
import { StyledInput } from "../../src/components/TextInput"
import { Button } from "../../src/components/Button"
import { useOnboarding } from "../../src/hooks/useOnboarding"
import { useAuth } from "../../src/hooks/useAuth"
import { useNotifications } from "../../src/hooks/useNotifications"
import { getUserName } from "../../src/lib/storage"
import { supabase } from "../../src/lib/supabase"
import { updateProfileName } from "../../src/lib/supabase-users"

export default function Settings() {
  const { userName, updateName } = useOnboarding()
  const { isAuthenticated, user, signOut, migrateGuestData } = useAuth()
  const { enabled: notificationsEnabled, toggleEnabled } = useNotifications()

  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState("")

  useEffect(() => {
    getUserName().then((n) => {
      if (n) setNameInput(n)
    })
  }, [])

  const handleSaveName = useCallback(async () => {
    if (!nameInput.trim()) return
    await updateName(nameInput.trim())
    if (user) {
      await updateProfileName(user.id, nameInput.trim())
    }
    setEditingName(false)
  }, [nameInput, user, updateName])

  const handleSignOut = useCallback(async () => {
    await signOut()
  }, [signOut])

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Profile</Text>
      <View style={styles.section}>
        {editingName ? (
          <View style={styles.nameEditRow}>
            <StyledInput
              value={nameInput}
              onChangeText={setNameInput}
              placeholder="Your name"
              style={styles.nameInput}
              onSubmitEditing={handleSaveName}
            />
            <Button title="Save" onPress={handleSaveName} variant="primary" />
          </View>
        ) : (
          <View style={styles.nameRow}>
            <Text style={styles.nameText}>{userName ?? "Guest"}</Text>
            <Button
              title="Edit"
              onPress={() => setEditingName(true)}
              variant="link"
            />
          </View>
        )}
      </View>

      <Text style={styles.sectionTitle}>Notifications</Text>
      <View style={styles.section}>
        <View style={styles.toggleRow}>
          <Text style={styles.settingText}>Enable notifications</Text>
          <Button
            title={notificationsEnabled ? "On" : "Off"}
            onPress={() => toggleEnabled(!notificationsEnabled)}
            variant={notificationsEnabled ? "primary" : "secondary"}
          />
        </View>
        <Text style={styles.hint}>Quiet hours: 10pm – 8am (fixed in v1.0)</Text>
      </View>

      <Text style={styles.sectionTitle}>Account</Text>
      <View style={styles.section}>
        {isAuthenticated ? (
          <>
            <Text style={styles.emailText}>{user?.email}</Text>
            <Button
              title="Sign out"
              onPress={handleSignOut}
              variant="secondary"
              style={styles.actionButton}
            />
          </>
        ) : (
          <>
            <Text style={styles.settingText}>Save your progress across devices</Text>
            <Button
              title="Save your progress"
              onPress={() => router.push("/sign-up")}
              variant="primary"
              style={styles.actionButton}
            />
          </>
        )}
      </View>

      <Text style={styles.sectionTitle}>About</Text>
      <View style={styles.section}>
        <Text style={styles.settingText}>Version 1.0.0</Text>
        <Button
          title="Privacy Policy"
          onPress={() => {}}
          variant="link"
        />
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.label.medium.fontSize,
    fontWeight: theme.typography.weight.semibold,
    color: theme.colors.primary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  section: {
    backgroundColor: theme.colors.surfaceContainerLow,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  nameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  nameEditRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  nameInput: {
    flex: 1,
  },
  nameText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body.large.fontSize,
    color: theme.colors.onSurface,
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  settingText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body.medium.fontSize,
    color: theme.colors.onSurface,
  },
  hint: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body.small.fontSize,
    color: theme.colors.onSurfaceVariant,
    marginTop: theme.spacing.sm,
  },
  emailText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body.medium.fontSize,
    color: theme.colors.onSurface,
    marginBottom: theme.spacing.sm,
  },
  actionButton: {
    marginTop: theme.spacing.sm,
  },
})
