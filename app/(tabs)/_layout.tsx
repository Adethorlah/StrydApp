import { Tabs } from "expo-router"
import { StyleSheet } from "react-native"
import { theme } from "../../src/theme/tokens"
import { HomeIcon, PathIcon, SettingsIcon } from "../../src/components/icons"

function TabIcon({
  icon: Icon,
  focused,
}: {
  icon: typeof HomeIcon
  focused: boolean
}) {
  return (
    <Icon
      color={focused ? theme.colors.primary : theme.colors.onSurfaceVariant}
      size={focused ? 24 : 22}

    />
  )
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ focused }) => <TabIcon icon={HomeIcon} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="journey"
        options={{
          title: "Journey",
          tabBarIcon: ({ focused }) => <TabIcon icon={PathIcon} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ focused }) => <TabIcon icon={SettingsIcon} focused={focused} />,
        }}
      />
    </Tabs>
  )
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: theme.colors.surface,
    borderTopColor: theme.colors.outlineVariant,
    borderTopWidth: 1,
    height: 60,
    paddingBottom: 6,
    paddingTop: 6,
  },
  tabLabel: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.label.small.fontSize,
    fontWeight: theme.typography.weight.medium,
  },

})
