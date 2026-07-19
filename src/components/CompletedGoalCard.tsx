import { View, Text, StyleSheet, ViewStyle } from "react-native"
import { Feather } from "@expo/vector-icons"
import { theme } from "../theme/tokens"

interface CompletedGoalCardProps {
  title: string
  completedStepCount: number
  totalStepCount: number
  createdAt?: string
  completedAt?: string
  style?: ViewStyle
}

export function CompletedGoalCard({
  title,
  completedStepCount,
  totalStepCount,
  style,
}: CompletedGoalCardProps) {
  return (
    <View style={[styles.card, style]}>
      <View style={styles.iconCircle}>
        <Feather name="check" size={20} color={theme.colors.onTertiary} strokeWidth={2.5} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.steps}>
        {completedStepCount} of {totalStepCount} step{totalStepCount !== 1 ? "s" : ""} completed
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    backgroundColor: theme.colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    gap: theme.spacing.xs,
    alignItems: "center",
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.tertiary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing.xs,
  },
  title: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body.large.fontSize,
    lineHeight: theme.typography.body.large.lineHeight,
    fontWeight: theme.typography.weight.semibold,
    color: theme.colors.onSurface,
    textAlign: "center",
  },
  steps: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body.small.fontSize,
    color: theme.colors.onSurfaceVariant,
  },
})
