import { ScrollView, View, Text, StyleSheet, Dimensions } from "react-native"
import Svg, { Path } from "react-native-svg"
import { theme } from "../theme/tokens"
import { StepNode } from "./StepNode"
import type { Step } from "../hooks/useTaskState"

interface Phase {
  phase_order: number
  phase_label: string
}

interface JourneyPathProps {
  steps: Step[]
  completedStepIds: string[]
  currentStepIndex: number
  phases?: Phase[]
  onBeginStep: () => void
}

const { width: SCREEN_WIDTH } = Dimensions.get("window")
const PATH_WIDTH = SCREEN_WIDTH - theme.spacing.xl * 2
const NODE_SPACING = 80

function generateCurvedPath(index: number, total: number): string {
  const x = PATH_WIDTH / 2
  const y = index * NODE_SPACING + 40
  const prevY = (index - 1) * NODE_SPACING + 40

  if (index === 0) return `M ${x} ${y}`

  const controlOffset = 20
  const midY = (prevY + y) / 2

  return `C ${x + controlOffset} ${prevY + controlOffset / 2}, ${x + controlOffset} ${y - controlOffset / 2}, ${x} ${y}`
}

export function JourneyPath({
  steps,
  completedStepIds,
  currentStepIndex,
  phases,
  onBeginStep,
}: JourneyPathProps) {
  const totalHeight = steps.length * NODE_SPACING + 80

  const pathD = steps
    .map((_, i) => generateCurvedPath(i, steps.length))
    .join(" ")

  const getPhaseForStep = (stepOrder: number): Phase | undefined => {
    if (!phases || phases.length === 0) return undefined
    return phases.find((p) => {
      const phaseSteps = steps.filter((s) => s.phase === p.phase_order)
      return phaseSteps.some((s) => s.step_order === stepOrder)
    })
  }

  let lastPhase = 0

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.scrollContent, { height: totalHeight }]}
    >
      <Svg width={PATH_WIDTH} height={totalHeight} style={styles.pathSvg}>
        <Path
          d={pathD}
          stroke={theme.colors.outline}
          strokeWidth={2}
          fill="none"
          strokeDasharray="6,4"
        />
      </Svg>

      <View style={styles.nodesContainer}>
        {steps.map((step, index) => {
          const stepId = step.id ?? String(step.step_order)
          const isCompleted = completedStepIds.includes(stepId)
          const isActive = index === currentStepIndex && !isCompleted
          const isLocked = index > currentStepIndex && !isCompleted

          const phase = getPhaseForStep(step.step_order)
          const showPhaseMarker = phase && phase.phase_order !== lastPhase
          lastPhase = phase?.phase_order ?? lastPhase

          return (
            <View key={step.step_order}>
              {showPhaseMarker && (
                <Text style={styles.phaseMarker}>
                  {phase!.phase_label}
                </Text>
              )}
              <StepNode
                stepOrder={step.step_order}
                title={step.title}
                instruction={step.instruction}
                estimatedMinutes={step.estimated_minutes}
                isActive={isActive}
                isCompleted={isCompleted}
                isLocked={isLocked}
                onBegin={isActive ? onBeginStep : undefined}
              />
            </View>
          )
        })}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
    position: "relative",
  },
  pathSvg: {
    position: "absolute",
    top: 0,
    left: theme.spacing.lg,
  },
  nodesContainer: {
    position: "relative",
    zIndex: 1,
  },
  phaseMarker: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.label.medium.fontSize,
    fontWeight: theme.typography.weight.semibold,
    color: theme.colors.primary,
    textTransform: "uppercase",
    letterSpacing: 1,
    paddingVertical: theme.spacing.sm,
    paddingLeft: 48,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
})
