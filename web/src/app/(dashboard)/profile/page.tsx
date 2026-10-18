'use client';

import React, { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Phone,
  Shield,
  Upload,
  Lock,
  Trash2,
  Users,
  Check,
  LogOut,
  Camera,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Profile } from '@expense-app/shared';

export default function ProfilePage() {
  const { user, updateUser, logout } = useAuth();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [memberCount, setMemberCount] = useState(0);
  const [familyGroupName, setFamilyGroupName] = useState('');
  const [loading, setLoading] = useState(true);

  // Edit fields
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);

  // Avatar upload
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Password fields
  const [newPassword, setNewPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const data = await api.getProfile();
        setProfile(data.profile);
        setMemberCount(data.memberCount);
        setFamilyGroupName(data.familyGroup?.name || 'Family');
        setFullName(data.profile.full_name || '');
        setPhone(data.profile.phone || '');
      } catch (err: any) {
        console.error('Failed to load profile:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingProfile(true);
      setError(null);
      setProfileSuccess(false);

      const updated = await api.updateProfile({
        full_name: fullName,
        phone: phone || undefined,
      });

      setProfile(updated);
      updateUser({ full_name: updated.full_name, phone: updated.phone });
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingAvatar(true);
      setError(null);
      const res = await api.uploadAvatar(file);
      setProfile(res.profile);
      updateUser({ avatar_url: res.avatar_url });
    } catch (err: any) {
      setError(err.message || 'Failed to upload avatar');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    try {
      setSavingPassword(true);
      setError(null);
      setPasswordSuccess(false);
      await api.changePassword(newPassword);
      setNewPassword('');
      setPasswordSuccess(true);
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to change password');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      try {
        await api.deleteAccount();
        await logout();
      } catch (err: any) {
        alert(err.message || 'Failed to delete account');
      }
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Account & Profile Settings
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Manage your personal identity, Supabase storage photo, and family account security
        </p>
      </div>

      {error && (
        <div className="p-3 text-xs bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 rounded-xl">
          {error}
        </div>
      )}

      {/* Profile Overview Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
            {/* Avatar with Upload Badge */}
            <div className="relative group">
              <div className="w-24 h-24 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-3xl shadow-lg ring-4 ring-indigo-100 dark:ring-indigo-950/50 overflow-hidden">
                {profile?.avatar_url || user?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile?.avatar_url || user?.avatar_url || ''}
                    alt={profile?.full_name || 'Avatar'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  profile?.full_name?.charAt(0) || user?.full_name?.charAt(0) || 'U'
                )}
              </div>

              <label className="absolute bottom-0 right-0 p-2 rounded-full bg-white dark:bg-slate-800 shadow-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-200 hover:text-indigo-600 cursor-pointer transition">
                <Camera className="w-4 h-4" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  disabled={uploadingAvatar}
                  className="hidden"
                />
              </label>
            </div>

            <div className="flex-1 space-y-1">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {profile?.full_name || user?.full_name || 'Ramesh Kumar'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {user?.email || 'ramesh@example.com'}
              </p>

              <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800">
                  <Shield className="w-3.5 h-3.5" />
                  Family Admin
                </span>

                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  <Users className="w-3.5 h-3.5" />
                  {familyGroupName} ({memberCount} members)
                </span>
              </div>
            </div>

            <div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => logout()}
                className="text-rose-600 border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-950/30"
              >
                <LogOut className="w-4 h-4 mr-1.5" />
                Sign Out
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Details Form */}
      <Card>
        <CardHeader>
          <CardTitle>Personal Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  placeholder="+91 9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              {profileSuccess && (
                <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <Check className="w-4 h-4" />
                  Profile details saved successfully
                </span>
              )}
              <div className="ml-auto">
                <Button type="submit" size="sm" isLoading={savingProfile}>
                  Save Changes
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle>Security & Password</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="max-w-md">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                New Password
              </label>
              <input
                type="password"
                required
                placeholder="At least 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              {passwordSuccess && (
                <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <Check className="w-4 h-4" />
                  Password updated successfully
                </span>
              )}
              <div className="ml-auto">
                <Button type="submit" size="sm" isLoading={savingPassword}>
                  Update Password
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Danger Zone: Delete Account */}
      <Card className="border-rose-200 dark:border-rose-900/50">
        <CardHeader className="bg-rose-50/50 dark:bg-rose-950/20">
          <CardTitle className="text-rose-600 dark:text-rose-400 text-sm">
            Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
              Delete Account
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Permanently remove your account and all family expense history from the database.
            </p>
          </div>

          <Button
            size="sm"
            variant="danger"
            onClick={handleDeleteAccount}
          >
            <Trash2 className="w-4 h-4 mr-1.5" />
            Delete Account
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

