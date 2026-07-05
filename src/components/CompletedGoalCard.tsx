import { View, Text, StyleSheet } from "react-native"
import { theme } from "../theme/tokens"

interface CompletedGoalCardProps {
  title: string
  completedStepCount: number
  totalStepCount: number
  createdAt?: string
  completedAt?: string
}

function formatDate(iso?: string): string | null {
  if (!iso) return null
  const d = new Date(iso)
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

export function CompletedGoalCard({
  title,
  completedStepCount,
  totalStepCount,
  createdAt,
  completedAt,
}: CompletedGoalCardProps) {
  const startDate = formatDate(createdAt)
  const endDate = formatDate(completedAt)

  return (
    <View style={styles.card}>
      <Text style={styles.label}>Journey completed</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.steps}>
        {completedStepCount} of {totalStepCount} step{totalStepCount !== 1 ? "s" : ""} completed
      </Text>
      {startDate && endDate && (
        <Text style={styles.dates}>
          {startDate} – {endDate}
        </Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    backgroundColor: theme.colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  label: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.label.medium.fontSize,
    color: theme.colors.secondary,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  title: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body.medium.fontSize,
    lineHeight: theme.typography.body.medium.lineHeight,
    fontWeight: theme.typography.weight.medium,
    color: theme.colors.onSurface,
  },
  steps: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body.small.fontSize,
    color: theme.colors.primary,
  },
  dates: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body.small.fontSize,
    color: theme.colors.onSurfaceVariant,
  },
})
