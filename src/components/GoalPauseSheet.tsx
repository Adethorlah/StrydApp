import { useRef, useEffect, useState, useCallback } from "react"
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Dimensions,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from "react-native"
import { theme } from "../theme/tokens"
import { Button } from "./Button"
import { CompanionAvatar } from "./CompanionAvatar"
import { CelebrationView } from "./CelebrationView"
import type { Task, Step, PauseReason } from "../types"
import { useAuth } from "../hooks/useAuth"
import { saveFeedbackToDB } from "../services/feedback.service"
import { saveFeedbackLocally } from "../lib/storage"
import { callStepBreakdown } from "../services/tasks.service"

const { height: SCREEN_HEIGHT } = Dimensions.get("window")
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.85

type SheetScreen =
  | "reason_selection"
  | "response_need_urgent"
  | "response_feeling_stuck"
  | "response_priorities_changed"
  | "response_completed_other_way"
  | "response_no_longer_matters"
  | "response_other"

interface GoalPauseSheetProps {
  isOpen: boolean
  onClose: () => void
  task: Task
  completedStepCount: number
  onPauseAndNavigateHome: () => void
  onArchiveAndNavigateHome: () => void
  onCompleteAndNavigateHome: () => void
  onBreakDownStep: (subSteps: Step[]) => Promise<void>
  currentStepTitle: string
  currentStepInstruction: string
  currentStepMinutes: number
}

const REASON_OPTIONS: { value: PauseReason; label: string }[] = [
  { value: "need_urgent", label: "I need to work on something more urgent" },
  { value: "feeling_stuck", label: "I'm feeling stuck on this goal" },
  { value: "priorities_changed", label: "My priorities have changed" },
  { value: "completed_other_way", label: "I completed this goal another way" },
  { value: "no_longer_matters", label: "This goal no longer matters to me" },
  { value: "other", label: "Other" },
]

export function GoalPauseSheet({
  isOpen,
  onClose,
  task,
  completedStepCount,
  onPauseAndNavigateHome,
  onArchiveAndNavigateHome,
  onCompleteAndNavigateHome,
  onBreakDownStep,
  currentStepTitle,
  currentStepInstruction,
  currentStepMinutes,
}: GoalPauseSheetProps) {
  const slideAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current
  const [screen, setScreen] = useState<SheetScreen>("reason_selection")
  const [selectedReason, setSelectedReason] = useState<PauseReason | null>(null)
  const [feedbackText, setFeedbackText] = useState("")
  const [isBreakingDown, setIsBreakingDown] = useState(false)
  const { isAuthenticated, user } = useAuth()

  useEffect(() => {
    if (isOpen) {
      setScreen("reason_selection")
      setSelectedReason(null)
      setFeedbackText("")
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start()
    } else {
      Animated.timing(slideAnim, {
        toValue: SHEET_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }).start()
    }
  }, [isOpen, slideAnim])

  const handleSelectReason = useCallback((reason: PauseReason) => {
    setSelectedReason(reason)
  }, [])

  const handleContinue = useCallback(() => {
    if (!selectedReason) return
    setScreen(`response_${selectedReason}`)
  }, [selectedReason])

  const handleSaveFeedback = useCallback(async () => {
    await saveFeedbackLocally(selectedReason!, feedbackText || undefined)
    if (isAuthenticated && user?.id) {
      try {
        await saveFeedbackToDB(
          user.id,
          selectedReason!,
          task.id,
          feedbackText || undefined
        )
      } catch {
        // Local storage is the fallback
      }
    }
  }, [selectedReason, feedbackText, isAuthenticated, user, task.id])

  const handleBreakDownStep = useCallback(async () => {
    setIsBreakingDown(true)
    try {
      const result = await callStepBreakdown(
        currentStepTitle,
        currentStepInstruction,
        currentStepMinutes
      )
      if (result?.sub_steps) {
        await onBreakDownStep(result.sub_steps)
      }
    } catch {
      // Fallback: create 2 simple sub-steps
      const half = Math.max(1, Math.floor(currentStepMinutes / 2))
      await onBreakDownStep([
        {
          step_order: 1,
          title: `Start ${currentStepTitle.toLowerCase()}`,
          instruction: `Take the first small step on: ${currentStepTitle}`,
          estimated_minutes: Math.min(2, half),
        },
        {
          step_order: 2,
          title: `Continue ${currentStepTitle.toLowerCase()}`,
          instruction: `Keep going with what you started.`,
          estimated_minutes: half,
        },
      ])
    } finally {
      setIsBreakingDown(false)
    }
  }, [currentStepTitle, currentStepInstruction, currentStepMinutes, onBreakDownStep])

  const handleActionWithFeedback = useCallback(async (action: () => void) => {
    await handleSaveFeedback()
    action()
  }, [handleSaveFeedback])

  const totalSteps = task.steps.length

  const renderDragHandle = () => (
    <View style={styles.handle} />
  )

  const renderReasonSelection = () => (
    <ScrollView
      style={styles.scrollArea}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.progressText}>
        You've completed {completedStepCount} of {totalSteps} step{totalSteps !== 1 ? "s" : ""} on this journey.
      </Text>

      <View style={styles.companionBubble}>
        <CompanionAvatar size={72} />
        <View style={styles.companionBubbleText}>
          <Text style={styles.companionMessage}>
            Your progress is saved. You can return to this whenever you're ready.
          </Text>
        </View>
      </View>

      <Text style={styles.sectionHeadline}>What's prompting the change?</Text>
      <Text style={styles.sectionSubtext}>Understanding why helps us respond better.</Text>

      <View style={styles.reasonList}>
        {REASON_OPTIONS.map((opt) => {
          const isSelected = selectedReason === opt.value
          return (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.reasonCard,
                isSelected && styles.reasonCardSelected,
              ]}
              onPress={() => handleSelectReason(opt.value)}
              activeOpacity={0.7}
            >
              <View style={[
                styles.radio,
                isSelected && styles.radioSelected,
              ]}>
                {isSelected && <View style={styles.radioInner} />}
              </View>
              <Text style={[
                styles.reasonLabel,
                isSelected && styles.reasonLabelSelected,
              ]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>

      <Button
        title="Continue"
        onPress={handleContinue}
        variant="primary"
        disabled={!selectedReason}
        style={styles.continueButton}
      />
      <View style={{ height: theme.spacing.xl }} />
    </ScrollView>
  )

  const renderFeedbackInput = () => (
    <View style={styles.feedbackSection}>
      <Text style={styles.feedbackPrompt}>
        Would you mind sharing what we could do better? (Optional)
      </Text>
      <TextInput
        style={styles.feedbackInput}
        placeholder="Tell us anything..."
        placeholderTextColor={theme.colors.onSurfaceVariant}
        value={feedbackText}
        onChangeText={setFeedbackText}
        multiline
        textAlignVertical="top"
      />
    </View>
  )

  const renderResponseNeedUrgent = () => (
    <ScrollView
      style={styles.scrollArea}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <CelebrationView
        headline="Understood."
        message="Your progress is saved. Come back whenever you're ready."
      />

      {renderFeedbackInput()}

      <Button
        title="Start a new goal"
        onPress={() => handleActionWithFeedback(onPauseAndNavigateHome)}
        variant="primary"
        style={styles.actionButton}
      />
      <View style={{ height: theme.spacing.xl }} />
    </ScrollView>
  )

  const renderResponseFeelingStuck = () => (
    <ScrollView
      style={styles.scrollArea}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <CelebrationView
        headline="It happens to everyone."
        message="Would you like me to make your next step smaller and easier to start?"
      />

      {isBreakingDown ? (
        <View style={styles.breakingLoader}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text style={styles.breakingText}>Breaking your step down...</Text>
        </View>
      ) : (
        <>
          <Button
            title="Break the next step down"
            onPress={handleBreakDownStep}
            variant="primary"
            style={styles.actionButton}
          />
          <Button
            title="Pause this goal anyway"
            onPress={() => {
              setScreen("response_need_urgent")
            }}
            variant="quiet"
            style={styles.secondaryButton}
          />
        </>
      )}
      <View style={{ height: theme.spacing.xl }} />
    </ScrollView>
  )

  const renderResponsePrioritiesChanged = () => (
    <ScrollView
      style={styles.scrollArea}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <CelebrationView
        headline="That makes sense."
        message="Your progress is saved. You can return whenever you're ready."
      />

      {renderFeedbackInput()}

      <Button
        title="Start a new goal"
        onPress={() => handleActionWithFeedback(onPauseAndNavigateHome)}
        variant="primary"
        style={styles.actionButton}
      />
      <View style={{ height: theme.spacing.xl }} />
    </ScrollView>
  )

  const renderResponseCompletedOtherWay = () => (
    <ScrollView
      style={styles.scrollArea}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <CelebrationView
        headline="You did it."
        message="That counts. However you got there, you got there."
      />

      <Button
        title="Start something new"
        onPress={onCompleteAndNavigateHome}
        variant="primary"
        style={styles.actionButton}
      />
      <View style={{ height: theme.spacing.xl }} />
    </ScrollView>
  )

  const renderResponseNoLongerMatters = () => (
    <ScrollView
      style={styles.scrollArea}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <CelebrationView
        headline="Got it."
        message="Letting go of something that no longer serves you is a decision too."
      />

      {renderFeedbackInput()}

      <Button
        title="Go to Home"
        onPress={() => handleActionWithFeedback(onArchiveAndNavigateHome)}
        variant="primary"
        style={styles.actionButton}
      />
      <View style={{ height: theme.spacing.xl }} />
    </ScrollView>
  )

  const renderResponseOther = () => (
    <ScrollView
      style={styles.scrollArea}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <CelebrationView
        headline="That's okay."
        message="Whatever the reason, your progress is saved and you can return whenever you want."
      />

      {renderFeedbackInput()}

      <Button
        title="Start a new goal"
        onPress={() => handleActionWithFeedback(onPauseAndNavigateHome)}
        variant="primary"
        style={styles.actionButton}
      />
      <View style={{ height: theme.spacing.xl }} />
    </ScrollView>
  )

  const renderScreen = () => {
    switch (screen) {
      case "reason_selection":
        return renderReasonSelection()
      case "response_need_urgent":
        return renderResponseNeedUrgent()
      case "response_feeling_stuck":
        return renderResponseFeelingStuck()
      case "response_priorities_changed":
        return renderResponsePrioritiesChanged()
      case "response_completed_other_way":
        return renderResponseCompletedOtherWay()
      case "response_no_longer_matters":
        return renderResponseNoLongerMatters()
      case "response_other":
        return renderResponseOther()
    }
  }

  if (!isOpen) return null

  return (
    <TouchableOpacity
      style={styles.backdrop}
      activeOpacity={1}
      onPress={onClose}
    >
      <TouchableOpacity activeOpacity={1} onPress={() => {}}>
        <Animated.View
          style={[
            styles.sheet,
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          {renderDragHandle()}
          {renderScreen()}
        </Animated.View>
      </TouchableOpacity>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.35)",
    zIndex: 200,
    justifyContent: "flex-end",
  },
  sheet: {
    height: SHEET_HEIGHT,
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    paddingTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.outline,
    alignSelf: "center",
    marginBottom: theme.spacing.md,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: theme.spacing.xl,
  },
  progressText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body.large.fontSize,
    lineHeight: theme.typography.body.large.lineHeight,
    fontWeight: theme.typography.weight.medium,
    color: theme.colors.onSurface,
    textAlign: "center",
    marginBottom: theme.spacing.lg,
  },
  companionBubble: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing.md,
    backgroundColor: theme.colors.primaryContainer,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  companionBubbleText: {
    flex: 1,
    justifyContent: "center",
  },
  companionMessage: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body.medium.fontSize,
    lineHeight: theme.typography.body.medium.lineHeight,
    color: theme.colors.onPrimaryContainer,
  },
  sectionHeadline: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.title.fontSize,
    fontWeight: theme.typography.weight.semibold,
    color: theme.colors.onSurface,
    marginBottom: theme.spacing.xs,
  },
  sectionSubtext: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body.small.fontSize,
    color: theme.colors.onSurfaceVariant,
    marginBottom: theme.spacing.lg,
  },
  reasonList: {
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  reasonCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
  },
  reasonCardSelected: {
    backgroundColor: theme.colors.secondaryContainer,
    borderColor: theme.colors.secondary,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: theme.colors.outline,
    alignItems: "center",
    justifyContent: "center",
  },
  radioSelected: {
    borderColor: theme.colors.secondary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.secondary,
  },
  reasonLabel: {
    flex: 1,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body.medium.fontSize,
    lineHeight: theme.typography.body.medium.lineHeight,
    color: theme.colors.onSurface,
  },
  reasonLabelSelected: {
    fontWeight: theme.typography.weight.medium,
  },
  continueButton: {
    width: "100%",
  },
  feedbackSection: {
    marginBottom: theme.spacing.lg,
  },
  feedbackPrompt: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body.medium.fontSize,
    lineHeight: theme.typography.body.medium.lineHeight,
    color: theme.colors.onSurfaceVariant,
    marginBottom: theme.spacing.sm,
  },
  feedbackInput: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body.medium.fontSize,
    color: theme.colors.onSurface,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surfaceContainerLow,
    minHeight: 80,
  },
  actionButton: {
    width: "100%",
    marginTop: theme.spacing.md,
  },
  secondaryButton: {
    width: "100%",
    marginTop: theme.spacing.sm,
  },
  breakingLoader: {
    alignItems: "center",
    paddingVertical: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  breakingText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body.medium.fontSize,
    color: theme.colors.onSurfaceVariant,
  },
})
