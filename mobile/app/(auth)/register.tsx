import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useMobileAuth } from '../../src/context/AuthContext';
import { useMobileTheme } from '../../src/context/ThemeContext';
import { mobileApi } from '../../src/api/client';

export default function MobileRegister() {
  const router = useRouter();
  const { register, loading } = useMobileAuth();
  const { colors } = useMobileTheme();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);

  const handlePickAvatar = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setAvatarUri(result.assets[0].uri);
      }
    } catch (e) {
      console.warn('Image picker error:', e);
    }
  };

  const handleRegister = async () => {
    if (!fullName || !email || !password) {
      setError('Please fill in your name, email, and password');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    try {
      setError(null);
      const res = await register({
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        password,
      });

      if (res?.emailConfirmationRequired) {
        setEmailSent(true);
        return;
      }

      // If user uploaded an avatar and is immediately logged in
      if (avatarUri) {
        try {
          await mobileApi.uploadAvatar(avatarUri);
        } catch (e: any) {
          console.warn('Post-registration avatar upload failed:', e.message);
        }
      }

      router.replace('/(tabs)');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    }
  };

  if (emailSent) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: colors.background }]}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, alignItems: 'center' }]}>
          <View style={[styles.logoBadge, { backgroundColor: '#10B981' }]}>
            <MaterialCommunityIcons name="email-check-outline" size={40} color="#FFFFFF" />
          </View>
          <Text style={[styles.title, { color: colors.text, textAlign: 'center', marginTop: 12 }]}>
            Check Your Email
          </Text>
          <Text style={[styles.subtitle, { color: colors.subtext, textAlign: 'center', marginTop: 8 }]}>
            We sent a confirmation link to <Text style={{ fontWeight: '700', color: colors.text }}>{email}</Text>.
            Please verify your email address, then return here to sign in.
          </Text>
          <TouchableOpacity
            style={[styles.primaryButton, { width: '100%', marginTop: 24 }]}
            onPress={() => router.replace('/(auth)/login')}
          >
            <Text style={styles.primaryButtonText}>Go to Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Create Account</Text>
          <Text style={[styles.subtitle, { color: colors.subtext }]}>
            Join ExpenseApp to track your family budget
          </Text>
        </View>

        {/* Card */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {error && (
            <View style={styles.errorBox}>
              <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#EF4444" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Profile photo picker */}
          <View style={styles.avatarRow}>
            <TouchableOpacity onPress={handlePickAvatar} style={styles.avatarButton}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
              ) : (
                <MaterialCommunityIcons name="camera-plus-outline" size={26} color="#6366F1" />
              )}
            </TouchableOpacity>
            <View>
              <Text style={[styles.avatarLabel, { color: colors.text }]}>Profile Photo</Text>
              <Text style={[styles.avatarHint, { color: colors.subtext }]}>Optional image</Text>
            </View>
          </View>

          {/* Full Name */}
          <Text style={[styles.label, { color: colors.text }]}>Full Name</Text>
          <View style={[styles.inputContainer, { borderColor: colors.border }]}>
            <MaterialCommunityIcons name="account-outline" size={18} color={colors.subtext} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Your Name"
              placeholderTextColor={colors.subtext}
              value={fullName}
              onChangeText={setFullName}
            />
          </View>

          {/* Email */}
          <Text style={[styles.label, { color: colors.text, marginTop: 12 }]}>Email</Text>
          <View style={[styles.inputContainer, { borderColor: colors.border }]}>
            <MaterialCommunityIcons name="email-outline" size={18} color={colors.subtext} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="user@example.com"
              placeholderTextColor={colors.subtext}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          {/* Phone */}
          <Text style={[styles.label, { color: colors.text, marginTop: 12 }]}>Phone Number</Text>
          <View style={[styles.inputContainer, { borderColor: colors.border }]}>
            <MaterialCommunityIcons name="phone-outline" size={18} color={colors.subtext} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="+91 9876543210"
              placeholderTextColor={colors.subtext}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />
          </View>

          {/* Password */}
          <Text style={[styles.label, { color: colors.text, marginTop: 12 }]}>Password</Text>
          <View style={[styles.inputContainer, { borderColor: colors.border }]}>
            <MaterialCommunityIcons name="lock-outline" size={18} color={colors.subtext} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="At least 6 characters"
              placeholderTextColor={colors.subtext}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          {/* Register Button */}
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.primaryButtonText}>Register</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Login footer link */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.subtext }]}>Already registered? </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
            <Text style={styles.loginLink}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  scroll: {
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
  },
  card: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  avatarButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#EEF2FF',
    borderWidth: 1.5,
    borderColor: '#C7D2FE',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  avatarHint: {
    fontSize: 11,
    marginTop: 2,
  },
  logoBadge: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    padding: 10,
    borderRadius: 12,
    marginBottom: 14,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    flex: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
  },
  primaryButton: {
    backgroundColor: '#6366F1',
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  footerText: {
    fontSize: 13,
  },
  loginLink: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6366F1',
  },
});
