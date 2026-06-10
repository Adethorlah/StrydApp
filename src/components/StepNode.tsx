import { useState } from "react"
import { View, Text, TouchableOpacity, StyleSheet } from "react-native"
import { theme } from "../theme/tokens"
import { Button } from "./Button"

interface StepNodeProps {
  stepOrder: number
  title: string
  instruction?: string
  estimatedMinutes?: number
  isActive: boolean
  isCompleted: boolean
  isLocked: boolean
  onBegin?: () => void
}

export function StepNode({
  stepOrder,
  title,
  instruction,
  estimatedMinutes,
  isActive,
  isCompleted,
  isLocked,
  onBegin,
}: StepNodeProps) {
  const [expanded, setExpanded] = useState(false)

  if (isLocked) {
    return (
      <View style={[styles.node, styles.lockedNode]}>
        <View style={[styles.dot, styles.lockedDot]} />
        <Text style={styles.lockedTitle}>{title}</Text>
      </View>
    )
  }

  if (isCompleted) {
    return (
      <TouchableOpacity
        onPress={() => setExpanded(!expanded)}
        style={[styles.node, styles.completedNode]}
        activeOpacity={0.7}
      >
        <View style={[styles.dot, styles.completedDot]}>
          <Text style={styles.checkmark}>✓</Text>
        </View>
        <View style={styles.content}>
          <Text style={styles.completedTitle}>{title}</Text>
          {expanded && instruction && (
            <Text style={styles.completedInstruction}>{instruction}</Text>
          )}
        </View>
      </TouchableOpacity>
    )
  }

  return (
    <TouchableOpacity
      onPress={() => setExpanded(!expanded)}
      style={[styles.node, styles.activeNode]}
      activeOpacity={0.7}
    >
      <View style={[styles.dot, styles.activeDot]}>
        <Text style={styles.stepNumber}>{stepOrder}</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.activeTitle}>{title}</Text>
        {expanded && (
          <>
            {instruction && (
              <Text style={styles.instruction}>{instruction}</Text>
            )}
            {estimatedMinutes && (
              <Text style={styles.time}>About {estimatedMinutes} minutes</Text>
            )}
            {onBegin && (
              <Button
                title="Begin this step"
                onPress={onBegin}
                variant="primary"
                style={styles.beginButton}
              />
            )}
          </>
        )}
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  node: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.lg,
    marginVertical: theme.spacing.xs,
  },
  activeNode: {
    backgroundColor: theme.colors.surfaceContainerLow,
  },
  completedNode: {
    backgroundColor: theme.colors.surfaceContainerHighest,
  },
  lockedNode: {
    opacity: 0.4,
  },
  dot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: theme.spacing.md,
    marginTop: 2,
  },
  activeDot: {
    backgroundColor: theme.colors.primary,
  },
  completedDot: {
    backgroundColor: theme.colors.success,
  },
  lockedDot: {
    backgroundColor: theme.colors.outline,
  },
  stepNumber: {
    fontFamily: theme.typography.fontFamily,
    fontWeight: theme.typography.weight.semibold,
    color: theme.colors.onPrimary,
    fontSize: theme.typography.label.small.fontSize,
  },
  checkmark: {
    color: theme.colors.onSuccess,
    fontSize: 16,
    fontWeight: theme.typography.weight.semibold,
  },
  content: {
    flex: 1,
  },
  activeTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body.large.fontSize,
    fontWeight: theme.typography.weight.medium,
    color: theme.colors.onSurface,
    lineHeight: theme.typography.body.large.lineHeight,
  },
  completedTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body.medium.fontSize,
    color: theme.colors.onSurface,
    lineHeight: theme.typography.body.medium.lineHeight,
  },
  lockedTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body.medium.fontSize,
    color: theme.colors.onSurfaceVariant,
    lineHeight: theme.typography.body.medium.lineHeight,
  },
  instruction: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body.medium.fontSize,
    color: theme.colors.onSurfaceVariant,
    lineHeight: theme.typography.body.medium.lineHeight,
    marginTop: theme.spacing.sm,
  },
  completedInstruction: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body.small.fontSize,
    color: theme.colors.onSurfaceVariant,
    lineHeight: theme.typography.body.small.lineHeight,
    marginTop: theme.spacing.xs,
  },
  time: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body.small.fontSize,
    color: theme.colors.onSurfaceVariant,
    marginTop: theme.spacing.sm,
  },
  beginButton: {
    marginTop: theme.spacing.md,
  },
})
