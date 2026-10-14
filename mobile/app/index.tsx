import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMobileAuth } from '../src/context/AuthContext';
import { useMobileTheme } from '../src/context/ThemeContext';

export default function SplashScreen() {
  const router = useRouter();
  const { user, loading } = useMobileAuth();
  const { colors } = useMobileTheme();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!loading) {
        if (user) {
          router.replace('/(tabs)');
        } else {
          router.replace('/(auth)/login');
        }
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [user, loading, router]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <View style={styles.logoBadge}>
          <MaterialCommunityIcons name="wallet-outline" size={48} color="#FFFFFF" />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>ExpenseApp</Text>
        <Text style={[styles.subtitle, { color: colors.subtext }]}>
          Modern Family & Personal Expense Tracker
        </Text>
      </View>

      <ActivityIndicator size="small" color="#6366F1" style={styles.loader} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
  },
  logoBadge: {
    width: 90,
    height: 90,
    borderRadius: 28,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 6,
    textAlign: 'center',
  },
  loader: {
    position: 'absolute',
    bottom: 60,
  },
});
