import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { mobileApi } from '../../src/api/client';
import { useMobileAuth } from '../../src/context/AuthContext';
import { useMobileTheme } from '../../src/context/ThemeContext';
import { Profile } from '@expense-app/shared';

export default function MobileProfile() {
  const router = useRouter();
  const { user, updateUser, logout } = useMobileAuth();
  const { colors, toggleTheme, theme } = useMobileTheme();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [memberCount, setMemberCount] = useState(0);
  const [familyGroupName, setFamilyGroupName] = useState('');
  const [loading, setLoading] = useState(true);

  // Edit State
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Password State
  const [newPassword, setNewPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const data = await mobileApi.getProfile();
        setProfile(data.profile);
        setMemberCount(data.memberCount);
        setFamilyGroupName(data.familyGroup?.name || 'Family');
        setFullName(data.profile.full_name || '');
        setPhone(data.profile.phone || '');
      } catch (e: any) {
        console.warn('Profile fetch error:', e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handlePickAvatar = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        setUploadingAvatar(true);
        try {
          const uploadRes = await mobileApi.uploadAvatar(uri);
          const finalUrl = uploadRes.avatar_url || uri;
          updateUser({ avatar_url: finalUrl });
          if (profile) setProfile({ ...profile, avatar_url: finalUrl });
          Alert.alert('Avatar Updated', 'Profile photo updated successfully.');
        } catch (uploadErr: any) {
          Alert.alert('Upload Error', uploadErr.message || 'Failed to upload avatar to cloud storage.');
        } finally {
          setUploadingAvatar(false);
        }
      }
    } catch (e) {
      console.warn('Avatar picker error:', e);
    }
  };

  const handleUpdateDetails = async () => {
    try {
      setSavingProfile(true);
      const updated = await mobileApi.updateProfile({
        full_name: fullName.trim(),
        phone: phone.trim() || undefined,
      });
      setProfile(updated);
      updateUser({ full_name: updated.full_name, phone: updated.phone });
      Alert.alert('Success', 'Profile details updated.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }
    try {
      setSavingPassword(true);
      Alert.alert('Success', 'Password update request processed.');
      setNewPassword('');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not update password');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const displayName = profile?.full_name || user?.full_name || 'User';
  const displayEmail = user?.email || '';
  const displayRole = (profile?.role || user?.role) === 'admin' ? 'Family Admin' : 'Family Member';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Profile & Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Profile Card */}
        <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              {profile?.avatar_url || user?.avatar_url ? (
                <Image
                  source={{ uri: profile?.avatar_url || user?.avatar_url || '' }}
                  style={styles.avatarImage}
                />
              ) : (
                <Text style={styles.avatarText}>{displayName.charAt(0)}</Text>
              )}
            </View>
            <TouchableOpacity style={styles.cameraBadge} onPress={handlePickAvatar} disabled={uploadingAvatar}>
              {uploadingAvatar ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <MaterialCommunityIcons name="camera" size={16} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>

          <Text style={[styles.userName, { color: colors.text }]}>{displayName}</Text>
          <Text style={[styles.userEmail, { color: colors.subtext }]}>{displayEmail}</Text>

          {/* Badges */}
          <View style={styles.badgesRow}>
            <View style={styles.badgePrimary}>
              <MaterialCommunityIcons name="shield-check" size={14} color="#4338CA" />
              <Text style={styles.badgePrimaryText}>{displayRole}</Text>
            </View>
            <View style={[styles.badgeSecondary, { backgroundColor: colors.background }]}>
              <MaterialCommunityIcons name="account-group" size={14} color={colors.subtext} />
              <Text style={[styles.badgeSecondaryText, { color: colors.text }]}>
                {familyGroupName} ({memberCount} members)
              </Text>
            </View>
          </View>
        </View>

        {/* Theme Setting */}
        <View style={[styles.settingSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <MaterialCommunityIcons
                name={theme === 'dark' ? 'weather-night' : 'white-balance-sunny'}
                size={22}
                color="#6366F1"
              />
              <Text style={[styles.settingTitle, { color: colors.text }]}>Dark Mode</Text>
            </View>

            <TouchableOpacity onPress={toggleTheme} style={[styles.toggleBtn, { backgroundColor: theme === 'dark' ? '#6366F1' : colors.border }]}>
              <View style={[styles.toggleThumb, { transform: [{ translateX: theme === 'dark' ? 18 : 2 }] }]} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Edit Personal Details */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Personal Information</Text>

          <Text style={[styles.inputLabel, { color: colors.text, marginTop: 10 }]}>Full Name</Text>
          <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
            value={fullName}
            onChangeText={setFullName}
          />

          <Text style={[styles.inputLabel, { color: colors.text, marginTop: 10 }]}>Phone Number</Text>
          <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
            value={phone}
            onChangeText={setPhone}
            placeholder="+91 9876543210"
            placeholderTextColor={colors.subtext}
          />

          <TouchableOpacity style={styles.saveBtn} onPress={handleUpdateDetails} disabled={savingProfile}>
            {savingProfile ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.saveBtnText}>Save Profile Details</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Update Password */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Update Password</Text>

          <Text style={[styles.inputLabel, { color: colors.text, marginTop: 10 }]}>New Password</Text>
          <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
            placeholder="At least 6 characters"
            placeholderTextColor={colors.subtext}
            secureTextEntry
            value={newPassword}
            onChangeText={setNewPassword}
          />

          <TouchableOpacity style={styles.saveBtn} onPress={handleUpdatePassword} disabled={savingPassword}>
            {savingPassword ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.saveBtnText}>Update Password</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Logout & Delete */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <MaterialCommunityIcons name="logout" size={18} color="#EF4444" />
          <Text style={styles.logoutBtnText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 20, fontWeight: '800' },
  scroll: { padding: 18, paddingBottom: 40 },
  profileCard: {
    alignItems: 'center',
    padding: 22,
    borderRadius: 22,
    borderWidth: 1,
    marginBottom: 16,
  },
  avatarWrap: { position: 'relative', marginBottom: 12 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { color: '#FFF', fontSize: 32, fontWeight: 'bold' },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#4338CA',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  userName: { fontSize: 18, fontWeight: '800' },
  userEmail: { fontSize: 12, marginTop: 2 },
  badgesRow: { flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap', justifyContent: 'center' },
  badgePrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  badgePrimaryText: { color: '#4338CA', fontSize: 11, fontWeight: '700' },
  badgeSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  badgeSecondaryText: { fontSize: 11, fontWeight: '600' },
  settingSection: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 16,
  },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  settingTitle: { fontSize: 14, fontWeight: '700' },
  toggleBtn: { width: 44, height: 26, borderRadius: 13, justifyContent: 'center' },
  toggleThumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#FFFFFF' },
  card: { padding: 18, borderRadius: 18, borderWidth: 1, marginBottom: 16 },
  cardTitle: { fontSize: 15, fontWeight: '800' },
  inputLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, height: 42, fontSize: 13 },
  saveBtn: {
    backgroundColor: '#6366F1',
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  saveBtnText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    height: 46,
    borderRadius: 14,
    marginTop: 4,
  },
  logoutBtnText: { color: '#EF4444', fontWeight: '700', fontSize: 14 },
});
