import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import {
  ArrowLeft,
  CheckCircle2,
  ShieldCheck,
  Target,
  Trophy,
  Users,
  Zap,
} from 'lucide-react-native';

import { GlowingButtonNative } from '../src/components/neon/GlowingButtonNative';
import { NeonGlassCardNative } from '../src/components/neon/NeonGlassCardNative';
import AvatarCaptureCard from '../src/components/profile/AvatarCaptureCard';
import { useMobileAuth } from '../src/lib/auth';
import {
  submitCoachOnboarding,
  type CoachOnboardingPayload,
  type CoachOnboardingResponse,
} from '../src/lib/mobile-api';

const COACHING_LEVEL_OPTIONS = [
  'Private Pro Coach',
  'Academy / Club Coach',
  'School / University Coach',
] as const;

const TEAM_TYPE_OPTIONS = [
  'Single Team',
  'Multiple Teams / Age Groups',
  'Individual Athletes',
] as const;

const FOCUS_OPTIONS = [
  'Injury Risk Reduction',
  'Peak Performance Optimization',
  'Player Compliance',
  'Scouting / Talent ID',
] as const;

const ATHLETE_COUNT_OPTIONS = ['1-5', '6-15', '16-30', '30+'] as const;
const TRAINING_FREQUENCY_OPTIONS = ['Daily', '3-4x Weekly', '1-2x Weekly'] as const;

const SPORTS_OPTIONS = [
  'Athletics (Sprints)',
  'Athletics (Distance)',
  'Athletics (Jumps/Throws)',
  'Badminton',
  'Basketball',
  'Boxing',
  'Cricket',
  'Cycling',
  'Football',
  'Gymnastics',
  'Field Hockey',
  'Judo',
  'Kabaddi',
  'Powerlifting',
  'Rowing',
  'Swimming (Sprints)',
  'Swimming (Distance)',
  'Table Tennis',
  'Tennis',
  'Volleyball',
  'Wrestling',
  'Weightlifting',
  'Taekwondo',
  'Squash',
  'Shooting',
  'Archery',
  'Golf',
  'Other',
] as const;

const RISK_OPTIONS = [
  'Non-Contact ACL',
  'Hamstring Strains',
  'Mental Burnout',
  'Fatigue-Related Error',
  'Chronic Overload',
  'General Fatigue',
] as const;

type FormState = CoachOnboardingPayload;

const initialFormState: FormState = {
  fullName: '',
  username: '',
  mobileNumber: '',
  teamName: '',
  sportCoached: 'Cricket',
  coachingLevel: 'Academy / Club Coach',
  teamType: 'Single Team',
  mainCoachingFocus: 'Peak Performance Optimization',
  numberOfAthletes: '6-15',
  trainingFrequency: '3-4x Weekly',
  criticalRisks: ['General Fatigue'],
  avatarUrl: '',
};

function ChoicePill({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`rounded-full border px-4 py-3 ${
        active ? 'border-[#00E5FF]/50 bg-[#00E5FF]/10' : 'border-white/5 bg-white/[0.03]'
      }`}
    >
      <Text className={`text-xs font-bold uppercase tracking-[0.18em] ${active ? 'text-chakra-neon' : 'text-white/60'}`}>
        {label}
      </Text>
    </Pressable>
  );
}

function SingleChoiceGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly string[];
  value: string;
  onChange: (nextValue: string) => void;
}) {
  return (
    <View className="mt-5">
      <Text className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">{label}</Text>
      <View className="mt-3 flex-row flex-wrap gap-3">
        {options.map((option) => (
          <ChoicePill
            key={`${label}-${option}`}
            label={option}
            active={value === option}
            onPress={() => onChange(option)}
          />
        ))}
      </View>
    </View>
  );
}

function MultiChoiceGroup({
  label,
  options,
  values,
  onToggle,
}: {
  label: string;
  options: readonly string[];
  values: string[];
  onToggle: (nextValue: string) => void;
}) {
  return (
    <View className="mt-5">
      <Text className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">{label}</Text>
      <View className="mt-3 flex-row flex-wrap gap-3">
        {options.map((option) => (
          <ChoicePill
            key={`${label}-${option}`}
            label={option}
            active={values.includes(option)}
            onPress={() => onToggle(option)}
          />
        ))}
      </View>
    </View>
  );
}

function TextField({
  label,
  value,
  onChange,
  autoCapitalize,
  keyboardType,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (nextValue: string) => void;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: 'default' | 'email-address' | 'number-pad' | 'phone-pad';
  placeholder?: string;
}) {
  return (
    <View className="mt-5">
      <Text className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">{label}</Text>
      <TextInput
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
        onChangeText={onChange}
        value={value}
        placeholder={placeholder}
        placeholderTextColor="rgba(255,255,255,0.28)"
        className="mt-3 rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-4 text-base text-white"
      />
    </View>
  );
}

export default function CoachOnboardingScreen() {
  const router = useRouter();
  const { session, user, refreshUser } = useMobileAuth();
  const [form, setForm] = useState<FormState>(initialFormState);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CoachOnboardingResponse | null>(null);

  useEffect(() => {
    if (!user || user.profile.role !== 'coach') return;

    setForm((current) => ({
      ...current,
      fullName: current.fullName || user.profile.fullName || '',
      username: current.username || user.profile.username || '',
      sportCoached:
        user.profile.primarySport &&
        SPORTS_OPTIONS.includes(user.profile.primarySport as (typeof SPORTS_OPTIONS)[number]) &&
        current.sportCoached === initialFormState.sportCoached
          ? (user.profile.primarySport as FormState['sportCoached'])
          : current.sportCoached,
      avatarUrl: current.avatarUrl || user.profile.avatarUrl || '',
    }));
  }, [user]);

  if (!session) {
    return <Redirect href="/login" />;
  }

  if (!user) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-8">
        <ActivityIndicator color="#FF5F1F" size="large" />
        <Text className="mt-4 text-center text-sm font-semibold tracking-wide text-white/70">
          Loading your CREEDA profile...
        </Text>
      </View>
    );
  }

  if (user.profile.role !== 'coach') {
    return (
      <View className="flex-1 items-center justify-center bg-background px-8">
        <Text className="text-center text-xl font-black tracking-tight text-white">
          Coach onboarding is currently coach-only
        </Text>
        <Text className="mt-4 text-center text-sm leading-6 text-white/55">
          This setup flow creates your first squad profile and team invite code for the coach dashboard.
        </Text>
      </View>
    );
  }

  if (user.profile.onboardingCompleted && !result) {
    return <Redirect href="/(tabs)" />;
  }

  async function handleSubmit() {
    const accessToken = session?.access_token;
    if (!accessToken) {
      setError('Your session expired. Sign in again to continue onboarding.');
      return;
    }

    if (!user) {
      setError('Your coach profile is still loading. Please try again in a moment.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await submitCoachOnboarding(accessToken, {
        ...form,
        username: form.username.trim().toLowerCase(),
        fullName: form.fullName.trim(),
        teamName: form.teamName.trim(),
        mobileNumber: form.mobileNumber.trim(),
        avatarUrl: form.avatarUrl?.trim() || null,
      });
      setResult(response);
      await refreshUser();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Failed to save your coach onboarding.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <View className="flex-1 bg-background px-6 pt-16">
        <View className="flex-1 items-center justify-center">
          <View className="rounded-full border border-[#00E5FF]/20 bg-[#00E5FF]/10 p-6">
            <ShieldCheck color="#00E5FF" size={36} />
          </View>
          <Text className="mt-6 text-[10px] font-bold uppercase tracking-[0.28em] text-white/35">
            Coach Setup Complete
          </Text>
          <Text className="mt-3 text-4xl font-black tracking-tight text-white">
            Team intelligence is ready
          </Text>
          <Text className="mt-4 text-center text-sm leading-6 text-white/65">
            {result.teamName} is now live inside CREEDA.
          </Text>

          <NeonGlassCardNative watermark="GO">
            <Text className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">
              Your coach locker code
            </Text>
            <Text className="mt-3 text-3xl font-black tracking-tight text-white">
              {result.coachLockerCode}
            </Text>
            <Text className="mt-5 text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">
              Team invite code
            </Text>
            <Text className="mt-3 text-3xl font-black tracking-tight text-chakra-neon">
              {result.teamInviteCode}
            </Text>
          </NeonGlassCardNative>

          <View className="mt-8 w-full gap-4">
            <GlowingButtonNative
              title="Open Coach Dashboard"
              variant="chakra"
              icon={<CheckCircle2 color="#00E5FF" size={18} />}
              onPress={() => router.replace('/(tabs)')}
            />
          </View>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-background"
    >
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 140 }}>
        <Pressable onPress={() => router.back()} className="mb-8 flex-row items-center gap-3">
          <ArrowLeft color="#FF5F1F" size={18} />
          <Text className="text-sm font-semibold text-white/60">Back</Text>
        </Pressable>

        <View className="mb-8">
          <Text className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/35">
            Coach Onboarding
          </Text>
          <Text className="mt-3 text-4xl font-black tracking-tight text-white">
            Set up your first squad
          </Text>
          <Text className="mt-3 text-sm leading-6 text-white/55">
            This native flow creates the same coach profile, squad setup, and invite codes as the web onboarding.
          </Text>
        </View>

        <NeonGlassCardNative watermark="ID">
          <View className="mb-4 flex-row items-start gap-3">
            <View className="mt-1 rounded-2xl border border-white/5 bg-white/[0.04] p-2">
              <ShieldCheck color="#FF5F1F" size={18} />
            </View>
            <View className="flex-1">
              <Text className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">
                Identity
              </Text>
              <Text className="mt-2 text-xl font-black tracking-tight text-white">
                Configure your coaching profile
              </Text>
              <Text className="mt-2 text-sm leading-6 text-white/55">
                These details become the public operating profile for your CREEDA coach dashboard.
              </Text>
            </View>
          </View>

          <AvatarCaptureCard
            userId={user.id}
            currentUrl={form.avatarUrl}
            title="Coach Avatar"
            description="Capture a clean coaching portrait for your team workspace, invite surfaces, and account profile."
            onUploaded={(avatarUrl: string) => {
              setForm((current) => ({ ...current, avatarUrl }));
            }}
            onRemoved={() => {
              setForm((current) => ({ ...current, avatarUrl: '' }));
            }}
          />

          <TextField
            label="Full name and title"
            value={form.fullName}
            onChange={(next) => setForm((current) => ({ ...current, fullName: next }))}
            autoCapitalize="words"
            placeholder="e.g. Head Coach Anil Kumar"
          />
          <TextField
            label="Professional handle"
            value={form.username}
            onChange={(next) => setForm((current) => ({ ...current, username: next }))}
            autoCapitalize="none"
            placeholder="coach_anil"
          />
          <TextField
            label="Verification number"
            value={form.mobileNumber}
            onChange={(next) => setForm((current) => ({ ...current, mobileNumber: next }))}
            keyboardType="phone-pad"
            placeholder="+91 98XXX XXXXX"
          />
        </NeonGlassCardNative>

        <NeonGlassCardNative watermark="SQ">
          <View className="mb-4 flex-row items-start gap-3">
            <View className="mt-1 rounded-2xl border border-white/5 bg-white/[0.04] p-2">
              <Users color="#FF5F1F" size={18} />
            </View>
            <View className="flex-1">
              <Text className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">
                Squad Blueprint
              </Text>
              <Text className="mt-2 text-xl font-black tracking-tight text-white">
                Define your team environment
              </Text>
              <Text className="mt-2 text-sm leading-6 text-white/55">
                CREEDA uses this to build the first coach workspace and invite code structure.
              </Text>
            </View>
          </View>

          <TextField
            label="Team or squad name"
            value={form.teamName}
            onChange={(next) => setForm((current) => ({ ...current, teamName: next }))}
            autoCapitalize="words"
            placeholder="e.g. Haryana U-19 Elite Squad"
          />
          <SingleChoiceGroup
            label="Primary sport"
            options={SPORTS_OPTIONS}
            value={form.sportCoached}
            onChange={(next) =>
              setForm((current) => ({
                ...current,
                sportCoached: next,
              }))
            }
          />
          <SingleChoiceGroup
            label="Coaching tier"
            options={COACHING_LEVEL_OPTIONS}
            value={form.coachingLevel}
            onChange={(next) =>
              setForm((current) => ({
                ...current,
                coachingLevel: next as FormState['coachingLevel'],
              }))
            }
          />
          <SingleChoiceGroup
            label="Organizational structure"
            options={TEAM_TYPE_OPTIONS}
            value={form.teamType}
            onChange={(next) =>
              setForm((current) => ({
                ...current,
                teamType: next as FormState['teamType'],
              }))
            }
          />
        </NeonGlassCardNative>

        <NeonGlassCardNative watermark="CTX">
          <View className="mb-4 flex-row items-start gap-3">
            <View className="mt-1 rounded-2xl border border-white/5 bg-white/[0.04] p-2">
              <Target color="#FF5F1F" size={18} />
            </View>
            <View className="flex-1">
              <Text className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">
                Operational Context
              </Text>
              <Text className="mt-2 text-xl font-black tracking-tight text-white">
                Calibrate your workload environment
              </Text>
              <Text className="mt-2 text-sm leading-6 text-white/55">
                These settings shape the first dashboard, alerts, and intervention priorities for your squad.
              </Text>
            </View>
          </View>

          <SingleChoiceGroup
            label="Primary strategic focus"
            options={FOCUS_OPTIONS}
            value={form.mainCoachingFocus}
            onChange={(next) =>
              setForm((current) => ({
                ...current,
                mainCoachingFocus: next as FormState['mainCoachingFocus'],
              }))
            }
          />
          <SingleChoiceGroup
            label="Active headcount"
            options={ATHLETE_COUNT_OPTIONS}
            value={form.numberOfAthletes}
            onChange={(next) =>
              setForm((current) => ({
                ...current,
                numberOfAthletes: next as FormState['numberOfAthletes'],
              }))
            }
          />
          <SingleChoiceGroup
            label="Training cycles"
            options={TRAINING_FREQUENCY_OPTIONS}
            value={form.trainingFrequency}
            onChange={(next) =>
              setForm((current) => ({
                ...current,
                trainingFrequency: next as FormState['trainingFrequency'],
              }))
            }
          />
        </NeonGlassCardNative>

        <NeonGlassCardNative watermark="RM">
          <View className="mb-4 flex-row items-start gap-3">
            <View className="mt-1 rounded-2xl border border-white/5 bg-white/[0.04] p-2">
              <Zap color="#FF5F1F" size={18} />
            </View>
            <View className="flex-1">
              <Text className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">
                Priority Matrix
              </Text>
              <Text className="mt-2 text-xl font-black tracking-tight text-white">
                Flag your highest-risk patterns
              </Text>
              <Text className="mt-2 text-sm leading-6 text-white/55">
                These priorities feed the alerting and intervention layer the coach dashboard watches first.
              </Text>
            </View>
          </View>

          <MultiChoiceGroup
            label="Critical risks"
            options={RISK_OPTIONS}
            values={form.criticalRisks}
            onToggle={(next) =>
              setForm((current) => ({
                ...current,
                criticalRisks: current.criticalRisks.includes(next)
                  ? current.criticalRisks.filter((item) => item !== next)
                  : [...current.criticalRisks, next],
              }))
            }
          />
        </NeonGlassCardNative>

        {error ? (
          <NeonGlassCardNative>
            <Text className="text-base font-bold text-[#FF8C5A]">Setup issue</Text>
            <Text className="mt-3 text-sm leading-6 text-white/65">{error}</Text>
          </NeonGlassCardNative>
        ) : null}

        <View className="mt-6">
          {submitting ? (
            <View className="items-center py-6">
              <ActivityIndicator color="#FF5F1F" />
              <Text className="mt-4 text-center text-sm leading-6 text-white/55">
                Creating your coach workspace...
              </Text>
            </View>
          ) : (
            <GlowingButtonNative
              title="Complete Setup"
              variant="chakra"
              icon={<CheckCircle2 color="#00E5FF" size={18} />}
              onPress={() => {
                void handleSubmit();
              }}
            />
          )}
        </View>

        <View className="mt-4 items-center">
          <Text className="text-center text-xs leading-5 text-white/35">
            Your first team, invite code, and coach locker code will be generated as part of setup.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
