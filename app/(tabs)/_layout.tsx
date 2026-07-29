import { useWindowDimensions } from 'react-native';
import { Tabs } from 'expo-router';
import { MosaicTabBar } from '../../src/components/MosaicTabBar.tsx';
import { useThemeRuntime } from '../../src/design/ThemeProvider.tsx';

export default function TabLayout() {
  const { theme } = useThemeRuntime();
  const { width } = useWindowDimensions();
  const sidebar = width >= 820 && theme.layout.shell === 'sidebar';
  return <Tabs tabBar={(props) => <MosaicTabBar {...props} />} screenOptions={{ headerShown: false, lazy: true, freezeOnBlur: true, sceneStyle: { backgroundColor: theme.tokens.colors.background }, tabBarPosition: sidebar ? 'left' : 'bottom' }}>
    <Tabs.Screen name="index" options={{ title: 'Feed' }} />
    <Tabs.Screen name="search" options={{ title: 'Search' }} />
    <Tabs.Screen name="library" options={{ title: 'Library' }} />
    <Tabs.Screen name="themes" options={{ title: 'Themes' }} />
    <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
  </Tabs>;
}
