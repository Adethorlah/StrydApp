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
import { Feather } from "@expo/vector-icons"
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

const COLORS = {
  green: theme.colors.success,
  grey: theme.colors.outline,
  lightGrey: theme.colors.surfaceContainerHighest,
  iconGrey: theme.colors.onSurfaceVariant,
}

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

  const outerColor = isCompleted ? COLORS.green : COLORS.grey
  const innerColor = isCompleted ? COLORS.green : COLORS.grey
  const centerColor = isCompleted
    ? COLORS.green
    : isActive
      ? theme.colors.secondary
      : COLORS.lightGrey

  const renderIcon = () => {
    if (isCompleted) {
      return <Feather name="check" size={18} color="#fff" strokeWidth={3} />
    }
    if (isActive) {
      return (
        <Text style={styles.stepNumberText}>{stepOrder}</Text>
      )
    }
    return <Feather name="lock" size={16} color={COLORS.iconGrey} />
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
            isActive && { transform: [{ scale: pulseAnim }] },
          ]}
        >
          <View
            style={[
              styles.outerRing,
              { borderColor: outerColor },
            ]}
          >
            <View
              style={[
                styles.innerRing,
                { borderColor: innerColor },
              ]}
            >
              <View
                style={[
                  styles.centerCircle,
                  { backgroundColor: centerColor },
                  (isCompleted || isActive) && styles.centerShadow,
                ]}
              >
                {renderIcon()}
              </View>
            </View>
          </View>
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
                {/* Title */}
                <Text style={styles.sheetTitle}>{title}</Text>

                {/* Step number badge */}
                <View style={styles.stepBadge}>
                  <Text style={styles.stepBadgeText}>
                    Step {stepOrder}
                    {estimatedMinutes ? ` · ${estimatedMinutes} min` : ""}
                  </Text>
                </View>

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
                      Begin this step
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
  outerRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  innerRing: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  centerCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  centerShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  stepNumberText: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.iconGrey,
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
    paddingTop: theme.spacing.lg,
    maxHeight: SCREEN_HEIGHT * 0.75,
  },
  sheetScroll: {
    paddingTop: theme.spacing.md,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.outline,
    alignSelf: "center",
    marginBottom: theme.spacing.md,
  },
  backButton: {
    paddingVertical: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  backText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body.medium.fontSize,
    color: theme.colors.onSurfaceVariant,
    fontWeight: theme.typography.weight.medium,
  },
  stepBadge: {
    alignSelf: "flex-start",
    backgroundColor: theme.colors.surfaceContainerLow,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.full,
    marginBottom: theme.spacing.md,
  },
  stepBadgeText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.label.small.fontSize,
    color: theme.colors.onSurfaceVariant,
    fontWeight: theme.typography.weight.semibold,
  },
  sheetTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.title.fontSize,
    lineHeight: theme.typography.title.lineHeight,
    fontWeight: theme.typography.weight.semibold,
    color: theme.colors.onSurface,
    marginBottom: theme.spacing.lg,
  },
  sheetInstruction: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body.large.fontSize,
    lineHeight: theme.typography.body.large.lineHeight,
    color: theme.colors.onSurfaceVariant,
    marginBottom: theme.spacing.xl,
  },
  beginButton: {
    backgroundColor: theme.colors.secondary,
    borderRadius: theme.radius.lg,
    paddingVertical: theme.spacing.md,
    alignItems: "center",
    marginBottom: theme.spacing.md,
  },
  beginButtonText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body.large.fontSize,
    fontWeight: theme.typography.weight.semibold,
    color: theme.colors.onSecondary,
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
