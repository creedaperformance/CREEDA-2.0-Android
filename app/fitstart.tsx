import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
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
  Activity,
  ArrowLeft,
  CheckCircle2,
  Flame,
  Heart,
  Moon,
  ShieldCheck,
  Target,
  Trophy,
  Zap,
} from 'lucide-react-native';

import { GlowingButtonNative } from '../src/components/neon/GlowingButtonNative';
import { NeonGlassCardNative } from '../src/components/neon/NeonGlassCardNative';
import { ReadinessOrbNative } from '../src/components/neon/ReadinessOrbNative';
import { useMobileAuth } from '../src/lib/auth';
import {
  clearFitStartDraft,
  loadFitStartDraft,
  saveFitStartDraft,
} from '../src/lib/fitstart-draft';
import {
  fetchFitStartRecommendations,
  submitFitStart,
  type FitStartRecommendation,
  type FitStartRecommendationInput,
  type FitStartSavePayload,
  type FitStartSaveResponse,
} from '../src/lib/mobile-api';

const OCCUPATION_OPTIONS = [
  {
    id: 'desk',
    label: 'Desk / laptop work',
    description: 'Mostly seated, screen-based, or office-style work.',
  },
  {
    id: 'student',
    label: 'Student routine',
    description: 'Classes, study, campus walking, and variable energy days.',
  },
  {
    id: 'shift',
    label: 'Shift work',
    description: 'Rotating hours, late nights, or sleep-disrupting work.',
  },
  {
    id: 'manual',
    label: 'Physical work',
    description: 'Lifting, carrying, field work, delivery, or manual labor.',
  },
  {
    id: 'caregiver',
    label: 'Home / caregiving',
    description: 'Looking after home, family, or caregiving responsibilities.',
  },
  {
    id: 'hybrid',
    label: 'Mixed / on your feet',
    description: 'Teaching, retail, sales, field work, or changing day patterns.',
  },
] as const;

const SCHEDULE_OPTIONS = [
  { id: 'early_morning', label: 'Early morning' },
  { id: 'after_work', label: 'After work' },
  { id: 'late_evening', label: 'Late evening' },
  { id: 'weekends_only', label: 'Mostly weekends' },
  { id: 'shift_work', label: 'Shift work' },
] as const;

const EQUIPMENT_OPTIONS = [
  { id: 'bodyweight', label: 'Bodyweight' },
  { id: 'home_dumbbells', label: 'Home weights' },
  { id: 'gym', label: 'Gym access' },
  { id: 'cardio_machine', label: 'Cardio machine' },
  { id: 'pool', label: 'Pool access' },
] as const;

const GENDER_OPTIONS = ['Female', 'Male', 'Non-binary', 'Prefer not to say'] as const;

const NUTRITION_OPTIONS = [
  { id: 'poor', label: 'Needs work' },
  { id: 'basic', label: 'Okay' },
  { id: 'good', label: 'Good' },
  { id: 'structured', label: 'Very structured' },
] as const;

const ACTIVITY_LEVEL_OPTIONS = [
  { id: 'sedentary', label: 'Mostly seated' },
  { id: 'moderate', label: 'Some movement' },
  { id: 'active', label: 'Active most days' },
] as const;

const INJURY_OPTIONS = [
  { id: 'none', label: 'None' },
  { id: 'minor', label: 'Minor' },
  { id: 'moderate', label: 'Moderate' },
  { id: 'major', label: 'Major' },
  { id: 'chronic', label: 'Chronic' },
] as const;

const MOBILITY_OPTIONS = [
  { id: 'none', label: 'None' },
  { id: 'mild', label: 'Mild' },
  { id: 'moderate', label: 'Moderate' },
  { id: 'severe', label: 'Severe' },
] as const;

const EXPERIENCE_OPTIONS = [
  { id: 'beginner', label: 'Brand new' },
  { id: 'novice', label: 'A little experience' },
  { id: 'intermediate', label: 'Some consistency' },
  { id: 'advanced', label: 'Very consistent' },
  { id: 'experienced', label: 'Long-term experience' },
] as const;

const GOAL_OPTIONS = [
  { id: 'fat_loss', label: 'Fat loss', icon: Activity },
  { id: 'muscle_gain', label: 'Muscle gain', icon: Flame },
  { id: 'endurance', label: 'Endurance', icon: Zap },
  { id: 'general_fitness', label: 'General fitness', icon: Target },
  { id: 'sport_specific', label: 'Get into a sport', icon: Trophy },
] as const;

const TIME_HORIZONS = [
  { id: '4_weeks', label: '4 weeks' },
  { id: '8_weeks', label: '8 weeks' },
  { id: '12_weeks', label: '12 weeks' },
  { id: 'long_term', label: 'Long term' },
] as const;

const INTENSITY_OPTIONS = [
  { id: 'low', label: 'Low' },
  { id: 'moderate', label: 'Moderate' },
  { id: 'high', label: 'High' },
] as const;

const RECOVERY_SIGNAL_OPTIONS = [
  { key: 'sleepQuality', label: 'Sleep quality', description: 'How well you usually sleep.' },
  { key: 'energyLevels', label: 'Daily energy', description: 'How switched on you usually feel.' },
  { key: 'stressLevels', label: 'Stress load', description: 'How heavy life feels most weeks.' },
  { key: 'recoveryRate', label: 'Bounce-back speed', description: 'How quickly your body feels normal again.' },
] as const;

const PHYSIOLOGY_DOMAINS = [
  { id: 'endurance_capacity', label: 'Endurance', description: 'How long you can keep moving before you need a real break.' },
  { id: 'strength_capacity', label: 'Strength', description: 'How strong lifting, carrying, pushing, and pulling feel in real life.' },
  { id: 'explosive_power', label: 'Power', description: 'How quickly you can move when you need to react fast.' },
  { id: 'agility_control', label: 'Balance and control', description: 'How steady and coordinated you feel when you move quickly.' },
  { id: 'reaction_self_perception', label: 'Reaction speed', description: 'How quickly you notice something and respond.' },
  { id: 'recovery_efficiency', label: 'Recovery efficiency', description: 'How well your body resets after a hard day.' },
  { id: 'fatigue_resistance', label: 'Holding up when tired', description: 'How well you still function when the day runs long.' },
  { id: 'load_tolerance', label: 'Weekly load', description: 'How much activity your body can handle in a normal week.' },
  { id: 'movement_robustness', label: 'Movement quality', description: 'How comfortable and free your joints feel when you move.' },
  { id: 'coordination_control', label: 'Coordination', description: 'How naturally different body parts work together.' },
] as const;

const RECOMMENDATION_TYPE_LABELS: Record<FitStartRecommendation['type'], string> = {
  sport: 'Sport entry',
  training: 'Strength track',
  lifestyle: 'Lifestyle track',
};

type FitStartDraftState = {
  basic: {
    age: number;
    gender: string;
    heightCm: number;
    weightKg: number;
    occupation: string;
    activityLevel: FitStartRecommendationInput['basic']['activityLevel'] | '';
  };
  physiology: {
    sleepQuality: number;
    energyLevels: number;
    stressLevels: number;
    recoveryRate: number;
    injuryHistory: FitStartRecommendationInput['physiology']['injuryHistory'] | '';
    mobilityLimitations: FitStartRecommendationInput['physiology']['mobilityLimitations'] | '';
    trainingExperience: FitStartRecommendationInput['physiology']['trainingExperience'] | '';
    endurance_capacity: number;
    strength_capacity: number;
    explosive_power: number;
    agility_control: number;
    reaction_self_perception: number;
    recovery_efficiency: number;
    fatigue_resistance: number;
    load_tolerance: number;
    movement_robustness: number;
    coordination_control: number;
  };
  lifestyle: {
    scheduleConstraints: string[];
    equipmentAccess: string[];
    nutritionHabits: FitStartRecommendationInput['lifestyle']['nutritionHabits'] | '';
    sedentaryHours: number;
  };
  goals: {
    primaryGoal: FitStartRecommendationInput['goals']['primaryGoal'] | '';
    timeHorizon: FitStartRecommendationInput['goals']['timeHorizon'] | '';
    intensityPreference: FitStartRecommendationInput['goals']['intensityPreference'] | '';
  };
};

const defaultState: FitStartDraftState = {
  basic: {
    age: 0,
    gender: '',
    heightCm: 0,
    weightKg: 0,
    occupation: '',
    activityLevel: '',
  },
  physiology: {
    sleepQuality: 0,
    energyLevels: 0,
    stressLevels: 0,
    recoveryRate: 0,
    injuryHistory: '',
    mobilityLimitations: '',
    trainingExperience: '',
    endurance_capacity: 0,
    strength_capacity: 0,
    explosive_power: 0,
    agility_control: 0,
    reaction_self_perception: 0,
    recovery_efficiency: 0,
    fatigue_resistance: 0,
    load_tolerance: 0,
    movement_robustness: 0,
    coordination_control: 0,
  },
  lifestyle: {
    scheduleConstraints: [],
    equipmentAccess: [],
    nutritionHabits: '',
    sedentaryHours: -1,
  },
  goals: {
    primaryGoal: '',
    timeHorizon: '',
    intensityPreference: '',
  },
};

type PersistedFitStartDraft = {
  state: FitStartDraftState;
  recommendations: FitStartRecommendation[];
  selectedRecommendationId: string | null;
  healthPreference: 'connect_now' | 'later';
  savedAt: string;
};

function mergeDraftState(partial?: Partial<FitStartDraftState>): FitStartDraftState {
  return {
    basic: {
      ...defaultState.basic,
      ...(partial?.basic || {}),
    },
    physiology: {
      ...defaultState.physiology,
      ...(partial?.physiology || {}),
    },
    lifestyle: {
      ...defaultState.lifestyle,
      ...(partial?.lifestyle || {}),
    },
    goals: {
      ...defaultState.goals,
      ...(partial?.goals || {}),
    },
  };
}

function toggleArrayValue(items: string[], value: string) {
  return items.includes(value) ? items.filter((item) => item !== value) : [...items, value];
}

function formatNumber(value: number) {
  if (value <= 0) return '';
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(1).replace(/\.0$/, '');
}

function SectionHeader({
  eyebrow,
  title,
  detail,
  icon,
}: {
  eyebrow: string;
  title: string;
  detail: string;
  icon: ReactNode;
}) {
  return (
    <View className="mb-4 flex-row items-start gap-3">
      <View className="mt-1 rounded-2xl border border-white/5 bg-white/[0.04] p-2">
        {icon}
      </View>
      <View className="flex-1">
        <Text className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">{eyebrow}</Text>
        <Text className="mt-2 text-xl font-black tracking-tight text-white">{title}</Text>
        <Text className="mt-2 text-sm leading-6 text-white/55">{detail}</Text>
      </View>
    </View>
  );
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
  options: ReadonlyArray<{ id: string; label: string }>;
  value: string;
  onChange: (nextValue: string) => void;
}) {
  return (
    <View className="mt-5">
      <Text className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">{label}</Text>
      <View className="mt-3 flex-row flex-wrap gap-3">
        {options.map((option) => (
          <ChoicePill
            key={`${label}-${option.id}`}
            label={option.label}
            active={value === option.id}
            onPress={() => onChange(option.id)}
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
  options: ReadonlyArray<{ id: string; label: string }>;
  values: string[];
  onToggle: (nextValue: string) => void;
}) {
  return (
    <View className="mt-5">
      <Text className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">{label}</Text>
      <View className="mt-3 flex-row flex-wrap gap-3">
        {options.map((option) => (
          <ChoicePill
            key={`${label}-${option.id}`}
            label={option.label}
            active={values.includes(option.id)}
            onPress={() => onToggle(option.id)}
          />
        ))}
      </View>
    </View>
  );
}

function NumberField({
  label,
  value,
  onChange,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (nextValue: number) => void;
  suffix?: string;
}) {
  return (
    <View className="mt-5">
      <Text className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">{label}</Text>
      <View className="mt-3 flex-row items-center rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-1">
        <TextInput
          keyboardType="decimal-pad"
          onChangeText={(text) => onChange(Number.parseFloat(text || '0') || 0)}
          value={formatNumber(value)}
          className="flex-1 py-3 text-base text-white"
          placeholderTextColor="rgba(255,255,255,0.28)"
        />
        {suffix ? <Text className="text-sm text-white/40">{suffix}</Text> : null}
      </View>
    </View>
  );
}

function ScaleCard({
  title,
  detail,
  value,
  scale,
  onChange,
}: {
  title: string;
  detail: string;
  value: number;
  scale: number;
  onChange: (nextValue: number) => void;
}) {
  return (
    <View className="mt-5 rounded-3xl border border-white/5 bg-white/[0.03] p-5">
      <Text className="text-base font-black tracking-tight text-white">{title}</Text>
      <Text className="mt-2 text-sm leading-6 text-white/55">{detail}</Text>
      <View className="mt-4 flex-row flex-wrap gap-3">
        {Array.from({ length: scale }, (_, index) => index + 1).map((option) => {
          const active = value === option;

          return (
            <Pressable
              key={`${title}-${option}`}
              onPress={() => onChange(option)}
              className={`h-12 w-12 items-center justify-center rounded-2xl border ${
                active ? 'border-[#00E5FF]/50 bg-[#00E5FF]/10' : 'border-white/5 bg-black/10'
              }`}
            >
              <Text className={`text-sm font-bold ${active ? 'text-chakra-neon' : 'text-white/60'}`}>
                {option}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function RecommendationCard({
  recommendation,
  active,
  onPress,
}: {
  recommendation: FitStartRecommendation;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`mt-4 rounded-3xl border p-5 ${
        active ? 'border-[#00E5FF]/50 bg-[#00E5FF]/10' : 'border-white/5 bg-white/[0.03]'
      }`}
    >
      <View className="flex-row items-center justify-between gap-4">
        <View className="flex-1">
          <Text className="text-lg font-black tracking-tight text-white">{recommendation.title}</Text>
          <Text className="mt-2 text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">
            {RECOMMENDATION_TYPE_LABELS[recommendation.type]} • Match {recommendation.score}
          </Text>
        </View>
        <View className={`rounded-full px-3 py-2 ${active ? 'bg-[#00E5FF]/20' : 'bg-white/[0.05]'}`}>
          <Text className={`text-[10px] font-bold uppercase tracking-[0.2em] ${active ? 'text-chakra-neon' : 'text-white/50'}`}>
            {active ? 'Selected' : 'Pick'}
          </Text>
        </View>
      </View>
      <Text className="mt-4 text-sm leading-6 text-white/70">{recommendation.summary}</Text>
      <Text className="mt-4 text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">
        Why CREEDA suggested this
      </Text>
      <View className="mt-3 gap-2">
        {recommendation.why.map((reason) => (
          <Text key={`${recommendation.id}-${reason}`} className="text-sm leading-6 text-white/60">
            {reason}
          </Text>
        ))}
      </View>
    </Pressable>
  );
}

function toRecommendationInput(state: FitStartDraftState): FitStartRecommendationInput | null {
  if (
    !state.basic.gender ||
    !state.basic.occupation ||
    !state.basic.activityLevel ||
    !state.physiology.injuryHistory ||
    !state.physiology.mobilityLimitations ||
    !state.physiology.trainingExperience ||
    !state.lifestyle.nutritionHabits ||
    !state.goals.primaryGoal ||
    !state.goals.timeHorizon ||
    !state.goals.intensityPreference
  ) {
    return null;
  }

  return {
    basic: {
      age: state.basic.age,
      gender: state.basic.gender,
      heightCm: state.basic.heightCm,
      weightKg: state.basic.weightKg,
      occupation: state.basic.occupation,
      activityLevel: state.basic.activityLevel,
    },
    physiology: {
      sleepQuality: state.physiology.sleepQuality,
      energyLevels: state.physiology.energyLevels,
      stressLevels: state.physiology.stressLevels,
      recoveryRate: state.physiology.recoveryRate,
      injuryHistory: state.physiology.injuryHistory,
      mobilityLimitations: state.physiology.mobilityLimitations,
      trainingExperience: state.physiology.trainingExperience,
      endurance_capacity: state.physiology.endurance_capacity,
      strength_capacity: state.physiology.strength_capacity,
      explosive_power: state.physiology.explosive_power,
      agility_control: state.physiology.agility_control,
      reaction_self_perception: state.physiology.reaction_self_perception,
      recovery_efficiency: state.physiology.recovery_efficiency,
      fatigue_resistance: state.physiology.fatigue_resistance,
      load_tolerance: state.physiology.load_tolerance,
      movement_robustness: state.physiology.movement_robustness,
      coordination_control: state.physiology.coordination_control,
    },
    lifestyle: {
      scheduleConstraints: state.lifestyle.scheduleConstraints,
      equipmentAccess: state.lifestyle.equipmentAccess,
      nutritionHabits: state.lifestyle.nutritionHabits,
      sedentaryHours: state.lifestyle.sedentaryHours,
    },
    goals: {
      primaryGoal: state.goals.primaryGoal,
      timeHorizon: state.goals.timeHorizon,
      intensityPreference: state.goals.intensityPreference,
    },
  };
}

export default function FitStartScreen() {
  const router = useRouter();
  const { session, user, refreshUser } = useMobileAuth();
  const [startedAt] = useState(() => Date.now());
  const [state, setState] = useState<FitStartDraftState>(defaultState);
  const [healthPreference, setHealthPreference] = useState<'connect_now' | 'later'>('later');
  const [recommendations, setRecommendations] = useState<FitStartRecommendation[]>([]);
  const [selectedRecommendationId, setSelectedRecommendationId] = useState<string | null>(null);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FitStartSaveResponse | null>(null);
  const [draftHydrated, setDraftHydrated] = useState(false);
  const [restoredDraft, setRestoredDraft] = useState(false);

  function updateDraft(updater: (current: FitStartDraftState) => FitStartDraftState) {
    setState((current) => updater(current));
    if (recommendations.length) {
      setRecommendations([]);
      setSelectedRecommendationId(null);
    }
    setError(null);
  }

  useEffect(() => {
    let cancelled = false;

    async function hydrateDraft() {
      if (!user) {
        return;
      }

      if (user.profile.role !== 'individual' || user.profile.onboardingCompleted) {
        if (!cancelled) {
          setDraftHydrated(true);
        }
        return;
      }

      try {
        const stored = await loadFitStartDraft<PersistedFitStartDraft>(user.id);
        if (!stored || cancelled) {
          if (!cancelled) {
            setDraftHydrated(true);
          }
          return;
        }

        setState(mergeDraftState(stored.state));
        setRecommendations(Array.isArray(stored.recommendations) ? stored.recommendations : []);
        setSelectedRecommendationId(
          stored.selectedRecommendationId || stored.recommendations?.[0]?.id || null
        );
        setHealthPreference(stored.healthPreference === 'connect_now' ? 'connect_now' : 'later');
        setRestoredDraft(true);
      } finally {
        if (!cancelled) {
          setDraftHydrated(true);
        }
      }
    }

    void hydrateDraft();

    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.profile.onboardingCompleted, user?.profile.role]);

  useEffect(() => {
    if (
      !user ||
      !draftHydrated ||
      user.profile.role !== 'individual' ||
      user.profile.onboardingCompleted ||
      result
    ) {
      return;
    }

    const timeoutId = setTimeout(() => {
      void saveFitStartDraft<PersistedFitStartDraft>(user.id, {
        state,
        recommendations,
        selectedRecommendationId,
        healthPreference,
        savedAt: new Date().toISOString(),
      });
    }, 150);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [
    draftHydrated,
    healthPreference,
    recommendations,
    result,
    selectedRecommendationId,
    state,
    user?.id,
    user?.profile.onboardingCompleted,
    user?.profile.role,
  ]);

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

  if (user.profile.role !== 'individual') {
    return (
      <View className="flex-1 items-center justify-center bg-background px-8">
        <Text className="text-center text-xl font-black tracking-tight text-white">
          FitStart mobile onboarding is currently individual-only
        </Text>
        <Text className="mt-4 text-center text-sm leading-6 text-white/55">
          Athlete and coach onboarding still run through their dedicated CREEDA journeys.
        </Text>
      </View>
    );
  }

  if (user.profile.onboardingCompleted && !result) {
    return <Redirect href="/(tabs)" />;
  }

  if (!draftHydrated) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-8">
        <ActivityIndicator color="#FF5F1F" size="large" />
        <Text className="mt-4 text-center text-sm font-semibold tracking-wide text-white/70">
          Restoring your FitStart draft...
        </Text>
      </View>
    );
  }

  async function handleRecommendationPreview() {
    const accessToken = session?.access_token;
    if (!accessToken) {
      setError('Your session expired. Sign in again to continue FitStart.');
      return;
    }

    const payload = toRecommendationInput(state);
    if (!payload) {
      setError('Finish the key FitStart inputs first so CREEDA can rank the right starting paths.');
      return;
    }

    setLoadingRecommendations(true);
    setError(null);

    try {
      const response = await fetchFitStartRecommendations(accessToken, payload);
      setRecommendations(response.recommendations);
      setSelectedRecommendationId(response.recommendations[0]?.id || null);
    } catch (previewError) {
      setError(
        previewError instanceof Error
          ? previewError.message
          : 'Failed to compute your FitStart pathways.'
      );
    } finally {
      setLoadingRecommendations(false);
    }
  }

  async function handleSubmit() {
    const accessToken = session?.access_token;
    const currentUserId = user?.id;
    if (!accessToken) {
      setError('Your session expired. Sign in again to complete FitStart.');
      return;
    }
    if (!currentUserId) {
      setError('Your CREEDA profile is still loading. Try again in a moment.');
      return;
    }

    const basePayload = toRecommendationInput(state);
    const selectedRecommendation =
      recommendations.find((recommendation) => recommendation.id === selectedRecommendationId) || null;

    if (!basePayload || !selectedRecommendation) {
      setError('Preview your best paths and choose one before starting your journey.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload: FitStartSavePayload = {
        ...basePayload,
        sport: {
          selectedSport: selectedRecommendation.mappedSport,
          selectedPathwayId: selectedRecommendation.id,
          selectedPathwayType: selectedRecommendation.type,
          selectedRecommendationTitle: selectedRecommendation.title,
          selectionRationale: selectedRecommendation.summary,
        },
        health_connection_preference: healthPreference,
        timeTakenMs: Date.now() - startedAt,
      };

      const response = await submitFitStart(accessToken, payload);
      await clearFitStartDraft(currentUserId);
      setResult(response);
      await refreshUser();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Failed to save your FitStart profile.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <View className="flex-1 bg-background px-6 pt-16">
        <View className="flex-1 items-center justify-center">
          <ReadinessOrbNative score={result.summary.readinessScore} />
          <Text className="mt-6 text-[10px] font-bold uppercase tracking-[0.28em] text-white/35">
            FitStart Complete
          </Text>
          <Text className="mt-3 text-4xl font-black tracking-tight text-white">
            Your journey is ready
          </Text>
          <Text className="mt-4 text-center text-sm leading-6 text-white/65">
            Primary gap: {result.summary.primaryGap}
          </Text>
          <Text className="mt-2 text-center text-sm leading-6 text-white/45">
            Projected peak date: {result.summary.projectedPeakDate}
          </Text>

          <View className="mt-8 w-full gap-4">
            <GlowingButtonNative
              title="Open Dashboard"
              variant="chakra"
              icon={<CheckCircle2 color="#00E5FF" size={18} />}
              onPress={() => router.replace('/(tabs)')}
            />
            {healthPreference === 'connect_now' ? (
              <GlowingButtonNative
                title="Open Health Setup"
                variant="saffron"
                onPress={() => router.replace('/(tabs)/health')}
              />
            ) : null}
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
            FitStart Mobile
          </Text>
          <Text className="mt-3 text-4xl font-black tracking-tight text-white">
            Build your CREEDA baseline
          </Text>
          <Text className="mt-3 text-sm leading-6 text-white/55">
            This native flow writes the same individual FitStart profile, recommendations, and starting plan as the web onboarding.
          </Text>
          <Text className="mt-3 text-sm leading-6 text-white/40">
            Progress auto-saves on this device while you work through the baseline.
          </Text>
          {restoredDraft ? (
            <View className="mt-4 flex-row items-center justify-between gap-4 rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-4">
              <Text className="flex-1 text-sm leading-6 text-white/60">
                Your previous FitStart draft was restored.
              </Text>
              <Pressable
                onPress={() => {
                  setState(defaultState);
                  setRecommendations([]);
                  setSelectedRecommendationId(null);
                  setHealthPreference('later');
                  setRestoredDraft(false);
                  void clearFitStartDraft(user.id);
                }}
              >
                <Text className="text-[10px] font-bold uppercase tracking-[0.22em] text-chakra-neon">
                  Reset Draft
                </Text>
              </Pressable>
            </View>
          ) : null}
        </View>

        <NeonGlassCardNative watermark="01">
          <SectionHeader
            eyebrow="Basics"
            title="Start with your day and body"
            detail="These basics help CREEDA understand body size, work pattern, and the real lifestyle load around your training."
            icon={<Target color="#FF5F1F" size={18} />}
          />

          <NumberField
            label="Age"
            value={state.basic.age}
            onChange={(next) =>
              updateDraft((current) => ({
                ...current,
                basic: { ...current.basic, age: next },
              }))
            }
          />
          <NumberField
            label="Height"
            value={state.basic.heightCm}
            onChange={(next) =>
              updateDraft((current) => ({
                ...current,
                basic: { ...current.basic, heightCm: next },
              }))
            }
            suffix="cm"
          />
          <NumberField
            label="Weight"
            value={state.basic.weightKg}
            onChange={(next) =>
              updateDraft((current) => ({
                ...current,
                basic: { ...current.basic, weightKg: next },
              }))
            }
            suffix="kg"
          />
          <SingleChoiceGroup
            label="Gender"
            options={GENDER_OPTIONS.map((option) => ({ id: option, label: option }))}
            value={state.basic.gender}
            onChange={(next) =>
              updateDraft((current) => ({
                ...current,
                basic: { ...current.basic, gender: next },
              }))
            }
          />

          <View className="mt-5">
            <Text className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">
              What best describes your normal day?
            </Text>
            <View className="mt-3 gap-3">
              {OCCUPATION_OPTIONS.map((option) => {
                const active = state.basic.occupation === option.id;

                return (
                  <Pressable
                    key={option.id}
                    onPress={() =>
                      updateDraft((current) => ({
                        ...current,
                        basic: { ...current.basic, occupation: option.id },
                      }))
                    }
                    className={`rounded-3xl border p-4 ${
                      active ? 'border-[#00E5FF]/50 bg-[#00E5FF]/10' : 'border-white/5 bg-white/[0.03]'
                    }`}
                  >
                    <Text className={`text-sm font-black tracking-tight ${active ? 'text-chakra-neon' : 'text-white'}`}>
                      {option.label}
                    </Text>
                    <Text className={`mt-2 text-sm leading-6 ${active ? 'text-white/70' : 'text-white/50'}`}>
                      {option.description}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </NeonGlassCardNative>

        <NeonGlassCardNative watermark="02">
          <SectionHeader
            eyebrow="Lifestyle"
            title="Map your normal routine"
            detail="Your schedule, sitting time, and food structure help CREEDA build a plan you can actually follow."
            icon={<ShieldCheck color="#FF5F1F" size={18} />}
          />
          <SingleChoiceGroup
            label="How active are your normal days?"
            options={ACTIVITY_LEVEL_OPTIONS}
            value={state.basic.activityLevel}
            onChange={(next) =>
              updateDraft((current) => ({
                ...current,
                basic: {
                  ...current.basic,
                  activityLevel: next as FitStartDraftState['basic']['activityLevel'],
                },
              }))
            }
          />
          <MultiChoiceGroup
            label="When do you realistically have time?"
            options={SCHEDULE_OPTIONS}
            values={state.lifestyle.scheduleConstraints}
            onToggle={(next) =>
              updateDraft((current) => ({
                ...current,
                lifestyle: {
                  ...current.lifestyle,
                  scheduleConstraints: toggleArrayValue(current.lifestyle.scheduleConstraints, next),
                },
              }))
            }
          />
          <NumberField
            label="Sitting hours per day"
            value={state.lifestyle.sedentaryHours}
            onChange={(next) =>
              updateDraft((current) => ({
                ...current,
                lifestyle: { ...current.lifestyle, sedentaryHours: next },
              }))
            }
            suffix="hrs"
          />
          <SingleChoiceGroup
            label="How organised is your eating?"
            options={NUTRITION_OPTIONS}
            value={state.lifestyle.nutritionHabits}
            onChange={(next) =>
              updateDraft((current) => ({
                ...current,
                lifestyle: {
                  ...current.lifestyle,
                  nutritionHabits: next as FitStartDraftState['lifestyle']['nutritionHabits'],
                },
              }))
            }
          />
        </NeonGlassCardNative>

        <NeonGlassCardNative watermark="03">
          <SectionHeader
            eyebrow="Baseline"
            title="Understand your usual baseline"
            detail="This tells CREEDA how your body normally feels before daily logs and health sync start shaping the plan."
            icon={<Moon color="#FF5F1F" size={18} />}
          />
          {RECOVERY_SIGNAL_OPTIONS.map((signal) => (
            <ScaleCard
              key={signal.key}
              title={signal.label}
              detail={signal.description}
              value={state.physiology[signal.key]}
              scale={5}
              onChange={(next) =>
                updateDraft((current) => ({
                  ...current,
                  physiology: {
                    ...current.physiology,
                    [signal.key]: next,
                  },
                }))
              }
            />
          ))}
        </NeonGlassCardNative>

        <NeonGlassCardNative watermark="04">
          <SectionHeader
            eyebrow="Movement History"
            title="Capture your training history"
            detail="Past injuries, mobility limits, and experience set safer progression speed and the right first pathway."
            icon={<Heart color="#FF5F1F" size={18} />}
          />
          <SingleChoiceGroup
            label="Injury history"
            options={INJURY_OPTIONS}
            value={state.physiology.injuryHistory}
            onChange={(next) =>
              updateDraft((current) => ({
                ...current,
                physiology: {
                  ...current.physiology,
                  injuryHistory: next as FitStartDraftState['physiology']['injuryHistory'],
                },
              }))
            }
          />
          <SingleChoiceGroup
            label="Mobility limitations"
            options={MOBILITY_OPTIONS}
            value={state.physiology.mobilityLimitations}
            onChange={(next) =>
              updateDraft((current) => ({
                ...current,
                physiology: {
                  ...current.physiology,
                  mobilityLimitations: next as FitStartDraftState['physiology']['mobilityLimitations'],
                },
              }))
            }
          />
          <SingleChoiceGroup
            label="Training experience"
            options={EXPERIENCE_OPTIONS}
            value={state.physiology.trainingExperience}
            onChange={(next) =>
              updateDraft((current) => ({
                ...current,
                physiology: {
                  ...current.physiology,
                  trainingExperience: next as FitStartDraftState['physiology']['trainingExperience'],
                },
              }))
            }
          />
        </NeonGlassCardNative>

        <NeonGlassCardNative watermark="05">
          <SectionHeader
            eyebrow="Capacity"
            title="Rate your current body capacity"
            detail="This practical self-check helps CREEDA estimate current endurance, strength, movement quality, and recovery capacity."
            icon={<Zap color="#FF5F1F" size={18} />}
          />
          {PHYSIOLOGY_DOMAINS.map((domain) => (
            <ScaleCard
              key={domain.id}
              title={domain.label}
              detail={domain.description}
              value={state.physiology[domain.id]}
              scale={4}
              onChange={(next) =>
                updateDraft((current) => ({
                  ...current,
                  physiology: {
                    ...current.physiology,
                    [domain.id]: next,
                  },
                }))
              }
            />
          ))}
        </NeonGlassCardNative>

        <NeonGlassCardNative watermark="06">
          <SectionHeader
            eyebrow="Outcome"
            title="Set the result you want"
            detail="Your goal, time frame, and equipment access shape the best starting path for your current life and physiology."
            icon={<Trophy color="#FF5F1F" size={18} />}
          />
          <SingleChoiceGroup
            label="Primary goal"
            options={GOAL_OPTIONS.map((option) => ({ id: option.id, label: option.label }))}
            value={state.goals.primaryGoal}
            onChange={(next) =>
              updateDraft((current) => ({
                ...current,
                goals: {
                  ...current.goals,
                  primaryGoal: next as FitStartDraftState['goals']['primaryGoal'],
                },
              }))
            }
          />
          <SingleChoiceGroup
            label="Time horizon"
            options={TIME_HORIZONS}
            value={state.goals.timeHorizon}
            onChange={(next) =>
              updateDraft((current) => ({
                ...current,
                goals: {
                  ...current.goals,
                  timeHorizon: next as FitStartDraftState['goals']['timeHorizon'],
                },
              }))
            }
          />
          <SingleChoiceGroup
            label="Intensity preference"
            options={INTENSITY_OPTIONS}
            value={state.goals.intensityPreference}
            onChange={(next) =>
              updateDraft((current) => ({
                ...current,
                goals: {
                  ...current.goals,
                  intensityPreference: next as FitStartDraftState['goals']['intensityPreference'],
                },
              }))
            }
          />
          <MultiChoiceGroup
            label="Equipment access"
            options={EQUIPMENT_OPTIONS}
            values={state.lifestyle.equipmentAccess}
            onToggle={(next) =>
              updateDraft((current) => ({
                ...current,
                lifestyle: {
                  ...current.lifestyle,
                  equipmentAccess: toggleArrayValue(current.lifestyle.equipmentAccess, next),
                },
              }))
            }
          />
        </NeonGlassCardNative>

        <NeonGlassCardNative watermark="07">
          <SectionHeader
            eyebrow="Best Paths"
            title="See your strongest starting paths"
            detail="CREEDA ranks the routes that best match your current physiology, goal, routine, and equipment access."
            icon={<Target color="#FF5F1F" size={18} />}
          />

          <View className="mt-2">
            {loadingRecommendations ? (
              <View className="items-center py-8">
                <ActivityIndicator color="#FF5F1F" />
                <Text className="mt-4 text-center text-sm leading-6 text-white/55">
                  Ranking your FitStart pathways...
                </Text>
              </View>
            ) : (
              <GlowingButtonNative
                title="See Best Paths"
                variant="chakra"
                onPress={() => {
                  void handleRecommendationPreview();
                }}
              />
            )}
          </View>

          {recommendations.length ? (
            <View className="mt-5">
              {recommendations.map((recommendation) => (
                <RecommendationCard
                  key={recommendation.id}
                  recommendation={recommendation}
                  active={selectedRecommendationId === recommendation.id}
                  onPress={() => {
                    setSelectedRecommendationId(recommendation.id);
                    setError(null);
                  }}
                />
              ))}

              <View className="mt-6 rounded-3xl border border-white/5 bg-white/[0.03] p-5">
                <Text className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">
                  Optional device sync
                </Text>
                <Text className="mt-3 text-sm leading-6 text-white/55">
                  Apple Health and Health Connect are optional. If you skip this now, CREEDA will still work from FitStart and daily check-ins.
                </Text>
                <View className="mt-4 flex-row flex-wrap gap-3">
                  <ChoicePill
                    label="Connect later"
                    active={healthPreference === 'later'}
                    onPress={() => setHealthPreference('later')}
                  />
                  <ChoicePill
                    label="I want device sync"
                    active={healthPreference === 'connect_now'}
                    onPress={() => setHealthPreference('connect_now')}
                  />
                </View>
              </View>
            </View>
          ) : null}
        </NeonGlassCardNative>

        {error ? (
          <NeonGlassCardNative>
            <Text className="text-base font-bold text-[#FF8C5A]">FitStart issue</Text>
            <Text className="mt-3 text-sm leading-6 text-white/65">{error}</Text>
          </NeonGlassCardNative>
        ) : null}

        {recommendations.length ? (
          <View className="mt-6">
            {submitting ? (
              <View className="items-center py-6">
                <ActivityIndicator color="#FF5F1F" />
                <Text className="mt-4 text-center text-sm leading-6 text-white/55">
                  Building your individual CREEDA journey...
                </Text>
              </View>
            ) : (
              <GlowingButtonNative
                title="Start My Journey"
                variant="saffron"
                onPress={() => {
                  void handleSubmit();
                }}
              />
            )}
          </View>
        ) : null}

        <View className="mt-4 items-center">
          <Text className="text-center text-xs leading-5 text-white/35">
            FitStart powers the same individual engine used by your dashboard, daily logs, and weekly progression.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
