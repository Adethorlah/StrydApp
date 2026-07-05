import { useState, useCallback } from "react"
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { router } from "expo-router"
import { useFocusEffect } from "@react-navigation/native"
import { Feather } from "@expo/vector-icons"
import { theme } from "../../src/theme/tokens"
import { InboxSheet } from "../../src/components/InboxSheet"
import { useOnboarding } from "../../src/hooks/useOnboarding"
import { useAuth } from "../../src/hooks/useAuth"
import { useNotifications } from "../../src/hooks/useNotifications"
import { useInbox } from "../../src/hooks/useInbox"
import { useTaskState } from "../../src/hooks/useTaskState"
import { getTasksCompletedCount } from "../../src/lib/storage"

function Avatar({ name, size = 80 }: { name: string; size?: number }) {
  const initial = (name ?? "?").charAt(0).toUpperCase()
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.42 }]}>{initial}</Text>
    </View>
  )
}

interface SettingRowProps {
  icon: keyof typeof Feather.glyphMap
  label: string
  onPress?: () => void
  right?: React.ReactNode
}

function SettingRow({ icon, label, onPress, right }: SettingRowProps) {
  return (
    <TouchableOpacity style={styles.settingRow} onPress={onPress} activeOpacity={onPress ? 0.7 : 1} disabled={!onPress}>
      <View style={styles.settingLeft}>
        <Feather name={icon} size={20} color={theme.colors.onSurfaceVariant} />
        <Text style={styles.settingLabel}>{label}</Text>
      </View>
      {right ?? <Feather name="chevron-right" size={18} color={theme.colors.outline} />}
    </TouchableOpacity>
  )
}

function Badge({ count }: { count: number }) {
  if (count === 0) return null
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{count}</Text>
    </View>
  )
}

export default function Profile() {
  const insets = useSafeAreaInsets()
  const { userName } = useOnboarding()
  const { user, signOut } = useAuth()
  const { unreadCount } = useInbox()
  const { currentTask, hasActiveTask } = useTaskState()
  const { enabled: notificationsEnabled, toggleEnabled } = useNotifications()

  const [inboxOpen, setInboxOpen] = useState(false)
  const [tasksCompleted, setTasksCompleted] = useState(0)

  useFocusEffect(
    useCallback(() => {
      getTasksCompletedCount().then(setTasksCompleted)
    }, [])
  )

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

  const handleComingSoon = useCallback((feature: string) => {
    Alert.alert(feature, "Coming soon.")
  }, [])

  const displayName = userName ?? "Guest"
  const displayEmail = user?.email ?? ""

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

        {hasActiveTask && currentTask ? (
          <View style={styles.workingOnRow}>
            <Text style={styles.workingOnLabel}>Currently working on</Text>
            <Text style={styles.workingOnTitle}>{currentTask.title}</Text>
          </View>
        ) : null}

        <View style={styles.statsCard}>
          <View style={styles.statPanel}>
            <Text style={styles.statNumber}>{hasActiveTask ? "1" : "0"}</Text>
            <Text style={styles.statLabel}>Current task</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statPanel}>
            <Text style={styles.statNumber}>{tasksCompleted}</Text>
            <Text style={styles.statLabel}>Tasks completed</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Your journeys</Text>

        <View style={styles.sectionCard}>
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => handleComingSoon("Journey history")}
            activeOpacity={0.7}
          >
            <View style={styles.settingLeft}>
              <Feather name="book-open" size={20} color={theme.colors.onSurfaceVariant} />
              <Text style={styles.settingLabel}>Journey history</Text>
            </View>
            <View style={styles.settingRight}>
              <Badge count={tasksCompleted} />
              <Feather name="chevron-right" size={18} color={theme.colors.outline} />
            </View>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Settings</Text>

        <View style={styles.sectionCard}>
          <SettingRow
            icon="user"
            label="Account"
            onPress={() => handleComingSoon("Account")}
          />
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Feather name="bell" size={20} color={theme.colors.onSurfaceVariant} />
              <Text style={styles.settingLabel}>Notifications</Text>
            </View>
            <TouchableOpacity
              onPress={() => toggleEnabled(!notificationsEnabled)}
              style={[styles.toggle, notificationsEnabled && styles.toggleActive]}
            >
              <View style={[styles.toggleThumb, notificationsEnabled && styles.toggleThumbActive]} />
            </TouchableOpacity>
          </View>
          <View style={styles.sectionRowDivider} />
          <SettingRow
            icon="shield"
            label="Privacy"
            onPress={() => handleComingSoon("Privacy")}
          />
          <View style={styles.sectionRowDivider} />
          <SettingRow
            icon="help-circle"
            label="Help & Support"
            onPress={() => handleComingSoon("Help & Support")}
          />
        </View>

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

  workingOnRow: {
    alignItems: "center",
    marginTop: -theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  workingOnLabel: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.label.small.fontSize,
    color: theme.colors.onSurfaceVariant,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  workingOnTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body.medium.fontSize,
    fontWeight: theme.typography.weight.medium,
    color: theme.colors.onBackground,
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

  sectionCard: {
    backgroundColor: theme.colors.surfaceContainerLow,
    borderRadius: theme.radius.lg,
    marginBottom: theme.spacing.xl,
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
  settingRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  sectionRowDivider: {
    height: 1,
    backgroundColor: theme.colors.outlineVariant,
    marginHorizontal: theme.spacing.md,
  },

  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  badgeText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 11,
    fontWeight: theme.typography.weight.semibold,
    color: theme.colors.onPrimary,
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
