import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { MobileThemeProvider, useMobileTheme } from '../src/context/ThemeContext';
import { MobileAuthProvider } from '../src/context/AuthContext';

function RootNavigation() {
  const { theme, colors } = useMobileTheme();

  return (
    <>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} backgroundColor={colors.background} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)/login" />
        <Stack.Screen name="(auth)/register" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <MobileThemeProvider>
        <MobileAuthProvider>
          <RootNavigation />
        </MobileAuthProvider>
      </MobileThemeProvider>
    </SafeAreaProvider>
  );
}
