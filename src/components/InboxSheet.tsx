import { useRef, useEffect } from "react"
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Dimensions,
  ScrollView,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Feather } from "@expo/vector-icons"
import { theme } from "../theme/tokens"
import { useInbox } from "../hooks/useInbox"
import type { InboxMessage } from "../types"

const { height: SCREEN_HEIGHT } = Dimensions.get("window")
const PANEL_HEIGHT = SCREEN_HEIGHT * 0.65

const categoryConfig: Record<
  InboxMessage["category"],
  { icon: keyof typeof Feather.glyphMap; label: string }
> = {
  insight: { icon: "zap", label: "Insight" },
  re_entry: { icon: "clock", label: "Re-entry" },
  milestone: { icon: "award", label: "Milestone" },
}

interface InboxSheetProps {
  isOpen: boolean
  onClose: () => void
}

export function InboxSheet({ isOpen, onClose }: InboxSheetProps) {
  const insets = useSafeAreaInsets()
  const slideAnim = useRef(new Animated.Value(PANEL_HEIGHT)).current
  const { messages, isLoading, unreadCount, markRead, markAllRead } = useInbox()

  useEffect(() => {
    if (isOpen) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start()
    } else {
      Animated.timing(slideAnim, {
        toValue: PANEL_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }).start()
    }
  }, [isOpen, slideAnim])

  if (!isOpen) return null

  return (
    <TouchableOpacity
      style={styles.backdrop}
      activeOpacity={1}
      onPress={onClose}
    >
      <Animated.View
        style={[
          styles.panel,
          { transform: [{ translateY: slideAnim }] },
        ]}
      >
        <TouchableOpacity activeOpacity={1} onPress={() => {}}>
          <View style={styles.topBar}>
            <View style={styles.handle} />
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <View style={styles.closeCircle}>
                <Feather name="x" size={16} color={theme.colors.onSurfaceVariant} />
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.header}>
            <Text style={styles.title}>Reflections & Insights</Text>
            {unreadCount > 0 && (
              <TouchableOpacity onPress={markAllRead}>
                <Text style={styles.markAllRead}>Mark all read</Text>
              </TouchableOpacity>
            )}
          </View>

          <ScrollView
            style={styles.list}
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom: insets.bottom + theme.spacing.lg },
            ]}
            showsVerticalScrollIndicator={false}
          >
            {isLoading && (
              <Text style={styles.emptyText}>Loading...</Text>
            )}
            {!isLoading && messages.length === 0 && (
              <View style={styles.emptyState}>
                <Feather name="inbox" size={40} color={theme.colors.outline} />
                <Text style={styles.emptyText}>No reflections yet</Text>
                <Text style={styles.emptySubtext}>
                  Insights from your journey will appear here
                </Text>
              </View>
            )}
            {messages.map((msg) => {
              const cfg = categoryConfig[msg.category]
              return (
                <TouchableOpacity
                  key={msg.id}
                  style={[
                    styles.card,
                    !msg.is_read && styles.cardUnread,
                  ]}
                  onPress={() => markRead(msg.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.cardIcon}>
                    <Feather
                      name={cfg.icon}
                      size={18}
                      color={!msg.is_read ? theme.colors.secondary : theme.colors.onSurfaceVariant}
                    />
                  </View>
                  <View style={styles.cardBody}>
                    <View style={styles.cardRow}>
                      <Text style={styles.cardCategory}>{cfg.label}</Text>
                      {!msg.is_read && <View style={styles.unreadDot} />}
                    </View>
                    <Text style={styles.cardTitle}>{msg.title}</Text>
                    <Text style={styles.cardContent} numberOfLines={3}>
                      {msg.content}
                    </Text>
                  </View>
                </TouchableOpacity>
              )
            })}
          </ScrollView>
        </TouchableOpacity>
      </Animated.View>
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
    backgroundColor: "rgba(0,0,0,0.3)",
    zIndex: 200,
    justifyContent: "flex-end",
  },
  panel: {
    height: PANEL_HEIGHT,
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    paddingTop: theme.spacing.lg,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
    position: "relative",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.outline,
  },
  closeButton: {
    position: "absolute",
    right: theme.spacing.md,
    padding: theme.spacing.xs,
  },
  closeCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.surfaceContainerHighest,
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  title: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.title.fontSize,
    fontWeight: theme.typography.weight.semibold,
    color: theme.colors.onSurface,
  },
  markAllRead: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body.small.fontSize,
    color: theme.colors.secondary,
    fontWeight: theme.typography.weight.medium,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  card: {
    flexDirection: "row",
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surfaceContainerLow,
    borderRadius: theme.radius.lg,
    gap: theme.spacing.lg,
  },
  cardUnread: {
    backgroundColor: theme.colors.secondaryContainer,
  },
  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.surfaceContainerHighest,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: {
    flex: 1,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
  },
  cardCategory: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.label.small.fontSize,
    fontWeight: theme.typography.weight.semibold,
    color: theme.colors.onSurfaceVariant,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.secondary,
  },
  cardTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body.medium.fontSize,
    fontWeight: theme.typography.weight.semibold,
    color: theme.colors.onSurface,
    marginBottom: theme.spacing.xs,
  },
  cardContent: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body.small.fontSize,
    color: theme.colors.onSurfaceVariant,
    lineHeight: theme.typography.body.small.lineHeight,
  },
  emptyState: {
    alignItems: "center",
    paddingTop: theme.spacing.xl * 2,
    gap: theme.spacing.sm,
  },
  emptyText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body.medium.fontSize,
    color: theme.colors.onSurfaceVariant,
    textAlign: "center",
  },
  emptySubtext: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body.small.fontSize,
    color: theme.colors.onSurfaceVariant,
    textAlign: "center",
  },
})
