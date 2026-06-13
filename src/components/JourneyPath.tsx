import { useState } from "react"
import { ScrollView, View, Text, StyleSheet, Dimensions } from "react-native"
import Svg, { Path } from "react-native-svg"
import { theme } from "../theme/tokens"
import { StepNode } from "./StepNode"
import type { Step } from "../types"

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
const CANVAS_WIDTH = SCREEN_WIDTH - theme.spacing.xl * 2
const NODE_SIZE = 64
const NODE_SPACING = 100
const ZIGZAG_OFFSET = CANVAS_WIDTH * 0.28

function getNodeX(index: number): number {
  const center = CANVAS_WIDTH / 2
  const pattern = index % 3
  if (pattern === 0) return center - ZIGZAG_OFFSET
  if (pattern === 1) return center + ZIGZAG_OFFSET
  return center
}

function getNodeY(index: number): number {
  return index * NODE_SPACING + NODE_SIZE
}

function buildPath(steps: Step[]): string {
  if (steps.length === 0) return ""
  const points = steps.map((_, i) => ({
    x: getNodeX(i) + NODE_SIZE / 2,
    y: getNodeY(i) + NODE_SIZE / 2,
  }))

  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]
    const curr = points[i]
    const midY = (prev.y + curr.y) / 2
    d += ` C ${prev.x} ${midY}, ${curr.x} ${midY}, ${curr.x} ${curr.y}`
  }
  return d
}

function getPhaseLabel(
  stepOrder: number,
  steps: Step[],
  phases?: Phase[]
): Phase | undefined {
  if (!phases || phases.length === 0) return undefined
  const step = steps.find((s) => s.step_order === stepOrder)
  if (!step) return undefined
  return phases.find((p) => p.phase_order === (step.phase ?? 1))
}

function getActivePhase(steps: Step[], completedStepIds: string[]): number {
  const phaseNumbers = [...new Set(steps.map((s) => s.phase ?? 1))]
  if (phaseNumbers.length <= 1) return 1
  let maxCompleted = 0
  for (const phase of phaseNumbers) {
    const phaseSteps = steps.filter((s) => (s.phase ?? 1) === phase)
    const allDone = phaseSteps.every((s) =>
      completedStepIds.includes(s.id ?? String(s.step_order))
    )
    if (allDone) maxCompleted = phase
  }
  return maxCompleted + 1
}

export function JourneyPath({
  steps,
  completedStepIds,
  currentStepIndex,
  phases,
  onBeginStep,
}: JourneyPathProps) {
  const [selectedStepOrder, setSelectedStepOrder] = useState<number | null>(null)
  const totalHeight = steps.length * NODE_SPACING + NODE_SIZE * 2
  const pathD = buildPath(steps)
  const activePhase = getActivePhase(steps, completedStepIds)
  const completedCount = completedStepIds.length
  const totalCount = steps.length

  let lastPhase = 0

  return (
    <View style={styles.wrapper}>
      {/* Progress bar */}
      <View style={styles.progressContainer}>
        <Text style={styles.progressText}>
          {completedCount} of {totalCount} steps done
        </Text>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${(completedCount / totalCount) * 100}%` },
            ]}
          />
        </View>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.scrollContent,
          { height: totalHeight },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Path line */}
        <Svg
          width={CANVAS_WIDTH}
          height={totalHeight}
          style={styles.pathSvg}
        >
          <Path
            d={pathD}
            stroke={theme.colors.outline}
            strokeWidth={2}
            fill="none"
            strokeDasharray="8,5"
          />
        </Svg>

        {/* Nodes */}
        {steps.map((step, index) => {
          const stepId = step.id ?? String(step.step_order)
          const isCompleted = completedStepIds.includes(stepId)
          const isActive = index === currentStepIndex && !isCompleted
          const stepPhase = step.phase ?? 1
          const isPhaseLocked = stepPhase > activePhase
          const isLocked =
            (index > currentStepIndex && !isCompleted) || isPhaseLocked

          const phase = getPhaseLabel(step.step_order, steps, phases)
          const showPhaseMarker = phase && phase.phase_order !== lastPhase
          lastPhase = phase?.phase_order ?? lastPhase

          const nodeX = getNodeX(index)
          const nodeY = getNodeY(index)

          return (
            <View key={step.step_order}>
              {showPhaseMarker && (
                <View
                  style={[
                    styles.phaseMarkerContainer,
                    { top: nodeY - 28 },
                  ]}
                >
                  <Text style={styles.phaseMarker}>
                    {phase!.phase_label}
                  </Text>
                </View>
              )}

              <View
                style={[
                  styles.nodeWrapper,
                  { left: nodeX, top: nodeY },
                ]}
              >
                <StepNode
                  stepOrder={step.step_order}
                  title={step.title}
                  instruction={step.instruction}
                  estimatedMinutes={step.estimated_minutes}
                  isActive={isActive && !isPhaseLocked}
                  isCompleted={isCompleted}
                  isLocked={isLocked}
                  isSelected={selectedStepOrder === step.step_order}
                  onSelect={() => setSelectedStepOrder(step.step_order)}
                  onDismiss={() => setSelectedStepOrder(null)}
                  onBegin={
                    isActive && !isPhaseLocked
                      ? () => {
                        setSelectedStepOrder(null)
                        onBeginStep()
                      }
                      : undefined
                  }
                />
              </View>
            </View>
          )
        })}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  progressContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  progressText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.label.small.fontSize,
    color: theme.colors.onSurfaceVariant,
    marginBottom: theme.spacing.xs,
  },
  progressTrack: {
    height: 4,
    backgroundColor: theme.colors.surfaceContainerHighest,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: 4,
    backgroundColor: theme.colors.primary,
    borderRadius: 2,
  },
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
    top: theme.spacing.xl,
    left: theme.spacing.lg,
  },
  nodeWrapper: {
    position: "absolute",
  },
  phaseMarkerContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  phaseMarker: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.label.small.fontSize,
    fontWeight: theme.typography.weight.semibold,
    color: theme.colors.primary,
    textTransform: "uppercase",
    letterSpacing: 1,
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.sm,
  },
})