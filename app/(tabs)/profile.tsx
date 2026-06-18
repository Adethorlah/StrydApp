import { useState, useCallback } from "react"
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { router } from "expo-router"
import { Feather } from "@expo/vector-icons"
import { theme } from "../../src/theme/tokens"
import { InboxSheet } from "../../src/components/InboxSheet"
import { useOnboarding } from "../../src/hooks/useOnboarding"
import { useAuth } from "../../src/hooks/useAuth"
import { useNotifications } from "../../src/hooks/useNotifications"
import { useInbox } from "../../src/hooks/useInbox"
import { useTaskState } from "../../src/hooks/useTaskState"

function Avatar({ name, size = 80 }: { name: string; size?: number }) {
  const initial = (name ?? "?").charAt(0).toUpperCase()
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.42 }]}>{initial}</Text>
    </View>
  )
}

interface ToggleRowProps {
  label: string
  value: boolean
  onToggle: (val: boolean) => void
}

function ToggleRow({ label, value, onToggle }: ToggleRowProps) {
  return (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <TouchableOpacity
        onPress={() => onToggle(!value)}
        style={[styles.toggle, value && styles.toggleActive]}
      >
        <View style={[styles.toggleThumb, value && styles.toggleThumbActive]} />
      </TouchableOpacity>
    </View>
  )
}

interface SettingSectionProps {
  icon: keyof typeof Feather.glyphMap
  label: string
  isOpen: boolean
  onToggle: () => void
  children: React.ReactNode
}

function SettingSection({ icon, label, isOpen, onToggle, children }: SettingSectionProps) {
  return (
    <View style={styles.sectionWrapper}>
      <TouchableOpacity style={styles.settingRow} onPress={onToggle} activeOpacity={0.7}>
        <View style={styles.settingLeft}>
          <Feather name={icon} size={20} color={theme.colors.onSurfaceVariant} />
          <Text style={styles.settingLabel}>{label}</Text>
        </View>
        <Feather
          name="chevron-down"
          size={18}
          color={theme.colors.outline}
          style={{ transform: [{ rotate: isOpen ? "180deg" : "0deg" }] }}
        />
      </TouchableOpacity>
      {isOpen && <View style={styles.dropdown}>{children}</View>}
    </View>
  )
}

export default function Profile() {
  const insets = useSafeAreaInsets()
  const { userName } = useOnboarding()
  const { isAuthenticated, user, signOut } = useAuth()
  const { unreadCount } = useInbox()
  const { completedStepIds, currentTask, hasActiveTask } = useTaskState()

  const [inboxOpen, setInboxOpen] = useState(false)
  const [openSection, setOpenSection] = useState<string | null>(null)
  const { enabled: notificationsEnabled, toggleEnabled } = useNotifications()

  const handleSignOut = useCallback(() => {
    Alert.alert(
      "Sign out",
      "Your progress is saved to your account. You can sign back in anytime.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign out",
          style: "destructive",
          onPress: async () => {
            await signOut()
            router.replace("/(tabs)/home")
          },
        },
      ]
    )
  }, [signOut])

  const toggleSection = (section: string) => {
    setOpenSection(openSection === section ? null : section)
  }

  const displayName = userName ?? "Guest"
  const displayEmail = user?.email ?? ""
  const stepsDone = completedStepIds.length
  const totalSteps = currentTask?.steps.length ?? 0

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={() => setInboxOpen(true)} style={styles.bellButton}>
          <Feather name="bell" size={22} color={theme.colors.onSurfaceVariant} />
          {unreadCount > 0 && <View style={styles.bellDot} />}
        </TouchableOpacity>

        <View style={styles.profileTop}>
          <Avatar name={displayName} />
          <Text style={styles.nameText}>{displayName}</Text>
          {displayEmail ? <Text style={styles.emailText}>{displayEmail}</Text> : null}
        </View>

        <View style={styles.statsCard}>
          <View style={styles.statPanel}>
            <Text style={styles.statNumber}>1</Text>
            <Text style={styles.statLabel}>Task active</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statPanel}>
            <Text style={styles.statNumber}>
              {hasActiveTask ? `${stepsDone} / ${totalSteps}` : "--"}
            </Text>
            <Text style={styles.statLabel}>Steps done</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Settings</Text>

        <SettingSection
          icon="user"
          label="Account"
          isOpen={openSection === "account"}
          onToggle={() => toggleSection("account")}
        >
          <ToggleRow
            label="Notifications"
            value={notificationsEnabled}
            onToggle={toggleEnabled}
          />
          {isAuthenticated && (
            <ToggleRow
              label="Email updates"
              value={true}
              onToggle={() => {}}
            />
          )}
        </SettingSection>

        <SettingSection
          icon="help-circle"
          label="Support"
          isOpen={openSection === "support"}
          onToggle={() => toggleSection("support")}
        >
          <ToggleRow
            label="In-app tips"
            value={true}
            onToggle={() => {}}
          />
          <ToggleRow
            label="Onboarding hints"
            value={false}
            onToggle={() => {}}
          />
        </SettingSection>

        <SettingSection
          icon="clock"
          label="Task History"
          isOpen={openSection === "history"}
          onToggle={() => toggleSection("history")}
        >
          <ToggleRow
            label="Auto-archive completed"
            value={true}
            onToggle={() => {}}
          />
          <ToggleRow
            label="Show step timings"
            value={false}
            onToggle={() => {}}
          />
        </SettingSection>

        <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut}>
          <Feather name="log-out" size={18} color={theme.colors.error} />
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>

        <View style={{ height: theme.spacing.xl }} />
      </ScrollView>

      <InboxSheet isOpen={inboxOpen} onClose={() => setInboxOpen(false)} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },

  bellButton: {
    position: "absolute",
    top: theme.spacing.lg,
    right: theme.spacing.lg,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  bellDot: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.tertiary,
  },

  profileTop: {
    alignItems: "center",
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  avatar: {
    backgroundColor: theme.colors.secondaryContainer,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing.md,
  },
  avatarText: {
    fontFamily: theme.typography.fontFamily,
    fontWeight: theme.typography.weight.semibold,
    color: theme.colors.onSecondaryContainer,
  },
  nameText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.title.fontSize,
    fontWeight: theme.typography.weight.semibold,
    color: theme.colors.onBackground,
    marginBottom: 2,
  },
  emailText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body.medium.fontSize,
    color: theme.colors.onSurfaceVariant,
  },

  statsCard: {
    flexDirection: "row",
    backgroundColor: theme.colors.onSurface,
    borderRadius: 20,
    paddingVertical: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  statPanel: {
    flex: 1,
    alignItems: "center",
    gap: theme.spacing.xs,
  },
  statDivider: {
    width: 1,
    backgroundColor: theme.colors.inverseOnSurface,
    opacity: 0.12,
  },
  statNumber: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 30,
    fontWeight: theme.typography.weight.semibold,
    color: theme.colors.inverseOnSurface,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.label.small.fontSize,
    color: theme.colors.inverseOnSurface,
    opacity: 0.5,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },

  sectionTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.label.medium.fontSize,
    fontWeight: theme.typography.weight.semibold,
    color: theme.colors.onSurfaceVariant,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: theme.spacing.sm,
  },

  sectionWrapper: {
    backgroundColor: theme.colors.surfaceContainerLow,
    borderRadius: theme.radius.lg,
    marginBottom: 1,
    overflow: "hidden",
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: theme.spacing.md,
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
  },
  settingLabel: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body.medium.fontSize,
    color: theme.colors.onSurface,
  },
  dropdown: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    gap: 1,
  },

  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xs,
  },
  toggleLabel: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body.small.fontSize,
    color: theme.colors.onSurfaceVariant,
  },
  toggle: {
    width: 40,
    height: 22,
    borderRadius: 11,
    backgroundColor: theme.colors.surfaceContainerHighest,
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  toggleActive: {
    backgroundColor: theme.colors.tertiary,
  },
  toggleThumb: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleThumbActive: {
    alignSelf: "flex-end",
  },

  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
  },
  logoutText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body.medium.fontSize,
    color: theme.colors.error,
    fontWeight: theme.typography.weight.medium,
  },
})
