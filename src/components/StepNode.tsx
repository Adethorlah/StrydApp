import { useRef, useEffect } from "react"
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Modal,
  ScrollView,
} from "react-native"
import { theme } from "../theme/tokens"

interface StepNodeProps {
  stepOrder: number
  title: string
  instruction?: string
  estimatedMinutes?: number
  isActive: boolean
  isCompleted: boolean
  isLocked: boolean
  isSelected: boolean
  onSelect: () => void
  onDismiss: () => void
  onBegin?: () => void
}

const { height: SCREEN_HEIGHT } = Dimensions.get("window")

export function StepNode({
  stepOrder,
  title,
  instruction,
  estimatedMinutes,
  isActive,
  isCompleted,
  isLocked,
  isSelected,
  onSelect,
  onDismiss,
  onBegin,
}: StepNodeProps) {
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current
  const pulseAnim = useRef(new Animated.Value(1)).current

  useEffect(() => {
    if (isSelected) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start()
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }).start()
    }
  }, [isSelected])

  useEffect(() => {
    if (isActive) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.08,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start()
    }
  }, [isActive])

  const getNodeStyle = () => {
    if (isCompleted) return [styles.node, styles.completedNode]
    if (isActive) return [styles.node, styles.activeNode]
    if (isLocked) return [styles.node, styles.lockedNode]
    return [styles.node, styles.upcomingNode]
  }

  const renderNodeContent = () => {
    if (isCompleted) return <Text style={styles.checkmark}>✓</Text>
    if (isLocked) return <Text style={styles.lockIcon}>🔒</Text>
    if (isActive) return <Text style={styles.playIcon}>▶</Text>
    return <Text style={styles.stepNumberText}>{stepOrder}</Text>
  }

  const isDisabled = isLocked || (!isActive && !isCompleted)

  return (
    <>
      <TouchableOpacity
        onPress={isDisabled ? undefined : onSelect}
        activeOpacity={isDisabled ? 1 : 0.75}
        disabled={isDisabled}
      >
        <Animated.View
          style={[
            getNodeStyle(),
            isActive && { transform: [{ scale: pulseAnim }] },
          ]}
        >
          {renderNodeContent()}
        </Animated.View>
      </TouchableOpacity>

      <Modal
        visible={isSelected}
        transparent
        animationType="none"
        onRequestClose={onDismiss}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onDismiss}
        >
          <Animated.View
            style={[
              styles.sheet,
              { transform: [{ translateY: slideAnim }] },
            ]}
          >
            <TouchableOpacity activeOpacity={1} onPress={() => { }}>

              {/* Handle bar */}
              <View style={styles.handle} />

              {/* Back button */}
              <TouchableOpacity onPress={onDismiss} style={styles.backButton}>
                <Text style={styles.backText}>← Back</Text>
              </TouchableOpacity>

              <ScrollView
                style={styles.sheetScroll}
                showsVerticalScrollIndicator={false}
              >
                {/* Step number badge */}
                <View style={styles.stepBadge}>
                  <Text style={styles.stepBadgeText}>
                    Step {stepOrder}
                    {estimatedMinutes ? ` · ${estimatedMinutes} min` : ""}
                  </Text>
                </View>

                {/* Title */}
                <Text style={styles.sheetTitle}>{title}</Text>

                {/* Instruction */}
                {instruction && (
                  <Text style={styles.sheetInstruction}>{instruction}</Text>
                )}

                {/* Begin button */}
                {onBegin && isActive && (
                  <TouchableOpacity
                    style={styles.beginButton}
                    onPress={onBegin}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.beginButtonText}>
                      I'm ready — let's go
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Completed state message */}
                {isCompleted && (
                  <View style={styles.completedBanner}>
                    <Text style={styles.completedBannerText}>
                      ✓ You've completed this step
                    </Text>
                  </View>
                )}

                <View style={{ height: 40 }} />
              </ScrollView>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  // --- Node ---
  node: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  activeNode: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: theme.colors.primary,
  },
  completedNode: {
    backgroundColor: theme.colors.success ?? "#4CAF50",
    opacity: 0.85,
  },
  upcomingNode: {
    backgroundColor: theme.colors.surfaceContainerHighest,
    borderWidth: 2,
    borderColor: theme.colors.outline,
  },
  lockedNode: {
    backgroundColor: theme.colors.surfaceContainerHighest,
    opacity: 0.4,
  },

  // --- Node content ---
  checkmark: {
    fontSize: 22,
    color: "#fff",
    fontWeight: "700",
  },
  lockIcon: {
    fontSize: 18,
  },
  playIcon: {
    fontSize: 20,
    color: "#fff",
    marginLeft: 3,
  },
  stepNumberText: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.onSurfaceVariant,
    fontFamily: theme.typography.fontFamily,
  },

  // --- Bottom sheet ---
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    maxHeight: SCREEN_HEIGHT * 0.75,
  },
  sheetScroll: {
    paddingTop: theme.spacing.sm,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.outline,
    alignSelf: "center",
    marginBottom: theme.spacing.sm,
  },
  backButton: {
    paddingVertical: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  backText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body.medium.fontSize,
    color: theme.colors.primary,
    fontWeight: theme.typography.weight.medium,
  },
  stepBadge: {
    alignSelf: "flex-start",
    backgroundColor: theme.colors.primaryContainer ?? theme.colors.surfaceContainerLow,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.full,
    marginBottom: theme.spacing.md,
  },
  stepBadgeText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.label.small.fontSize,
    color: theme.colors.primary,
    fontWeight: theme.typography.weight.semibold,
  },
  sheetTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.title.fontSize,
    lineHeight: theme.typography.title.lineHeight,
    fontWeight: theme.typography.weight.semibold,
    color: theme.colors.onSurface,
    marginBottom: theme.spacing.md,
  },
  sheetInstruction: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body.large.fontSize,
    lineHeight: theme.typography.body.large.lineHeight,
    color: theme.colors.onSurfaceVariant,
    marginBottom: theme.spacing.xl,
  },
  beginButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    paddingVertical: theme.spacing.md,
    alignItems: "center",
    marginBottom: theme.spacing.md,
  },
  beginButtonText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body.large.fontSize,
    fontWeight: theme.typography.weight.semibold,
    color: theme.colors.onPrimary,
  },
  completedBanner: {
    backgroundColor: theme.colors.surfaceContainerLow,
    borderRadius: theme.radius.lg,
    paddingVertical: theme.spacing.md,
    alignItems: "center",
    marginBottom: theme.spacing.md,
  },
  completedBannerText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body.medium.fontSize,
    color: theme.colors.success ?? "#4CAF50",
    fontWeight: theme.typography.weight.medium,
  },
})