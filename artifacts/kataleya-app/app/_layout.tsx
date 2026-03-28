import {
  CourierPrime_400Regular,
  CourierPrime_700Bold,
  CourierPrime_400Regular_Italic,
  useFonts,
} from '@expo-google-fonts/courier-prime';
import { Feather } from '@expo/vector-icons';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/bridge');
  }, []);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        contentStyle: { backgroundColor: '#0e0c14' },
      }}
    >
      <Stack.Screen name="bridge" options={{ headerShown: false, animation: 'none', contentStyle: { backgroundColor: '#0e0c14' } }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false, contentStyle: { backgroundColor: '#0e0c14' } }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false, contentStyle: { backgroundColor: '#0e0c14' } }} />
      <Stack.Screen name="burn" options={{ headerShown: false, presentation: 'modal' }} />
      <Stack.Screen name="cover" options={{ headerShown: false, animation: 'none', contentStyle: { backgroundColor: '#000000' } }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    CourierPrime: CourierPrime_400Regular,
    'CourierPrime-Bold': CourierPrime_700Bold,
    'CourierPrime-Italic': CourierPrime_400Regular_Italic,
    ...Feather.font,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#0e0c14' }}>
            <KeyboardProvider>
              <RootLayoutNav />
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
