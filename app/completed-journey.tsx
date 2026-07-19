import { useState, useEffect } from "react"
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { router } from "expo-router"
import { Feather } from "@expo/vector-icons"
import { theme } from "../src/theme/tokens"
import { getCompletedTask } from "../src/lib/storage"
import type { Task } from "../src/types"

export default function CompletedJourney() {
  const insets = useSafeAreaInsets()
  const [task, setTask] = useState<Task | null>(null)

  useEffect(() => {
    getCompletedTask().then(setTask)
  }, [])

  if (!task) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text style={styles.emptyText}>No completed journey found.</Text>
      </View>
    )
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.push("/(tabs)/home")}
      >
        <Feather name="chevron-left" size={24} color={theme.colors.onSurface} />
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.label}>Completed journey</Text>
        <Text style={styles.title}>{task.title}</Text>

        <View style={styles.stepList}>
          {task.steps.map((step, index) => (
            <View key={step.id ?? index} style={styles.stepRow}>
              <View style={styles.checkCircle}>
                <Feather name="check" size={14} color={theme.colors.onTertiary} strokeWidth={2.5} />
              </View>
              <View style={styles.stepText}>
                <Text style={styles.stepTitle}>{step.title}</Text>
                {step.instruction ? (
                  <Text style={styles.stepInstruction}>{step.instruction}</Text>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surfaceContainerLow,
    marginLeft: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  content: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  label: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.label.medium.fontSize,
    fontWeight: theme.typography.weight.semibold,
    color: theme.colors.tertiary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: theme.spacing.xs,
  },
  title: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.title.fontSize,
    lineHeight: theme.typography.title.lineHeight,
    fontWeight: theme.typography.weight.semibold,
    color: theme.colors.onSurface,
    marginBottom: theme.spacing.xl,
  },
  stepList: {
    gap: theme.spacing.sm,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.surfaceContainerHigh,
    borderRadius: theme.radius.lg,
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.tertiary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  stepText: {
    flex: 1,
    gap: 2,
  },
  stepTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body.medium.fontSize,
    lineHeight: theme.typography.body.medium.lineHeight,
    fontWeight: theme.typography.weight.medium,
    color: theme.colors.onSurface,
  },
  stepInstruction: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body.small.fontSize,
    lineHeight: theme.typography.body.small.lineHeight,
    color: theme.colors.onSurfaceVariant,
  },
  emptyText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body.large.fontSize,
    color: theme.colors.onSurfaceVariant,
    textAlign: "center",
    marginTop: theme.spacing.xxl,
  },
})
