import { useEffect, useRef, useState } from 'react';
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
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import {
  Activity,
  ArrowLeft,
  Brain,
  CheckCircle2,
  HeartPulse,
  ShieldCheck,
  Target,
  TriangleAlert,
  Zap,
} from 'lucide-react-native';

import { GlowingButtonNative } from '../src/components/neon/GlowingButtonNative';
import { NeonGlassCardNative } from '../src/components/neon/NeonGlassCardNative';
import AvatarCaptureCard from '../src/components/profile/AvatarCaptureCard';
import { useMobileAuth } from '../src/lib/auth';
import { mobileEnv } from '../src/lib/env';
import {
  clearAthleteOnboardingDraft,
  loadAthleteOnboardingDraft,
  saveAthleteOnboardingDraft,
} from '../src/lib/athlete-onboarding-draft';
import {
  submitAthleteOnboarding,
  type AthleteOnboardingInjuryEntry,
  type AthleteOnboardingPayload,
} from '../src/lib/mobile-api';

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

const BIOLOGICAL_SEX_OPTIONS = ['Male', 'Female', 'Other'] as const;
const DOMINANT_SIDE_OPTIONS = ['Left', 'Right', 'Both', 'Ambidextrous'] as const;
const PLAYING_LEVEL_OPTIONS = [
  'Recreational',
  'School',
  'District',
  'State',
  'National',
  'Professional',
] as const;
const TRAINING_FREQUENCY_OPTIONS = ['1-3 days', '4-6 days', 'Daily'] as const;
const INTENSITY_OPTIONS = ['Low', 'Moderate', 'High'] as const;
const PRIMARY_GOAL_OPTIONS = [
  'Performance Enhancement',
  'Injury Prevention',
  'Recovery Efficiency',
  'Return from Injury',
  'Competition Prep',
] as const;
const TYPICAL_SLEEP_OPTIONS = ['< 6 hours', '6-7 hours', '7-8 hours', '8-9 hours', '> 9 hours'] as const;
const TYPICAL_SORENESS_OPTIONS = ['None', 'Low', 'Moderate', 'High'] as const;
const TYPICAL_ENERGY_OPTIONS = ['Low', 'Moderate', 'High'] as const;
const YES_NO_OPTIONS = ['No', 'Yes'] as const;
const HEALTH_CONNECTION_OPTIONS = ['later', 'connect_now'] as const;
const MEDICAL_CONDITION_OPTIONS = [
  'Asthma',
  'Diabetes (Type 1)',
  'Diabetes (Type 2)',
  'Hypertension',
  'Cardiac Condition',
  'Autoimmune Disorder',
  'Other',
] as const;

const LEGAL_DOC_LINKS = [
  { label: 'Terms', path: '/terms' },
  { label: 'Privacy', path: '/privacy' },
  { label: 'Consent', path: '/consent' },
  { label: 'Disclaimer', path: '/disclaimer' },
  { label: 'AI Transparency', path: '/ai-transparency' },
] as const;

const PHYSIOLOGY_FIELDS = [
  {
    key: 'endurance_capacity',
    title: 'Endurance capacity',
    detail: 'How well you hold your level deep into a session.',
  },
  {
    key: 'strength_capacity',
    title: 'Strength capacity',
    detail: 'How solid and powerful you feel under resistance.',
  },
  {
    key: 'explosive_power',
    title: 'Explosive power',
    detail: 'How quickly you can generate speed and force.',
  },
  {
    key: 'agility_control',
    title: 'Agility control',
    detail: 'How cleanly you change direction at pace.',
  },
  {
    key: 'recovery_efficiency',
    title: 'Recovery efficiency',
    detail: 'How ready you feel after a hard session.',
  },
  {
    key: 'fatigue_resistance',
    title: 'Fatigue resistance',
    detail: 'How well you maintain quality as the workload grows.',
  },
  {
    key: 'load_tolerance',
    title: 'Load tolerance',
    detail: 'How much hard training your body handles in a normal week.',
  },
  {
    key: 'movement_robustness',
    title: 'Movement robustness',
    detail: 'How free and unrestricted your body feels in key patterns.',
  },
  {
    key: 'coordination_control',
    title: 'Coordination control',
    detail: 'How stable and precise you feel during complex movement.',
  },
] as const;

type FormState = {
  fullName: string;
  username: string;
  avatarUrl: string;
  primarySport: AthleteOnboardingPayload['primarySport'];
  position: string;
  coachLockerCode: string;
  inviteToken: string;
  age: string;
  heightCm: string;
  weightKg: string;
  typicalWeeklyHours: string;
  typicalRPE: string;
  usualWakeUpTime: string;
  reactionTimeMs: string;
  biologicalSex: AthleteOnboardingPayload['biologicalSex'];
  dominantSide: AthleteOnboardingPayload['dominantSide'];
  playingLevel: AthleteOnboardingPayload['playingLevel'];
  trainingFrequency: AthleteOnboardingPayload['trainingFrequency'];
  avgIntensity: AthleteOnboardingPayload['avgIntensity'];
  primaryGoal: AthleteOnboardingPayload['primaryGoal'];
  typicalSleep: AthleteOnboardingPayload['typicalSleep'];
  typicalSoreness: AthleteOnboardingPayload['typicalSoreness'];
  typicalEnergy: AthleteOnboardingPayload['typicalEnergy'];
  currentIssue: AthleteOnboardingPayload['currentIssue'];
  pastMajorInjury: AthleteOnboardingPayload['pastMajorInjury'];
  hasIllness: NonNullable<AthleteOnboardingPayload['hasIllness']>;
  activeInjuries: AthleteOnboardingInjuryEntry[];
  pastInjuries: AthleteOnboardingInjuryEntry[];
  illnesses: string[];
  endurance_capacity: number;
  strength_capacity: number;
  explosive_power: number;
  agility_control: number;
  recovery_efficiency: number;
  fatigue_resistance: number;
  load_tolerance: number;
  movement_robustness: number;
  coordination_control: number;
  healthConnectionPreference: NonNullable<AthleteOnboardingPayload['health_connection_preference']>;
  legalConsent: boolean;
  medicalDisclaimerConsent: boolean;
  dataProcessingConsent: boolean;
  aiAcknowledgementConsent: boolean;
  marketingConsent: boolean;
  minorGuardianConsent: boolean;
};

const initialFormState: FormState = {
  fullName: '',
  username: '',
  avatarUrl: '',
  primarySport: 'Cricket',
  position: '',
  coachLockerCode: '',
  inviteToken: '',
  age: '18',
  heightCm: '175',
  weightKg: '70',
  typicalWeeklyHours: '5',
  typicalRPE: '6',
  usualWakeUpTime: '06:30',
  reactionTimeMs: '',
  biologicalSex: 'Male',
  dominantSide: 'Right',
  playingLevel: 'State',
  trainingFrequency: '4-6 days',
  avgIntensity: 'Moderate',
  primaryGoal: 'Performance Enhancement',
  typicalSleep: '7-8 hours',
  typicalSoreness: 'Low',
  typicalEnergy: 'Moderate',
  currentIssue: 'No',
  pastMajorInjury: 'No',
  hasIllness: 'No',
  activeInjuries: [],
  pastInjuries: [],
  illnesses: [],
  endurance_capacity: 2,
  strength_capacity: 2,
  explosive_power: 2,
  agility_control: 2,
  recovery_efficiency: 2,
  fatigue_resistance: 2,
  load_tolerance: 2,
  movement_robustness: 2,
  coordination_control: 2,
  healthConnectionPreference: 'later',
  legalConsent: false,
  medicalDisclaimerConsent: false,
  dataProcessingConsent: false,
  aiAcknowledgementConsent: false,
  marketingConsent: false,
  minorGuardianConsent: false,
};

function createEmptyInjury(): AthleteOnboardingInjuryEntry {
  return {
    region: '',
    type: '',
    side: '',
    recurring: false,
  };
}

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
      <Text
        className={`text-xs font-bold uppercase tracking-[0.18em] ${
          active ? 'text-chakra-neon' : 'text-white/60'
        }`}
      >
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
            label={option === 'later' ? 'Connect later' : option === 'connect_now' ? 'Connect now' : option}
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

function ToggleRow({
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

function InjuryListEditor({
  title,
  injuries,
  onAdd,
  onRemove,
  onChange,
}: {
  title: string;
  injuries: AthleteOnboardingInjuryEntry[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  onChange: (
    index: number,
    field: keyof AthleteOnboardingInjuryEntry,
    value: string | boolean
  ) => void;
}) {
  return (
    <View className="mt-5">
      <View className="flex-row items-center justify-between gap-3">
        <Text className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">{title}</Text>
        <Pressable onPress={onAdd} className="rounded-full border border-white/10 px-3 py-2">
          <Text className="text-[10px] font-bold uppercase tracking-[0.18em] text-chakra-neon">Add injury</Text>
        </Pressable>
      </View>

      {injuries.length === 0 ? (
        <Text className="mt-3 text-sm leading-6 text-white/45">
          Add one or more entries if you want CREEDA to store current or previous injury context from mobile.
        </Text>
      ) : null}

      {injuries.map((injury, index) => (
        <View key={`${title}-${index}`} className="mt-4 rounded-3xl border border-white/5 bg-white/[0.03] p-4">
          <View className="flex-row items-center justify-between gap-3">
            <Text className="text-sm font-bold text-white">Injury {index + 1}</Text>
            <Pressable onPress={() => onRemove(index)}>
              <Text className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#FF8C5A]">
                Remove
              </Text>
            </Pressable>
          </View>

          <TextField
            label="Region"
            value={injury.region}
            onChange={(next) => onChange(index, 'region', next)}
            autoCapitalize="words"
            placeholder="e.g. Hamstring or Lower Back"
          />
          <TextField
            label="Type"
            value={injury.type}
            onChange={(next) => onChange(index, 'type', next)}
            autoCapitalize="words"
            placeholder="e.g. Muscle, Tendon, Ligament"
          />
          <TextField
            label="Side"
            value={injury.side}
            onChange={(next) => onChange(index, 'side', next)}
            autoCapitalize="words"
            placeholder="Left, Right, Both, or N/A"
          />

          <ToggleRow
            label="Recurring issue"
            description="Enable this if this injury has come back more than once."
            value={injury.recurring}
            onToggle={() => onChange(index, 'recurring', !injury.recurring)}
          />
        </View>
      ))}
    </View>
  );
}

function PhysiologyCard({
  title,
  detail,
  value,
  onChange,
}: {
  title: string;
  detail: string;
  value: number;
  onChange: (nextValue: number) => void;
}) {
  return (
    <View className="mt-4 rounded-3xl border border-white/5 bg-white/[0.03] p-4">
      <Text className="text-base font-bold text-white">{title}</Text>
      <Text className="mt-2 text-sm leading-6 text-white/55">{detail}</Text>
      <View className="mt-4 flex-row flex-wrap gap-3">
        {[1, 2, 3, 4].map((option) => (
          <ChoicePill
            key={`${title}-${option}`}
            label={String(option)}
            active={value === option}
            onPress={() => onChange(option)}
          />
        ))}
      </View>
    </View>
  );
}

export default function AthleteOnboardingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ coach?: string | string[]; invite?: string | string[] }>();
  const { session, user, refreshUser } = useMobileAuth();
  const [form, setForm] = useState<FormState>(initialFormState);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [reactionState, setReactionState] = useState<
    'idle' | 'waiting' | 'ready' | 'result' | 'complete' | 'fail'
  >('idle');
  const [reactionTrials, setReactionTrials] = useState<number[]>([]);
  const [reactionScore, setReactionScore] = useState<number | null>(null);

  const coachLockerCodeFromParams = typeof params.coach === 'string' ? params.coach : undefined;
  const inviteTokenFromParams = typeof params.invite === 'string' ? params.invite : undefined;
  const coachLockerCodeFromMetadata =
    typeof session?.user.user_metadata?.coach_locker_code === 'string'
      ? session.user.user_metadata.coach_locker_code
      : undefined;
  const inviteTokenFromMetadata =
    typeof session?.user.user_metadata?.invite_token === 'string'
      ? session.user.user_metadata.invite_token
      : undefined;
  const reactionDelayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reactionResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reactionSignalAtRef = useRef<number | null>(null);

  function applySeedContext(base: FormState): FormState {
    return {
      ...base,
      fullName: base.fullName || user?.profile.fullName || '',
      username: base.username || user?.profile.username || '',
      primarySport:
        user?.profile.primarySport &&
        SPORTS_OPTIONS.includes(user.profile.primarySport as (typeof SPORTS_OPTIONS)[number]) &&
        base.primarySport === initialFormState.primarySport
          ? (user.profile.primarySport as FormState['primarySport'])
          : base.primarySport,
      avatarUrl: base.avatarUrl || user?.profile.avatarUrl || '',
      position: base.position || user?.profile.position || '',
      coachLockerCode:
        base.coachLockerCode ||
        coachLockerCodeFromParams ||
        coachLockerCodeFromMetadata ||
        '',
      inviteToken:
        base.inviteToken ||
        inviteTokenFromParams ||
        inviteTokenFromMetadata ||
        '',
    };
  }

  useEffect(() => {
    let cancelled = false;

    async function hydrateDraft() {
      if (!user || user.profile.role !== 'athlete') {
        if (!cancelled) {
          setDraftReady(true);
        }
        return;
      }

      const draft = await loadAthleteOnboardingDraft<FormState>(user.id);
      if (cancelled) return;

      const nextForm = applySeedContext(draft ? { ...initialFormState, ...draft } : initialFormState);
      setForm(nextForm);
      setDraftRestored(Boolean(draft));
      setDraftReady(true);
    }

    void hydrateDraft();

    return () => {
      cancelled = true;
    };
  }, [
    user,
    coachLockerCodeFromParams,
    inviteTokenFromParams,
    coachLockerCodeFromMetadata,
    inviteTokenFromMetadata,
  ]);

  useEffect(() => {
    if (!draftReady || !user || user.profile.role !== 'athlete' || completed) return;

    void saveAthleteOnboardingDraft(user.id, form);
  }, [draftReady, user, completed, form]);

  useEffect(() => {
    return () => {
      if (reactionDelayTimerRef.current) {
        clearTimeout(reactionDelayTimerRef.current);
      }
      if (reactionResetTimerRef.current) {
        clearTimeout(reactionResetTimerRef.current);
      }
    };
  }, []);

  if (!session) {
    return <Redirect href="/login" />;
  }

  if (!user) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-8">
        <ActivityIndicator color="#FF5F1F" size="large" />
        <Text className="mt-4 text-center text-sm font-semibold tracking-wide text-white/70">
          Loading your athlete profile...
        </Text>
      </View>
    );
  }

  if (user.profile.role !== 'athlete') {
    return (
      <View className="flex-1 items-center justify-center bg-background px-8">
        <Text className="text-center text-xl font-black tracking-tight text-white">
          Athlete intake is currently athlete-only
        </Text>
        <Text className="mt-4 text-center text-sm leading-6 text-white/55">
          This flow builds your diagnostic baseline and first CREEDA readiness model.
        </Text>
      </View>
    );
  }

  if (user.profile.onboardingCompleted && !completed) {
    return <Redirect href="/(tabs)" />;
  }

  if (!draftReady) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-8">
        <ActivityIndicator color="#FF5F1F" size="large" />
        <Text className="mt-4 text-center text-sm font-semibold tracking-wide text-white/70">
          Restoring your athlete intake...
        </Text>
      </View>
    );
  }

  const userId = user.id;
  const isMinor = Number(form.age) < 18;

  function updateInjuryList(
    key: 'activeInjuries' | 'pastInjuries',
    updater: (current: AthleteOnboardingInjuryEntry[]) => AthleteOnboardingInjuryEntry[]
  ) {
    setForm((current) => ({
      ...current,
      [key]: updater(current[key]),
    }));
  }

  function toggleIllness(option: string) {
    setForm((current) => ({
      ...current,
      illnesses: current.illnesses.includes(option)
        ? current.illnesses.filter((value) => value !== option)
        : [...current.illnesses, option],
    }));
  }

  function openLegalDoc(path: string) {
    void Linking.openURL(`${mobileEnv.apiBaseUrl}${path}`).catch(() => {
      setError('Could not open the requested legal page on this device.');
    });
  }

  function clearReactionTimers() {
    if (reactionDelayTimerRef.current) {
      clearTimeout(reactionDelayTimerRef.current);
      reactionDelayTimerRef.current = null;
    }
    if (reactionResetTimerRef.current) {
      clearTimeout(reactionResetTimerRef.current);
      reactionResetTimerRef.current = null;
    }
  }

  function resetReactionTest() {
    clearReactionTimers();
    reactionSignalAtRef.current = null;
    setReactionTrials([]);
    setReactionScore(null);
    setReactionState('idle');
    setForm((current) => ({ ...current, reactionTimeMs: '' }));
  }

  function scheduleReactionReset(nextState: 'idle' | 'complete') {
    if (reactionResetTimerRef.current) {
      clearTimeout(reactionResetTimerRef.current);
    }

    reactionResetTimerRef.current = setTimeout(() => {
      setReactionState(nextState);
    }, 1500);
  }

  function startReactionTest() {
    clearReactionTimers();
    setReactionScore(null);
    setReactionState('waiting');
    reactionSignalAtRef.current = null;

    const delay = Math.floor(Math.random() * 3000) + 2000;
    reactionDelayTimerRef.current = setTimeout(() => {
      setReactionState('ready');
      reactionSignalAtRef.current = Date.now();
    }, delay);
  }

  function handleReactionPress() {
    if (reactionState === 'idle' || reactionState === 'complete') {
      startReactionTest();
      return;
    }

    if (reactionState === 'waiting') {
      clearReactionTimers();
      reactionSignalAtRef.current = null;
      setReactionScore(null);
      setReactionState('fail');
      scheduleReactionReset('idle');
      return;
    }

    if (reactionState === 'ready' && reactionSignalAtRef.current !== null) {
      const trialTime = Math.round(Date.now() - reactionSignalAtRef.current);
      const nextTrials = [...reactionTrials, trialTime];

      clearReactionTimers();
      setReactionTrials(nextTrials);
      setReactionScore(trialTime);
      setReactionState('result');

      if (nextTrials.length >= 3) {
        const avg = Math.round(nextTrials.reduce((total, value) => total + value, 0) / nextTrials.length);
        setForm((current) => ({ ...current, reactionTimeMs: String(avg) }));
        scheduleReactionReset('complete');
      } else {
        scheduleReactionReset('idle');
      }
    }
  }

  async function handleResetDraft() {
    await clearAthleteOnboardingDraft(userId);
    setForm(applySeedContext(initialFormState));
    setDraftRestored(false);
    setError(null);
  }

  async function handleSubmit() {
    const accessToken = session?.access_token;
    if (!accessToken) {
      setError('Your session expired. Sign in again to continue onboarding.');
      return;
    }

    if (!user) {
      setError('Your athlete profile is still loading. Please try again in a moment.');
      return;
    }

    if (isMinor && !form.minorGuardianConsent) {
      setError('Guardian or coach consent is required for athletes under 18.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const normalizedActiveInjuries = form.activeInjuries
        .map((injury) => ({
          region: injury.region.trim(),
          type: injury.type.trim(),
          side: injury.side.trim(),
          recurring: injury.recurring,
        }))
        .filter((injury) => injury.region || injury.type || injury.side);

      const normalizedPastInjuries = form.pastInjuries
        .map((injury) => ({
          region: injury.region.trim(),
          type: injury.type.trim(),
          side: injury.side.trim(),
          recurring: injury.recurring,
        }))
        .filter((injury) => injury.region || injury.type || injury.side);

      if (
        normalizedActiveInjuries.some(
          (injury) => !injury.region || !injury.type || !injury.side
        ) ||
        normalizedPastInjuries.some((injury) => !injury.region || !injury.type || !injury.side)
      ) {
        setError('Please complete or remove every injury entry before continuing.');
        setSubmitting(false);
        return;
      }

      const payload: AthleteOnboardingPayload = {
        fullName: form.fullName.trim(),
        username: form.username.trim().toLowerCase(),
        primarySport: form.primarySport,
        position: form.position.trim(),
        coachLockerCode: form.coachLockerCode.trim() || undefined,
        inviteToken: form.inviteToken.trim() || undefined,
        heightCm: Number(form.heightCm),
        weightKg: Number(form.weightKg),
        avatar_url: form.avatarUrl.trim() || null,
        minorGuardianConsent: isMinor ? form.minorGuardianConsent : false,
        typicalWeeklyHours: Number(form.typicalWeeklyHours),
        typicalRPE: Number(form.typicalRPE),
        age: Number(form.age),
        biologicalSex: form.biologicalSex,
        dominantSide: form.dominantSide,
        playingLevel: form.playingLevel,
        seasonPhase: 'In-season',
        trainingFrequency: form.trainingFrequency,
        avgIntensity: form.avgIntensity,
        typicalSleep: form.typicalSleep,
        usualWakeUpTime: form.usualWakeUpTime.trim(),
        typicalSoreness: form.typicalSoreness,
        typicalEnergy: form.typicalEnergy,
        currentIssue: form.currentIssue,
        activeInjuries: form.currentIssue === 'Yes' ? normalizedActiveInjuries : [],
        pastMajorInjury: form.pastMajorInjury,
        pastInjuries: form.pastMajorInjury === 'Yes' ? normalizedPastInjuries : [],
        hasIllness: form.hasIllness,
        illnesses: form.hasIllness === 'Yes' ? form.illnesses : [],
        endurance_capacity: form.endurance_capacity,
        strength_capacity: form.strength_capacity,
        explosive_power: form.explosive_power,
        agility_control: form.agility_control,
        reaction_self_perception: 2,
        recovery_efficiency: form.recovery_efficiency,
        fatigue_resistance: form.fatigue_resistance,
        load_tolerance: form.load_tolerance,
        movement_robustness: form.movement_robustness,
        coordination_control: form.coordination_control,
        reaction_time_ms: form.reactionTimeMs.trim() ? Number(form.reactionTimeMs) : undefined,
        primaryGoal: form.primaryGoal,
        health_connection_preference: form.healthConnectionPreference,
        legalConsent: form.legalConsent,
        medicalDisclaimerConsent: form.medicalDisclaimerConsent,
        dataProcessingConsent: form.dataProcessingConsent,
        aiAcknowledgementConsent: form.aiAcknowledgementConsent,
        marketingConsent: form.marketingConsent,
      };

      await submitAthleteOnboarding(accessToken, payload);
      await clearAthleteOnboardingDraft(userId);
      setDraftRestored(false);
      setCompleted(true);
      await refreshUser();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Failed to complete your athlete onboarding.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (completed) {
    return (
      <View className="flex-1 bg-background px-6 pt-16">
        <View className="flex-1 items-center justify-center">
          <View className="rounded-full border border-[#00E5FF]/20 bg-[#00E5FF]/10 p-6">
            <CheckCircle2 color="#00E5FF" size={36} />
          </View>
          <Text className="mt-6 text-[10px] font-bold uppercase tracking-[0.28em] text-white/35">
            Athlete Setup Complete
          </Text>
          <Text className="mt-3 text-4xl font-black tracking-tight text-white">
            Your baseline is live
          </Text>
          <Text className="mt-4 text-center text-sm leading-6 text-white/65">
            CREEDA has enough context to generate your first readiness and guidance state.
          </Text>

          <View className="mt-8 w-full">
            <GlowingButtonNative
              title="Open Athlete Dashboard"
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
          <View className="flex-row items-start justify-between gap-4">
            <View className="flex-1">
              <Text className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/35">
                Athlete Onboarding
              </Text>
              <Text className="mt-3 text-4xl font-black tracking-tight text-white">
                Build your mobile baseline
              </Text>
              <Text className="mt-3 text-sm leading-6 text-white/55">
                This native intake writes the same diagnostic profile and V5 readiness baseline as the web athlete onboarding.
              </Text>
            </View>

            <Pressable onPress={() => void handleResetDraft()} className="rounded-full border border-white/10 px-4 py-3">
              <Text className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/60">
                Reset Draft
              </Text>
            </Pressable>
          </View>

          {draftRestored ? (
            <Text className="mt-4 text-sm leading-6 text-chakra-neon">
              Your last incomplete athlete intake was restored on this device.
            </Text>
          ) : null}
        </View>

        {error ? (
          <NeonGlassCardNative>
            <View className="flex-row items-start gap-3">
              <View className="mt-1 rounded-2xl border border-white/5 bg-white/[0.04] p-2">
                <TriangleAlert color="#FF8C5A" size={18} />
              </View>
              <View className="flex-1">
                <Text className="text-lg font-bold text-white">Submission blocked</Text>
                <Text className="mt-3 text-sm leading-6 text-white/55">{error}</Text>
              </View>
            </View>
          </NeonGlassCardNative>
        ) : null}

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
                Anchor your athlete profile
              </Text>
              <Text className="mt-2 text-sm leading-6 text-white/55">
                These details feed the baseline profile CREEDA uses for readiness and injury-risk modeling.
              </Text>
            </View>
          </View>

          <AvatarCaptureCard
            userId={userId}
            currentUrl={form.avatarUrl}
            title="Athlete Avatar"
            description="Capture a clear athlete portrait so your mobile profile and squad view feel fully personal from day one."
            onUploaded={(avatarUrl: string) => {
              setForm((current) => ({ ...current, avatarUrl }));
            }}
            onRemoved={() => {
              setForm((current) => ({ ...current, avatarUrl: '' }));
            }}
          />

          <TextField
            label="Full name"
            value={form.fullName}
            onChange={(next) => setForm((current) => ({ ...current, fullName: next }))}
            autoCapitalize="words"
            placeholder="e.g. Aarav Singh"
          />
          <TextField
            label="Username"
            value={form.username}
            onChange={(next) => setForm((current) => ({ ...current, username: next }))}
            autoCapitalize="none"
            placeholder="aarav_sprint"
          />
          <TextField
            label="Primary position"
            value={form.position}
            onChange={(next) => setForm((current) => ({ ...current, position: next }))}
            autoCapitalize="words"
            placeholder="e.g. Striker or Opening Bowler"
          />
          <TextField
            label="Coach locker code (optional)"
            value={form.coachLockerCode}
            onChange={(next) => setForm((current) => ({ ...current, coachLockerCode: next }))}
            autoCapitalize="characters"
            placeholder="Optional coach code"
          />
          <TextField
            label="Team invite code (optional)"
            value={form.inviteToken}
            onChange={(next) => setForm((current) => ({ ...current, inviteToken: next }))}
            autoCapitalize="characters"
            placeholder="Optional squad invite"
          />
          <Text className="mt-4 text-sm leading-6 text-white/45">
            Use either a coach locker code or a team invite code if you were invited into a squad. Both fields are optional.
          </Text>

          <SingleChoiceGroup
            label="Primary sport"
            options={SPORTS_OPTIONS}
            value={form.primarySport}
            onChange={(next) =>
              setForm((current) => ({
                ...current,
                primarySport: next as FormState['primarySport'],
              }))
            }
          />
          <SingleChoiceGroup
            label="Biological sex"
            options={BIOLOGICAL_SEX_OPTIONS}
            value={form.biologicalSex}
            onChange={(next) =>
              setForm((current) => ({
                ...current,
                biologicalSex: next as FormState['biologicalSex'],
              }))
            }
          />
          <SingleChoiceGroup
            label="Dominant side"
            options={DOMINANT_SIDE_OPTIONS}
            value={form.dominantSide}
            onChange={(next) =>
              setForm((current) => ({
                ...current,
                dominantSide: next as FormState['dominantSide'],
              }))
            }
          />

          <TextField
            label="Age"
            value={form.age}
            onChange={(next) => setForm((current) => ({ ...current, age: next }))}
            keyboardType="number-pad"
            placeholder="18"
          />
          <TextField
            label="Height (cm)"
            value={form.heightCm}
            onChange={(next) => setForm((current) => ({ ...current, heightCm: next }))}
            keyboardType="number-pad"
            placeholder="175"
          />
          <TextField
            label="Weight (kg)"
            value={form.weightKg}
            onChange={(next) => setForm((current) => ({ ...current, weightKg: next }))}
            keyboardType="number-pad"
            placeholder="70"
          />
        </NeonGlassCardNative>

        <NeonGlassCardNative watermark="TR">
          <View className="mb-4 flex-row items-start gap-3">
            <View className="mt-1 rounded-2xl border border-white/5 bg-white/[0.04] p-2">
              <Target color="#FF5F1F" size={18} />
            </View>
            <View className="flex-1">
              <Text className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">
                Training Reality
              </Text>
              <Text className="mt-2 text-xl font-black tracking-tight text-white">
                Describe your real workload
              </Text>
              <Text className="mt-2 text-sm leading-6 text-white/55">
                These inputs help CREEDA estimate your baseline exposure and the level you compete at.
              </Text>
            </View>
          </View>

          <SingleChoiceGroup
            label="Playing level"
            options={PLAYING_LEVEL_OPTIONS}
            value={form.playingLevel}
            onChange={(next) =>
              setForm((current) => ({
                ...current,
                playingLevel: next as FormState['playingLevel'],
              }))
            }
          />
          <SingleChoiceGroup
            label="Training frequency"
            options={TRAINING_FREQUENCY_OPTIONS}
            value={form.trainingFrequency}
            onChange={(next) =>
              setForm((current) => ({
                ...current,
                trainingFrequency: next as FormState['trainingFrequency'],
              }))
            }
          />
          <SingleChoiceGroup
            label="Average intensity"
            options={INTENSITY_OPTIONS}
            value={form.avgIntensity}
            onChange={(next) =>
              setForm((current) => ({
                ...current,
                avgIntensity: next as FormState['avgIntensity'],
              }))
            }
          />
          <TextField
            label="Typical weekly hours"
            value={form.typicalWeeklyHours}
            onChange={(next) => setForm((current) => ({ ...current, typicalWeeklyHours: next }))}
            keyboardType="number-pad"
            placeholder="5"
          />
          <TextField
            label="Typical session RPE"
            value={form.typicalRPE}
            onChange={(next) => setForm((current) => ({ ...current, typicalRPE: next }))}
            keyboardType="number-pad"
            placeholder="6"
          />
          <SingleChoiceGroup
            label="Primary goal"
            options={PRIMARY_GOAL_OPTIONS}
            value={form.primaryGoal}
            onChange={(next) =>
              setForm((current) => ({
                ...current,
                primaryGoal: next as FormState['primaryGoal'],
              }))
            }
          />
        </NeonGlassCardNative>

        <NeonGlassCardNative watermark="RC">
          <View className="mb-4 flex-row items-start gap-3">
            <View className="mt-1 rounded-2xl border border-white/5 bg-white/[0.04] p-2">
              <HeartPulse color="#FF5F1F" size={18} />
            </View>
            <View className="flex-1">
              <Text className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">
                Recovery Context
              </Text>
              <Text className="mt-2 text-xl font-black tracking-tight text-white">
                Capture your normal state
              </Text>
              <Text className="mt-2 text-sm leading-6 text-white/55">
                CREEDA uses this as the first healthy baseline before daily logging starts adjusting the model.
              </Text>
            </View>
          </View>

          <SingleChoiceGroup
            label="Typical sleep"
            options={TYPICAL_SLEEP_OPTIONS}
            value={form.typicalSleep}
            onChange={(next) =>
              setForm((current) => ({
                ...current,
                typicalSleep: next as FormState['typicalSleep'],
              }))
            }
          />
          <TextField
            label="Usual wake-up time"
            value={form.usualWakeUpTime}
            onChange={(next) => setForm((current) => ({ ...current, usualWakeUpTime: next }))}
            placeholder="06:30"
          />
          <SingleChoiceGroup
            label="Typical soreness"
            options={TYPICAL_SORENESS_OPTIONS}
            value={form.typicalSoreness}
            onChange={(next) =>
              setForm((current) => ({
                ...current,
                typicalSoreness: next as FormState['typicalSoreness'],
              }))
            }
          />
          <SingleChoiceGroup
            label="Typical energy"
            options={TYPICAL_ENERGY_OPTIONS}
            value={form.typicalEnergy}
            onChange={(next) =>
              setForm((current) => ({
                ...current,
                typicalEnergy: next as FormState['typicalEnergy'],
              }))
            }
          />
          <View className="mt-5 rounded-3xl border border-white/5 bg-white/[0.03] p-4">
            <Text className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">
              Reaction test (optional)
            </Text>
            <Text className="mt-3 text-sm leading-6 text-white/55">
              Complete three successful taps for a quick baseline instead of typing a number manually.
            </Text>
            <Text className="mt-4 text-sm font-bold text-white">
              Average reflex speed:{' '}
              <Text className="text-chakra-neon">
                {form.reactionTimeMs ? `${form.reactionTimeMs} ms` : 'Not recorded yet'}
              </Text>
            </Text>

            <Pressable
              onPress={handleReactionPress}
              className={`mt-5 h-56 items-center justify-center rounded-full border-2 px-6 ${
                reactionState === 'idle'
                  ? 'border-white/10 bg-white/[0.03]'
                  : reactionState === 'waiting'
                    ? 'border-[#FFB648]/60 bg-[#FFB648]/10'
                    : reactionState === 'ready'
                      ? 'border-white bg-[#FF5F1F]'
                      : reactionState === 'result'
                        ? 'border-white bg-emerald-500'
                        : reactionState === 'fail'
                          ? 'border-red-500 bg-red-500/10'
                          : 'border-emerald-500/40 bg-emerald-500/10'
              }`}
            >
              {reactionState === 'idle' ? (
                <>
                  <Zap color="#FF5F1F" size={36} />
                  <Text className="mt-4 text-[10px] font-bold uppercase tracking-[0.22em] text-white/60">
                    {reactionTrials.length === 0
                      ? 'Tap To Start Trial 1'
                      : `Tap To Start Trial ${reactionTrials.length + 1}`}
                  </Text>
                </>
              ) : null}
              {reactionState === 'waiting' ? (
                <Text className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#FFB648]">
                  Wait for signal...
                </Text>
              ) : null}
              {reactionState === 'ready' ? (
                <Text className="text-3xl font-black tracking-tight text-white">TAP NOW</Text>
              ) : null}
              {reactionState === 'result' && reactionScore !== null ? (
                <Text className="text-4xl font-black tracking-tight text-white">{reactionScore} ms</Text>
              ) : null}
              {reactionState === 'fail' ? (
                <Text className="text-[10px] font-bold uppercase tracking-[0.22em] text-red-400">
                  Too early. Wait for the signal.
                </Text>
              ) : null}
              {reactionState === 'complete' ? (
                <>
                  <CheckCircle2 color="#34D399" size={40} />
                  <Text className="mt-4 text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-300">
                    Baseline captured
                  </Text>
                </>
              ) : null}
            </Pressable>

            <View className="mt-5 flex-row items-center justify-center gap-3">
              {[0, 1, 2].map((index) => (
                <View key={`trial-${index}`} className="items-center">
                  <View
                    className={`h-2 w-14 rounded-full ${
                      reactionTrials[index] ? 'bg-[#00E5FF]' : 'bg-white/10'
                    }`}
                  />
                  <Text className="mt-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">
                    {reactionTrials[index] ? `${reactionTrials[index]} ms` : `Trial ${index + 1}`}
                  </Text>
                </View>
              ))}
            </View>

            <View className="mt-5">
              <GlowingButtonNative
                title="Reset Reaction Test"
                variant="chakra"
                onPress={resetReactionTest}
              />
            </View>
          </View>
          <SingleChoiceGroup
            label="Health sync preference"
            options={HEALTH_CONNECTION_OPTIONS}
            value={form.healthConnectionPreference}
            onChange={(next) =>
              setForm((current) => ({
                ...current,
                healthConnectionPreference: next as FormState['healthConnectionPreference'],
              }))
            }
          />
        </NeonGlassCardNative>

        <NeonGlassCardNative watermark="MS">
          <View className="mb-4 flex-row items-start gap-3">
            <View className="mt-1 rounded-2xl border border-white/5 bg-white/[0.04] p-2">
              <Activity color="#FF5F1F" size={18} />
            </View>
            <View className="flex-1">
              <Text className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">
                Medical Snapshot
              </Text>
              <Text className="mt-2 text-xl font-black tracking-tight text-white">
                Flag current constraints early
              </Text>
              <Text className="mt-2 text-sm leading-6 text-white/55">
                You can keep this high-level now and expand the detail later in the athlete workspace.
              </Text>
            </View>
          </View>

          <SingleChoiceGroup
            label="Current issue"
            options={YES_NO_OPTIONS}
            value={form.currentIssue}
            onChange={(next) =>
              setForm((current) => ({
                ...current,
                currentIssue: next as FormState['currentIssue'],
                activeInjuries: next === 'Yes' ? current.activeInjuries : [],
              }))
            }
          />

          {form.currentIssue === 'Yes' ? (
            <InjuryListEditor
              title="Active injuries"
              injuries={form.activeInjuries}
              onAdd={() =>
                updateInjuryList('activeInjuries', (current) => [...current, createEmptyInjury()])
              }
              onRemove={(index) =>
                updateInjuryList('activeInjuries', (current) =>
                  current.filter((_, currentIndex) => currentIndex !== index)
                )
              }
              onChange={(index, field, value) =>
                updateInjuryList('activeInjuries', (current) =>
                  current.map((entry, currentIndex) =>
                    currentIndex === index ? { ...entry, [field]: value } : entry
                  )
                )
              }
            />
          ) : null}

          <SingleChoiceGroup
            label="Past major injury"
            options={YES_NO_OPTIONS}
            value={form.pastMajorInjury}
            onChange={(next) =>
              setForm((current) => ({
                ...current,
                pastMajorInjury: next as FormState['pastMajorInjury'],
                pastInjuries: next === 'Yes' ? current.pastInjuries : [],
              }))
            }
          />

          {form.pastMajorInjury === 'Yes' ? (
            <InjuryListEditor
              title="Past injuries"
              injuries={form.pastInjuries}
              onAdd={() =>
                updateInjuryList('pastInjuries', (current) => [...current, createEmptyInjury()])
              }
              onRemove={(index) =>
                updateInjuryList('pastInjuries', (current) =>
                  current.filter((_, currentIndex) => currentIndex !== index)
                )
              }
              onChange={(index, field, value) =>
                updateInjuryList('pastInjuries', (current) =>
                  current.map((entry, currentIndex) =>
                    currentIndex === index ? { ...entry, [field]: value } : entry
                  )
                )
              }
            />
          ) : null}

          <SingleChoiceGroup
            label="Existing illness or condition"
            options={YES_NO_OPTIONS}
            value={form.hasIllness}
            onChange={(next) =>
              setForm((current) => ({
                ...current,
                hasIllness: next as FormState['hasIllness'],
                illnesses: next === 'Yes' ? current.illnesses : [],
              }))
            }
          />

          {form.hasIllness === 'Yes' ? (
            <MultiChoiceGroup
              label="Medical conditions"
              options={MEDICAL_CONDITION_OPTIONS}
              values={form.illnesses}
              onToggle={toggleIllness}
            />
          ) : null}
        </NeonGlassCardNative>

        <NeonGlassCardNative watermark="PH">
          <View className="mb-4 flex-row items-start gap-3">
            <View className="mt-1 rounded-2xl border border-white/5 bg-white/[0.04] p-2">
              <Brain color="#FF5F1F" size={18} />
            </View>
            <View className="flex-1">
              <Text className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">
                Physiology Snapshot
              </Text>
              <Text className="mt-2 text-xl font-black tracking-tight text-white">
                Rate where your body sits today
              </Text>
              <Text className="mt-2 text-sm leading-6 text-white/55">
                Use 1 for the lowest match and 4 for the strongest match with your current reality.
              </Text>
            </View>
          </View>

          {PHYSIOLOGY_FIELDS.map((field) => (
            <PhysiologyCard
              key={field.key}
              title={field.title}
              detail={field.detail}
              value={form[field.key]}
              onChange={(nextValue) =>
                setForm((current) => ({
                  ...current,
                  [field.key]: nextValue,
                }))
              }
            />
          ))}
        </NeonGlassCardNative>

        <NeonGlassCardNative watermark="LG">
          <View className="mb-4 flex-row items-start gap-3">
            <View className="mt-1 rounded-2xl border border-white/5 bg-white/[0.04] p-2">
              <ShieldCheck color="#FF5F1F" size={18} />
            </View>
            <View className="flex-1">
              <Text className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">
                Legal Acknowledgements
              </Text>
              <Text className="mt-2 text-xl font-black tracking-tight text-white">
                Confirm the decision-support guardrails
              </Text>
              <Text className="mt-2 text-sm leading-6 text-white/55">
                These acknowledgements mirror the web onboarding and are required before the athlete profile can go live.
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
            </View>
          </View>

          <ToggleRow
            label="Terms and privacy consent"
            description="I consent to CREEDA processing my account and profile information to provide the platform."
            value={form.legalConsent}
            onToggle={() => setForm((current) => ({ ...current, legalConsent: !current.legalConsent }))}
          />
          <ToggleRow
            label="Medical disclaimer acknowledgement"
            description="I understand CREEDA supports decisions but does not replace medical diagnosis or urgent care."
            value={form.medicalDisclaimerConsent}
            onToggle={() =>
              setForm((current) => ({
                ...current,
                medicalDisclaimerConsent: !current.medicalDisclaimerConsent,
              }))
            }
          />
          <ToggleRow
            label="Data processing consent"
            description="I consent to CREEDA processing training, wellness, and readiness inputs for performance guidance."
            value={form.dataProcessingConsent}
            onToggle={() =>
              setForm((current) => ({
                ...current,
                dataProcessingConsent: !current.dataProcessingConsent,
              }))
            }
          />
          <ToggleRow
            label="AI decision-support acknowledgement"
            description="I understand the platform uses AI-assisted decision support and that final training choices stay with me and my support team."
            value={form.aiAcknowledgementConsent}
            onToggle={() =>
              setForm((current) => ({
                ...current,
                aiAcknowledgementConsent: !current.aiAcknowledgementConsent,
              }))
            }
          />
          <ToggleRow
            label="Marketing updates (optional)"
            description="I want to receive product updates and performance education from CREEDA."
            value={form.marketingConsent}
            onToggle={() =>
              setForm((current) => ({
                ...current,
                marketingConsent: !current.marketingConsent,
              }))
            }
          />

          {isMinor ? (
            <ToggleRow
              label="Guardian or coach consent"
              description="A parent, guardian, or supervising coach has approved this athlete profile setup."
              value={form.minorGuardianConsent}
              onToggle={() =>
                setForm((current) => ({
                  ...current,
                  minorGuardianConsent: !current.minorGuardianConsent,
                }))
              }
            />
          ) : null}
        </NeonGlassCardNative>

        <View className="mt-8">
          <GlowingButtonNative
            title={submitting ? 'Building baseline...' : 'Finish Athlete Intake'}
            variant="saffron"
            icon={submitting ? undefined : <CheckCircle2 color="#FFFFFF" size={18} />}
            onPress={() => {
              void handleSubmit();
            }}
          />
          {submitting ? (
            <View className="mt-4 flex-row items-center justify-center gap-3">
              <ActivityIndicator color="#00E5FF" size="small" />
              <Text className="text-sm font-semibold text-white/60">
                Saving diagnostics, legal consent, and readiness baseline...
              </Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
