import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Link, Redirect, useLocalSearchParams } from 'expo-router';

import { GlowingButtonNative } from '../src/components/neon/GlowingButtonNative';
import { NeonGlassCardNative } from '../src/components/neon/NeonGlassCardNative';
import { useMobileAuth } from '../src/lib/auth';
import { mobileEnv } from '../src/lib/env';
import { getPreferredMobileRoute } from '../src/lib/navigation';
import type { AppRole } from '../src/lib/mobile-api';

const ROLES: AppRole[] = ['athlete', 'coach', 'individual'];
const LEGAL_DOC_LINKS = [
  { label: 'Terms', path: '/terms' },
  { label: 'Privacy', path: '/privacy' },
  { label: 'Consent', path: '/consent' },
  { label: 'Disclaimer', path: '/disclaimer' },
  { label: 'AI Transparency', path: '/ai-transparency' },
] as const;

function ConsentToggle({
  label,
  description,
  value,
  onToggle,
}: {
  label: string;
  description: string;
  value: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable
      onPress={onToggle}
      className={`mt-4 rounded-3xl border px-4 py-4 ${
        value ? 'border-[#00E5FF]/50 bg-[#00E5FF]/10' : 'border-white/5 bg-white/[0.03]'
      }`}
    >
      <Text className="text-sm font-bold text-white">{label}</Text>
      <Text className="mt-2 text-sm leading-6 text-white/55">{description}</Text>
    </Pressable>
  );
}

function LinkPill({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-3"
    >
      <Text className="text-[10px] font-bold uppercase tracking-[0.18em] text-chakra-neon">
        {label}
      </Text>
    </Pressable>
  );
}

export default function SignupScreen() {
  const params = useLocalSearchParams<{
    coach?: string | string[];
    invite?: string | string[];
    role?: string | string[];
  }>();
  const { session, user, signUp, loading } = useMobileAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const coachLockerCode = typeof params.coach === 'string' ? params.coach : undefined;
  const inviteToken = typeof params.invite === 'string' ? params.invite : undefined;
  const roleParam =
    typeof params.role === 'string' && ROLES.includes(params.role as AppRole)
      ? (params.role as AppRole)
      : 'athlete';
  const [role, setRole] = useState<AppRole>(roleParam);
  const [coachCode, setCoachCode] = useState(coachLockerCode || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [consentState, setConsentState] = useState({
    termsPrivacy: false,
    medicalDisclaimer: false,
    dataProcessing: false,
    aiAcknowledgement: false,
    marketing: false,
  });

  const requiredConsentComplete =
    consentState.termsPrivacy &&
    consentState.medicalDisclaimer &&
    consentState.dataProcessing &&
    consentState.aiAcknowledgement;

  if (!loading && session && user) {
    return <Redirect href={getPreferredMobileRoute(user, { coachLockerCode, inviteToken })} />;
  }

  function openLegalDoc(path: string) {
    void Linking.openURL(`${mobileEnv.apiBaseUrl}${path}`).catch(() => {
      setError('Could not open the requested legal page on this device.');
    });
  }

  async function handleSignup() {
    setSubmitting(true);
    setError(null);
    setMessage(null);

    const result = await signUp({
      fullName,
      email,
      password,
      role,
      coachLockerCode: role === 'athlete' ? coachCode : undefined,
      inviteToken: role === 'athlete' ? inviteToken : undefined,
      termsPrivacyConsent: consentState.termsPrivacy,
      medicalDisclaimerConsent: consentState.medicalDisclaimer,
      dataProcessingConsent: consentState.dataProcessing,
      aiAcknowledgementConsent: consentState.aiAcknowledgement,
      marketingConsent: consentState.marketing,
    });
    if (!result.ok) {
      setError(result.error);
    } else if (result.needsEmailVerification) {
      setMessage('Your account was created. Check your email to verify the address before signing in.');
    }

    setSubmitting(false);
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-background"
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}>
        <View className="mb-10">
          <Text className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/35">
            CREEDA Mobile
          </Text>
          <Text className="mt-4 text-5xl font-black tracking-tight text-white">Create account</Text>
          <Text className="mt-4 text-sm leading-6 text-white/55">
            Signup now writes the real CREEDA role and profile metadata into Supabase so the mobile dashboard can bootstrap correctly.
          </Text>
          {coachLockerCode || inviteToken ? (
            <Text className="mt-4 text-sm leading-6 text-chakra-neon">
              This account will carry your athlete invite context into onboarding after signup.
            </Text>
          ) : null}
        </View>

        <NeonGlassCardNative watermark="NEW">
          <Text className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">Full name</Text>
          <TextInput
            autoCapitalize="words"
            onChangeText={setFullName}
            placeholder="Your full name"
            placeholderTextColor="rgba(255,255,255,0.28)"
            value={fullName}
            className="mt-3 rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-4 text-base text-white"
          />

          <Text className="mt-5 text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">Role</Text>
          <View className="mt-3 flex-row flex-wrap gap-3">
            {ROLES.map((roleOption) => {
              const active = roleOption === role;
              return (
                <Pressable
                  key={roleOption}
                  onPress={() => setRole(roleOption)}
                  className={`rounded-full border px-4 py-3 ${
                    active
                      ? 'border-[#00E5FF]/50 bg-[#00E5FF]/10'
                      : 'border-white/5 bg-white/[0.03]'
                  }`}
                >
                  <Text
                    className={`text-xs font-bold uppercase tracking-[0.18em] ${
                      active ? 'text-chakra-neon' : 'text-white/55'
                    }`}
                  >
                    {roleOption}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text className="mt-5 text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">Email</Text>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="you@creeda.app"
            placeholderTextColor="rgba(255,255,255,0.28)"
            value={email}
            className="mt-3 rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-4 text-base text-white"
          />

          <Text className="mt-5 text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">Password</Text>
          <TextInput
            secureTextEntry
            onChangeText={setPassword}
            placeholder="Choose a password"
            placeholderTextColor="rgba(255,255,255,0.28)"
            value={password}
            className="mt-3 rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-4 text-base text-white"
          />

          {role === 'athlete' ? (
            <>
              <Text className="mt-5 text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">
                Coach locker code
              </Text>
              <TextInput
                autoCapitalize="characters"
                onChangeText={setCoachCode}
                placeholder="Optional coach code"
                placeholderTextColor="rgba(255,255,255,0.28)"
                value={coachCode}
                className="mt-3 rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-4 text-base text-white"
              />
              <Text className="mt-3 text-sm leading-6 text-white/45">
                Add this if your coach invited you into CREEDA. We will validate it during signup.
              </Text>
              {inviteToken ? (
                <Text className="mt-2 text-sm leading-6 text-chakra-neon">
                  Your team invite context will also be attached after signup.
                </Text>
              ) : null}
            </>
          ) : null}

          <View className="mt-6 rounded-3xl border border-white/10 bg-white/[0.03] p-4">
            <Text className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">
              Legal acknowledgements
            </Text>
            <Text className="mt-3 text-sm leading-6 text-white/55">
              The items below match the required CREEDA signup acknowledgements from the web flow.
            </Text>
            <View className="mt-4 flex-row flex-wrap gap-3">
              {LEGAL_DOC_LINKS.map((link) => (
                <LinkPill
                  key={link.path}
                  label={`Open ${link.label}`}
                  onPress={() => openLegalDoc(link.path)}
                />
              ))}
            </View>

            <ConsentToggle
              label="Terms and privacy"
              description="I agree to CREEDA's Terms and Privacy Policy."
              value={consentState.termsPrivacy}
              onToggle={() =>
                setConsentState((current) => ({
                  ...current,
                  termsPrivacy: !current.termsPrivacy,
                }))
              }
            />
            <ConsentToggle
              label="Medical disclaimer"
              description="I understand CREEDA is decision-support and not diagnosis or medical treatment."
              value={consentState.medicalDisclaimer}
              onToggle={() =>
                setConsentState((current) => ({
                  ...current,
                  medicalDisclaimer: !current.medicalDisclaimer,
                }))
              }
            />
            <ConsentToggle
              label="Data processing"
              description="I consent to processing my training, wellness, and profile data under CREEDA's consent standards."
              value={consentState.dataProcessing}
              onToggle={() =>
                setConsentState((current) => ({
                  ...current,
                  dataProcessing: !current.dataProcessing,
                }))
              }
            />
            <ConsentToggle
              label="AI transparency"
              description="I understand CREEDA uses AI and rules-based systems for advisory outputs."
              value={consentState.aiAcknowledgement}
              onToggle={() =>
                setConsentState((current) => ({
                  ...current,
                  aiAcknowledgement: !current.aiAcknowledgement,
                }))
              }
            />
            <ConsentToggle
              label="Marketing updates (optional)"
              description="I want product updates and educational emails from CREEDA."
              value={consentState.marketing}
              onToggle={() =>
                setConsentState((current) => ({
                  ...current,
                  marketing: !current.marketing,
                }))
              }
            />
          </View>

          {message ? (
            <Text className="mt-4 text-sm leading-6 text-chakra-neon">{message}</Text>
          ) : null}
          {error ? (
            <Text className="mt-4 text-sm leading-6 text-[#FF8C5A]">{error}</Text>
          ) : null}

          <View className="mt-6">
            {submitting ? (
              <View className="items-center py-4">
                <ActivityIndicator color="#FF5F1F" />
              </View>
            ) : (
              <GlowingButtonNative
                title="Create Account"
                variant="chakra"
                onPress={handleSignup}
                disabled={!fullName || !email || !password || !requiredConsentComplete}
              />
            )}
          </View>
        </NeonGlassCardNative>

        <Link
          href={{
            pathname: '/login',
            params: {
              ...(coachLockerCode ? { coach: coachLockerCode } : {}),
              ...(inviteToken ? { invite: inviteToken } : {}),
            },
          }}
          asChild
        >
          <Pressable className="mt-6 items-center">
            <Text className="text-sm font-semibold text-white/60">
              Already have an account? <Text className="text-chakra-neon">Sign in</Text>
            </Text>
          </Pressable>
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
