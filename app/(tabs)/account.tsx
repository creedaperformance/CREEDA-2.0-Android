import { useEffect, useState, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Eye, EyeOff, LogOut, ShieldAlert, ShieldCheck, User } from 'lucide-react-native';

import { GlowingButtonNative } from '../../src/components/neon/GlowingButtonNative';
import { NeonGlassCardNative } from '../../src/components/neon/NeonGlassCardNative';
import { useMobileAuth } from '../../src/lib/auth';
import { mobileEnv } from '../../src/lib/env';
import AvatarCaptureCard from '../../src/components/profile/AvatarCaptureCard';
import { ProfileAvatarNative } from '../../src/components/profile/ProfileAvatarNative';
import {
  deleteMobileAccount,
  removeMobileAvatar,
  updateMobileAvatar,
  updateMobileProfile,
} from '../../src/lib/mobile-api';
import { supabase } from '../../src/lib/supabase';

const LEGAL_DOC_LINKS = [
  { label: 'Terms', path: '/terms' },
  { label: 'Privacy', path: '/privacy' },
  { label: 'Consent', path: '/consent' },
  { label: 'Disclaimer', path: '/disclaimer' },
  { label: 'AI Transparency', path: '/ai-transparency' },
] as const;

function AccountStat({ label, value }: { label: string; value: string }) {
  return (
    <View className="rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3">
      <Text className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">{label}</Text>
      <Text className="mt-2 text-base font-black tracking-tight text-white">{value}</Text>
    </View>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  autoCapitalize,
  keyboardType,
  secureTextEntry,
  trailing,
}: {
  label: string;
  value: string;
  onChange: (nextValue: string) => void;
  placeholder?: string;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: 'default' | 'phone-pad';
  secureTextEntry?: boolean;
  trailing?: ReactNode;
}) {
  return (
    <View className="mt-5">
      <Text className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">{label}</Text>
      <View className="mt-3 rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-1">
        <View className="flex-row items-center gap-3">
          <TextInput
            value={value}
            onChangeText={onChange}
            placeholder={placeholder}
            placeholderTextColor="rgba(255,255,255,0.28)"
            autoCapitalize={autoCapitalize}
            keyboardType={keyboardType}
            secureTextEntry={secureTextEntry}
            className="flex-1 py-4 text-base text-white"
          />
          {trailing}
        </View>
      </View>
    </View>
  );
}

export default function AccountScreen() {
  const router = useRouter();
  const { session, user, signOut, refreshUser, error } = useMobileAuth();
  const [formData, setFormData] = useState({
    full_name: '',
    username: '',
    mobile_number: '',
  });
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setFormData({
      full_name: user?.profile.fullName || '',
      username: user?.profile.username || '',
      mobile_number: user?.profile.mobileNumber || '',
    });
  }, [user?.profile.fullName, user?.profile.mobileNumber, user?.profile.username]);

  function openLegalDoc(path: string) {
    void Linking.openURL(`${mobileEnv.apiBaseUrl}${path}`);
  }

  function openRoleLegalCenter() {
    const rolePath = user?.profile.role ? `/${user.profile.role}/legal` : '/privacy';
    void Linking.openURL(`${mobileEnv.apiBaseUrl}${rolePath}`);
  }

  async function handleSaveProfile() {
    if (!session?.access_token) {
      setFormError('Your session expired. Sign in again to update settings.');
      return;
    }

    if (newPassword) {
      if (newPassword.length < 8) {
        setFormError('Password must be at least 8 characters.');
        return;
      }

      if (newPassword !== confirmPassword) {
        setFormError('Passwords do not match.');
        return;
      }
    }

    setIsSaving(true);
    setFormError(null);
    setStatus(null);

    try {
      await updateMobileProfile(session.access_token, {
        full_name: formData.full_name.trim(),
        username: formData.username.trim().toLowerCase(),
        mobile_number: formData.mobile_number.trim(),
      });

      if (newPassword) {
        const { error: passwordError } = await supabase.auth.updateUser({
          password: newPassword,
        });

        if (passwordError) {
          throw new Error(`Profile saved, but password update failed: ${passwordError.message}`);
        }
      }

      await refreshUser();
      setNewPassword('');
      setConfirmPassword('');
      setStatus('Your mobile account settings are now synced with CREEDA.');
    } catch (saveError) {
      setFormError(
        saveError instanceof Error
          ? saveError.message
          : 'Failed to update your account settings.'
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteAccount() {
    if (!session?.access_token) {
      setFormError('Your session expired. Sign in again to continue.');
      return;
    }

    setIsDeleting(true);
    setFormError(null);
    setStatus(null);

    try {
      await deleteMobileAccount(session.access_token);
      await signOut();
      router.replace('/signup');
    } catch (deleteError) {
      setFormError(
        deleteError instanceof Error
          ? deleteError.message
          : 'Failed to delete this account.'
      );
      setIsDeleting(false);
      setConfirmDelete(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-background"
    >
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 64, paddingBottom: 140 }}>
        <View className="mb-8">
          <Text className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/35">
            Session
          </Text>
          <Text className="mt-3 text-4xl font-black tracking-tight text-white">Account</Text>
          <Text className="mt-3 text-sm leading-6 text-white/55">
            Supabase auth is now persistent in Expo and this screen reflects the live CREEDA user profile attached to your mobile session.
          </Text>
        </View>

        {status ? (
          <NeonGlassCardNative>
            <Text className="text-lg font-black tracking-tight text-white">Profile synced</Text>
            <Text className="mt-3 text-sm leading-6 text-white/55">{status}</Text>
          </NeonGlassCardNative>
        ) : null}

        {user && session ? (
          <View className="mb-6">
            <AvatarCaptureCard
              userId={user.id}
              currentUrl={user.profile.avatarUrl}
              title="Profile Avatar"
              description="Capture a fresh profile photo and sync it straight into your live CREEDA account."
              onUploaded={async (avatarUrl: string) => {
                await updateMobileAvatar(session.access_token, avatarUrl);
                await refreshUser();
                setStatus('Your avatar is live on mobile now.');
              }}
              onRemoved={async () => {
                await removeMobileAvatar(session.access_token);
                await refreshUser();
                setStatus('Your avatar was removed from this CREEDA account.');
              }}
            />
          </View>
        ) : null}

        <NeonGlassCardNative watermark="ME">
          <View className="mb-4 flex-row items-start gap-3">
            <View className="mt-1">
              <ProfileAvatarNative
                uri={user?.profile.avatarUrl}
                name={user?.profile.fullName}
                size={52}
              />
            </View>
            <View className="flex-1">
              <Text className="text-lg font-black tracking-tight text-white">
                {user?.profile.fullName || 'Authenticated CREEDA user'}
              </Text>
              <Text className="mt-1 text-sm leading-6 text-white/55">
                {session?.user.email || user?.email || 'No email attached'}
              </Text>
            </View>
          </View>

          <View className="flex-row flex-wrap gap-3">
            <AccountStat label="Role" value={user?.profile.role || 'Unknown'} />
            <AccountStat
              label="Onboarding"
              value={user?.profile.onboardingCompleted ? 'Complete' : 'Incomplete'}
            />
            <AccountStat label="Sport" value={user?.profile.primarySport || 'Not set'} />
            <AccountStat label="Position" value={user?.profile.position || 'Not set'} />
          </View>
        </NeonGlassCardNative>

        {error ? (
          <NeonGlassCardNative>
            <View className="mb-3 flex-row items-start gap-3">
              <View className="mt-1 rounded-2xl border border-white/5 bg-white/[0.04] p-2">
                <ShieldCheck color="#00E5FF" size={16} />
              </View>
              <View className="flex-1">
                <Text className="text-lg font-black tracking-tight text-white">Profile status</Text>
                <Text className="mt-1 text-sm leading-6 text-white/55">{error}</Text>
              </View>
            </View>
          </NeonGlassCardNative>
        ) : null}

        {formError ? (
          <NeonGlassCardNative>
            <Text className="text-base font-bold text-[#FF8C5A]">Settings issue</Text>
            <Text className="mt-3 text-sm leading-6 text-white/65">{formError}</Text>
          </NeonGlassCardNative>
        ) : null}

        <NeonGlassCardNative watermark="SET">
          <Text className="text-lg font-black tracking-tight text-white">Account Settings</Text>
          <Text className="mt-3 text-sm leading-6 text-white/55">
            This now mirrors the web account settings flow from mobile, including profile updates and credential rotation.
          </Text>

          <TextField
            label="Full Name"
            value={formData.full_name}
            onChange={(nextValue) =>
              setFormData((current) => ({ ...current, full_name: nextValue }))
            }
            autoCapitalize="words"
            placeholder="Your full name"
          />

          <TextField
            label="Username"
            value={formData.username}
            onChange={(nextValue) =>
              setFormData((current) => ({
                ...current,
                username: nextValue.toLowerCase().replace(/[^a-z0-9_]/g, ''),
              }))
            }
            autoCapitalize="none"
            placeholder="username"
          />

          <TextField
            label="Mobile Number"
            value={formData.mobile_number}
            onChange={(nextValue) =>
              setFormData((current) => ({ ...current, mobile_number: nextValue }))
            }
            keyboardType="phone-pad"
            placeholder="+91 98XXX XXXXX"
          />

          <TextField
            label="New Password"
            value={newPassword}
            onChange={setNewPassword}
            placeholder="Minimum 8 characters"
            secureTextEntry={!showPassword}
            trailing={
              <Pressable onPress={() => setShowPassword((current) => !current)}>
                {showPassword ? (
                  <EyeOff color="#9CA3AF" size={18} />
                ) : (
                  <Eye color="#9CA3AF" size={18} />
                )}
              </Pressable>
            }
          />

          <TextField
            label="Confirm Password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            placeholder="Repeat your new password"
            secureTextEntry={!showPassword}
          />

          <View className="mt-5">
            <GlowingButtonNative
              title={isSaving ? 'Synchronizing...' : 'Synchronize Profile'}
              variant="chakra"
              onPress={() => {
                void handleSaveProfile();
              }}
              disabled={isSaving || isDeleting}
            />
          </View>
        </NeonGlassCardNative>

        <NeonGlassCardNative>
          <Text className="text-lg font-black tracking-tight text-white">Mobile API target</Text>
          <Text className="mt-3 text-sm leading-6 text-white/55">{mobileEnv.apiBaseUrl}</Text>
          <View className="mt-5">
            <GlowingButtonNative
              title="Refresh Profile"
              variant="chakra"
              onPress={() => {
                void refreshUser();
              }}
            />
          </View>
        </NeonGlassCardNative>

        <NeonGlassCardNative>
          <Text className="text-lg font-black tracking-tight text-white">Data Sovereignty</Text>
          <Text className="mt-3 text-sm leading-6 text-white/55">
            Open your role-specific legal center for export, deletion, correction, and consent guidance.
          </Text>
          <View className="mt-5">
            <GlowingButtonNative
              title="Open Legal Center"
              variant="chakra"
              onPress={openRoleLegalCenter}
            />
          </View>
        </NeonGlassCardNative>

        <NeonGlassCardNative>
          <Text className="text-lg font-black tracking-tight text-white">Legal Documents</Text>
          <Text className="mt-3 text-sm leading-6 text-white/55">
            Open the core CREEDA policies and transparency pages from mobile anytime.
          </Text>
          <View className="mt-5 flex-row flex-wrap gap-3">
            {LEGAL_DOC_LINKS.map((link) => (
              <Pressable
                key={link.path}
                onPress={() => openLegalDoc(link.path)}
                className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-3"
              >
                <Text className="text-[10px] font-bold uppercase tracking-[0.18em] text-chakra-neon">
                  {link.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </NeonGlassCardNative>

        <NeonGlassCardNative>
          <View className="mb-3 flex-row items-start gap-3">
            <View className="mt-1 rounded-2xl border border-white/5 bg-white/[0.04] p-2">
              <ShieldAlert color="#FF8C5A" size={16} />
            </View>
            <View className="flex-1">
              <Text className="text-lg font-black tracking-tight text-white">Danger Zone</Text>
              <Text className="mt-1 text-sm leading-6 text-white/55">
                Permanently erase this CREEDA account and disconnect associated data. This mirrors the destructive web account flow.
              </Text>
            </View>
          </View>

          {!confirmDelete ? (
            <GlowingButtonNative
              title="Initiate Account Deletion"
              variant="saffron"
              onPress={() => setConfirmDelete(true)}
              disabled={isSaving || isDeleting}
            />
          ) : (
            <View className="gap-3">
              <Text className="text-center text-[10px] font-bold uppercase tracking-[0.18em] text-[#FF8C5A]">
                Confirm permanent deletion
              </Text>
              <GlowingButtonNative
                title={isDeleting ? 'Deleting Account...' : 'Yes, Delete Everything'}
                variant="saffron"
                onPress={() => {
                  void handleDeleteAccount();
                }}
                disabled={isSaving || isDeleting}
              />
              <GlowingButtonNative
                title="Cancel"
                variant="chakra"
                onPress={() => setConfirmDelete(false)}
                disabled={isSaving || isDeleting}
              />
            </View>
          )}
        </NeonGlassCardNative>

        <View className="mt-4">
          <GlowingButtonNative
            title="Sign Out"
            variant="saffron"
            icon={<LogOut color="#FF5F1F" size={18} />}
            onPress={() => {
              void signOut();
            }}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
