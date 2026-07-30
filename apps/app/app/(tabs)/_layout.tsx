import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '@/src/providers/ThemeProvider';

const TAB_CONTENT_HEIGHT = 64;

export default function TabsLayout() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenListeners={{ tabPress: () => { Haptics.selectionAsync().catch(() => undefined); } }}
      screenOptions={{
        headerShown: false,
        animation: 'none',
        freezeOnBlur: false,
        tabBarHideOnKeyboard: true,
        sceneStyle: { backgroundColor: colors.background },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          elevation: 0,
          height: TAB_CONTENT_HEIGHT + insets.bottom,
          paddingTop: 8,
          paddingBottom: insets.bottom,
        },
        tabBarItemStyle: { minHeight: 44, paddingVertical: 0 },
        tabBarLabelPosition: 'below-icon',
        tabBarIconStyle: { marginBottom: 2 },
        tabBarLabelStyle: { fontSize: 11, lineHeight: 14, fontWeight: '600' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: '일기', tabBarIcon: ({ color, size }) => <Ionicons name="sparkles" color={color} size={size} /> }} />
      <Tabs.Screen name="movies" options={{ title: '영화', tabBarIcon: ({ color, size }) => <Ionicons name="film" color={color} size={size} /> }} />
      <Tabs.Screen name="books" options={{ title: '책', tabBarIcon: ({ color, size }) => <Ionicons name="book" color={color} size={size} /> }} />
      <Tabs.Screen name="more" options={{ title: '전체', tabBarIcon: ({ color, size }) => <Ionicons name="grid" color={color} size={size} /> }} />
    </Tabs>
  );
}
