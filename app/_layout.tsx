import 'react-native-gesture-handler';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { AppServicesProvider, usePreferences } from '../src/app/AppServices.tsx';
import { ThemeRuntimeProvider, useThemeRuntime } from '../src/design/ThemeProvider.tsx';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);
export { ErrorBoundary } from 'expo-router';

function Navigation() {
  const { theme } = useThemeRuntime();
  const preferences = usePreferences();
  useEffect(() => { void SplashScreen.hideAsync().catch(() => undefined); }, []);
  return <>
    <StatusBar style={theme.sourceScheme === 'dark' ? 'light' : 'dark'} />
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.tokens.colors.background }, animation: preferences.reduceMotion === 'on' ? 'none' : 'default' }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="story/[id]" />
      <Stack.Screen name="user/[id]" />
      <Stack.Screen name="theme/[id]" />
      <Stack.Screen name="theme/studio" />
      <Stack.Screen name="discovery/domain/[domain]" />
      <Stack.Screen name="collection/[id]" />
      <Stack.Screen name="rules" />
      <Stack.Screen name="presets" />
      <Stack.Screen name="archive" />
      <Stack.Screen name="command" options={{ presentation: 'modal' }} />
    </Stack>
  </>;
}

export default function RootLayout() {
  return <GestureHandlerRootView style={{ flex: 1 }}><AppServicesProvider><ThemeRuntimeProvider><Navigation /></ThemeRuntimeProvider></AppServicesProvider></GestureHandlerRootView>;
}
