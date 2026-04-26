import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Leaf,
  Moon,
  Mountain,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react-native';

import {
  OnboardingV2Phase2SubmissionSchema,
  type NutritionProfile,
  type OnboardingV2Phase2Day,
  type OnboardingV2Phase2Submission,
} from '../packages/schemas/src';
import { GlowingButtonNative } from '../src/components/neon/GlowingButtonNative';
import { NeonGlassCardNative } from '../src/components/neon/NeonGlassCardNative';
import { useMobileAuth } from '../src/lib/auth';
import {
  markOnboardingV2SubmissionFailed,
  markOnboardingV2SubmissionSynced,
  queueOnboardingV2Phase2,
} from '../src/lib/onboarding-v2/offline-store';
import {
  scheduleOnboardingV2DailyRitualReminder,
  scheduleOnboardingV2Phase2Reminders,
  scheduleOnboardingV2RetestReminders,
} from '../src/lib/onboarding-v2/reminders';
import {
  submitOnboardingV2Phase2,
  type OnboardingV2Phase2Response,
} from '../src/lib/mobile-api';

const DAYS: Array<{
  id: OnboardingV2Phase2Day;
  label: string;
  title: string;
  detail: string;
  icon: typeof Activity;
}> = [
  {
    id: 'day1_aerobic',
    label: 'Day 1',
    title: 'Aerobic',
    detail: 'Resting HR, run, walk, or stairs.',
    icon: Activity,
  },
  {
    id: 'day2_strength_power',
    label: 'Day 2',
    title: 'Strength',
    detail: '1RM, jump, pushups, or plank.',
    icon: ShieldCheck,
  },
  {
    id: 'day3_movement_quality',
    label: 'Day 3',
    title: 'Movement',
    detail: 'FMS-style score or camera baseline.',
    icon: RotateCcw,
  },
  {
    id: 'day4_anaerobic_recovery',
    label: 'Day 4',
    title: 'Recovery',
    detail: 'Sprint, repeat sprint, HR recovery, or HRV.',
    icon: Activity,
  },
  {
    id: 'day5_nutrition',
    label: 'Day 5',
    title: 'Nutrition',
    detail: 'Protein, hydration, and RED-S risk inputs.',
    icon: Leaf,
  },
  {
    id: 'day6_psych_sleep',
    label: 'Day 6',
    title: 'Stress and sleep',
    detail: 'APSQ-10 0-4 responses and sleep.',
    icon: Moon,
  },
  {
    id: 'day7_environment',
    label: 'Day 7',
    title: 'Environment',
    detail: 'City, heat, AQI, altitude, commute.',
    icon: Mountain,
  },
];

function nextDay(day: OnboardingV2Phase2Day) {
  const index = DAYS.findIndex((item) => item.id === day);
  return DAYS[Math.min(index + 1, DAYS.length - 1)]?.id ?? day;
}

function valueFor(values: Record<string, string>, key: string) {
  return values[key] ?? '';
}

function numberFor(values: Record<string, string>, key: string) {
  const raw = valueFor(values, key).trim();
  if (!raw) return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

function textFor(values: Record<string, string>, key: string) {
  const value = valueFor(values, key).trim();
  return value || undefined;
}

function listFor(values: Record<string, string>, key: string) {
  return valueFor(values, key)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function Input({
  label,
  value,
  onChangeText,
  keyboardType = 'default',
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: 'default' | 'numeric' | 'decimal-pad';
  placeholder?: string;
}) {
  return (
    <View className="gap-2">
      <Text className="text-[10px] font-black uppercase tracking-[0.22em] text-white/35">
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholder={placeholder}
        placeholderTextColor="rgba(255,255,255,0.28)"
        className="min-h-12 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white"
      />
    </View>
  );
}

function Choice({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`min-h-11 rounded-2xl border px-4 py-3 ${
        active ? 'border-[#6EE7B7]/60 bg-[#6EE7B7]/15' : 'border-white/10 bg-white/[0.03]'
      }`}
    >
      <Text className={`text-sm font-black ${active ? 'text-[#D1FAE5]' : 'text-white/62'}`}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function OnboardingPhase2Screen() {
  const router = useRouter();
  const { session, user, loading, refreshUser } = useMobileAuth();
  const role = user?.profile.role;
  const persona = role === 'athlete' || role === 'individual' ? role : 'individual';
  const [activeDay, setActiveDay] = useState<OnboardingV2Phase2Day>('day1_aerobic');
  const [completedDays, setCompletedDays] = useState<OnboardingV2Phase2Day[]>([]);
  const [calibrationPct, setCalibrationPct] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OnboardingV2Phase2Response | null>(null);
  const [startedAt] = useState(() => Date.now());
  const [values, setValues] = useState<Record<string, string>>({
    diet_pattern: 'omnivore',
    target_protein_g_per_kg: '1.6',
    strength_training_past_year: 'false',
    camera_baseline_completed: 'false',
    current_high_stress_phase: 'false',
    caregiving_responsibilities: 'false',
    heat_acclimated: 'false',
  });

  const day = useMemo(() => DAYS.find((item) => item.id === activeDay) ?? DAYS[0], [activeDay]);
  const Icon = day.icon;

  if (!loading && !session) return <Redirect href="/login" />;
  if (!loading && role === 'coach') return <Redirect href="/(tabs)" />;

  function setValue(key: string, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function basePayload() {
    return {
      phase: 2 as const,
      persona,
      source: 'mobile' as const,
      completion_seconds: Math.round((Date.now() - startedAt) / 1000),
    };
  }

  function buildPayload(): OnboardingV2Phase2Submission {
    const base = basePayload();

    if (activeDay === 'day1_aerobic') {
      return {
        ...base,
        day: activeDay,
        resting_hr_bpm: numberFor(values, 'resting_hr_bpm'),
        cooper_distance_meters: numberFor(values, 'cooper_distance_meters'),
        run_1km_seconds: numberFor(values, 'run_1km_seconds'),
        walk_1km_seconds: numberFor(values, 'walk_1km_seconds'),
        stairs_flights_completed: numberFor(values, 'stairs_flights_completed'),
        perceived_exertion_1_to_10: numberFor(values, 'perceived_exertion_1_to_10'),
      };
    }

    if (activeDay === 'day2_strength_power') {
      return {
        ...base,
        day: activeDay,
        squat_1rm_kg: numberFor(values, 'squat_1rm_kg'),
        vertical_jump_cm: numberFor(values, 'vertical_jump_cm'),
        broad_jump_cm: numberFor(values, 'broad_jump_cm'),
        pushups_60s: numberFor(values, 'pushups_60s'),
        plank_hold_seconds: numberFor(values, 'plank_hold_seconds'),
        strength_training_past_year: values.strength_training_past_year === 'true',
      };
    }

    if (activeDay === 'day3_movement_quality') {
      return {
        ...base,
        day: activeDay,
        fms: {
          aslr_left: numberFor(values, 'aslr_left'),
          aslr_right: numberFor(values, 'aslr_right'),
          shoulder_left: numberFor(values, 'shoulder_left'),
          shoulder_right: numberFor(values, 'shoulder_right'),
          trunk_pushup: numberFor(values, 'trunk_pushup'),
        },
        self_reported_pain_0_to_10: numberFor(values, 'self_reported_pain_0_to_10'),
        camera_baseline_completed: values.camera_baseline_completed === 'true',
        notes: textFor(values, 'movement_notes'),
      };
    }

    if (activeDay === 'day4_anaerobic_recovery') {
      return {
        ...base,
        day: activeDay,
        sprint_100m_seconds: numberFor(values, 'sprint_100m_seconds'),
        rsa_6x30m_best_seconds: numberFor(values, 'rsa_6x30m_best_seconds'),
        rsa_6x30m_average_seconds: numberFor(values, 'rsa_6x30m_average_seconds'),
        recovery_hr_drop_bpm_60s: numberFor(values, 'recovery_hr_drop_bpm_60s'),
        hrv_ppg_ms: numberFor(values, 'hrv_ppg_ms'),
        recovery_rating_1_to_5: numberFor(values, 'recovery_rating_1_to_5'),
      };
    }

    if (activeDay === 'day5_nutrition') {
      return {
        ...base,
        day: activeDay,
        nutrition: {
          diet_pattern: valueFor(values, 'diet_pattern') as NutritionProfile['diet_pattern'],
          protein_portions_per_day: numberFor(values, 'protein_portions_per_day'),
          estimated_protein_grams: numberFor(values, 'estimated_protein_grams'),
          water_cups_per_day: numberFor(values, 'water_cups_per_day'),
          known_deficiencies: listFor(values, 'known_deficiencies'),
          allergies: [],
          supplements: [],
        },
        body_mass_kg: numberFor(values, 'body_mass_kg'),
        training_hours_per_week: numberFor(values, 'training_hours_per_week') ?? -1,
        target_protein_g_per_kg: numberFor(values, 'target_protein_g_per_kg') ?? 1.6,
        recent_weight_loss_pct: numberFor(values, 'recent_weight_loss_pct'),
        missed_periods_last_90_days: numberFor(values, 'missed_periods_last_90_days'),
        fatigue_score_1_to_5: numberFor(values, 'fatigue_score_1_to_5'),
      };
    }

    if (activeDay === 'day6_psych_sleep') {
      const responses = Array.from({ length: 10 }, (_, index) => numberFor(values, `apsq_${index + 1}`));
      const hasApsq = responses.every((item) => item !== undefined);
      return {
        ...base,
        day: activeDay,
        apsq10: hasApsq ? { responses: responses as number[] } : undefined,
        sleep_baseline:
          numberFor(values, 'avg_sleep_hours') !== undefined
            ? {
                avg_sleep_hours: numberFor(values, 'avg_sleep_hours') ?? 0,
                sleep_quality_1_to_5: numberFor(values, 'sleep_quality_1_to_5'),
                wakeups_per_night: numberFor(values, 'wakeups_per_night'),
              }
            : undefined,
        life_stress_1_to_5: numberFor(values, 'life_stress_1_to_5'),
      };
    }

    return {
      ...base,
      day: 'day7_environment',
      environment: {
        primary_training_city: valueFor(values, 'primary_training_city'),
        altitude_meters: numberFor(values, 'altitude_meters'),
        indoor_outdoor_split_pct: numberFor(values, 'indoor_outdoor_split_pct'),
        sleep_environment: textFor(values, 'sleep_environment') as
          | 'ac'
          | 'fan_only'
          | 'open_windows'
          | 'shared_room'
          | undefined,
        commute_minutes: numberFor(values, 'commute_minutes'),
        commute_mode: textFor(values, 'commute_mode'),
        travel_frequency: textFor(values, 'travel_frequency') as
          | 'rarely'
          | 'monthly'
          | 'biweekly'
          | 'weekly'
          | undefined,
        current_high_stress_phase: values.current_high_stress_phase === 'true',
        caregiving_responsibilities: values.caregiving_responsibilities === 'true',
      },
      heat_index_c: numberFor(values, 'heat_index_c'),
      aqi: numberFor(values, 'aqi'),
      heat_acclimated: values.heat_acclimated === 'true',
    };
  }

  async function submitDay() {
    if (!session || !user) return;
    const parsed = OnboardingV2Phase2SubmissionSchema.safeParse(buildPayload());
    if (!parsed.success) {
      setError('Add the required measurement for this diagnostic day.');
      setMessage(null);
      return;
    }

    setSubmitting(true);
    setError(null);
    setMessage(null);
    let queuedId = '';

    try {
      queuedId = await queueOnboardingV2Phase2(user.id, parsed.data);
      const response = await submitOnboardingV2Phase2(session.access_token, parsed.data);
      await markOnboardingV2SubmissionSynced(queuedId);
      setResult(response);
      setCompletedDays(response.completedDays);
      setCalibrationPct(response.profileCalibrationPct);
      if (response.completedDays.length === 1) {
        await scheduleOnboardingV2Phase2Reminders();
      }
      if (activeDay === 'day7_environment') {
        await scheduleOnboardingV2DailyRitualReminder();
        await scheduleOnboardingV2RetestReminders();
        setMessage('Phase 2 complete. Daily ritual and retest reminders are ready on this device.');
      }
      await refreshUser();
      if (activeDay !== 'day7_environment') {
        setActiveDay(nextDay(activeDay));
      }
    } catch (submitError) {
      const detail =
        submitError instanceof Error
          ? submitError.message
          : 'Saved offline. Sync will retry when the backend is reachable.';
      if (queuedId) {
        await markOnboardingV2SubmissionFailed(queuedId, detail);
      }
      setMessage('Saved offline first. Phase 2 will sync when the backend is reachable.');
      if (!completedDays.includes(activeDay)) {
        setCompletedDays((current) => [...current, activeDay]);
      }
      if (activeDay === 'day7_environment') {
        await scheduleOnboardingV2DailyRitualReminder();
        await scheduleOnboardingV2RetestReminders();
      }
      if (activeDay !== 'day7_environment') {
        setActiveDay(nextDay(activeDay));
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color="#6EE7B7" />
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerClassName="px-5 pb-10 pt-16"
    >
      <View className="flex-row items-center gap-2 rounded-full border border-[#6EE7B7]/20 bg-[#6EE7B7]/10 px-4 py-2 self-start">
        <ShieldCheck color="#6EE7B7" size={16} />
        <Text className="text-[10px] font-black uppercase tracking-[0.24em] text-[#A7F3D0]">
          Phase 2 diagnostics
        </Text>
      </View>

      <Text className="mt-6 text-4xl font-black leading-tight text-white">
        Calibrate the engine one day at a time.
      </Text>
      <Text className="mt-3 text-sm leading-6 text-white/62">
        Submit the measurement you can honestly capture today. Native camera PPG remains a manual
        or device-reported input until the sensor path is validated.
      </Text>

      <NeonGlassCardNative className="mt-6">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-[10px] font-black uppercase tracking-[0.22em] text-white/35">
              Calibration
            </Text>
            <Text className="mt-2 text-3xl font-black text-white">{calibrationPct}%</Text>
          </View>
          <View className="h-14 w-14 items-center justify-center rounded-2xl bg-[#6EE7B7]/10">
            <Icon color="#6EE7B7" size={28} />
          </View>
        </View>
        <Text className="mt-4 text-xs leading-5 text-white/45">
          Completed {completedDays.length}/7 diagnostic days.
        </Text>
      </NeonGlassCardNative>

      <View className="mt-5 flex-row flex-wrap gap-2">
        {DAYS.map((item) => {
          const done = completedDays.includes(item.id);
          const active = item.id === activeDay;
          return (
            <Pressable
              key={item.id}
              onPress={() => setActiveDay(item.id)}
              className={`rounded-2xl border px-4 py-3 ${
                active ? 'border-[#6EE7B7]/60 bg-[#6EE7B7]/15' : 'border-white/10 bg-white/[0.03]'
              }`}
            >
              <Text className="text-[10px] font-black uppercase tracking-[0.2em] text-white/35">
                {item.label}
              </Text>
              <Text className={`mt-1 text-sm font-black ${active ? 'text-[#D1FAE5]' : 'text-white/72'}`}>
                {done ? 'Done' : item.title}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <NeonGlassCardNative className="mt-5">
        <Text className="text-[10px] font-black uppercase tracking-[0.22em] text-[#38BDF8]">
          {day.label}
        </Text>
        <Text className="mt-2 text-2xl font-black text-white">{day.title}</Text>
        <Text className="mt-2 text-sm leading-6 text-white/58">{day.detail}</Text>
        <View className="mt-5 gap-4">{renderFields(activeDay, values, setValue)}</View>

        {result ? (
          <Text className="mt-5 rounded-2xl border border-[#6EE7B7]/25 bg-[#6EE7B7]/10 p-4 text-sm font-semibold leading-6 text-[#D1FAE5]">
            Saved {result.latestDay.label}. Calibration is now {result.profileCalibrationPct}%.
          </Text>
        ) : null}
        {message ? <Text className="mt-4 text-sm leading-6 text-white/62">{message}</Text> : null}
        {error ? <Text className="mt-4 text-sm font-semibold text-[#FFB084]">{error}</Text> : null}

        <View className="mt-6 gap-3">
          {submitting ? (
            <View className="items-center py-4">
              <ActivityIndicator color="#6EE7B7" />
            </View>
          ) : (
            <>
              <GlowingButtonNative
                title={activeDay === 'day7_environment' ? 'Finish Phase 2' : 'Save and continue'}
                variant="chakra"
                onPress={submitDay}
              />
              <Pressable
                onPress={() =>
                  activeDay === 'day7_environment'
                    ? router.push('/daily-ritual')
                    : router.replace('/(tabs)')
                }
                className="min-h-12 flex-row items-center justify-center gap-2"
              >
                <Text className="text-sm font-bold text-white/58">
                  {activeDay === 'day7_environment' ? 'Open daily ritual' : 'Open dashboard'}
                </Text>
                <ArrowRight color="rgba(255,255,255,0.58)" size={16} />
              </Pressable>
            </>
          )}
        </View>
      </NeonGlassCardNative>
    </ScrollView>
  );
}

function renderFields(
  day: OnboardingV2Phase2Day,
  values: Record<string, string>,
  setValue: (key: string, value: string) => void
) {
  if (day === 'day1_aerobic') {
    return (
      <>
        <Input label="Resting HR bpm" keyboardType="numeric" value={valueFor(values, 'resting_hr_bpm')} onChangeText={(value) => setValue('resting_hr_bpm', value)} />
        <Input label="Cooper distance m" keyboardType="numeric" value={valueFor(values, 'cooper_distance_meters')} onChangeText={(value) => setValue('cooper_distance_meters', value)} />
        <Input label="1 km run seconds" keyboardType="numeric" value={valueFor(values, 'run_1km_seconds')} onChangeText={(value) => setValue('run_1km_seconds', value)} />
        <Input label="1 km walk seconds" keyboardType="numeric" value={valueFor(values, 'walk_1km_seconds')} onChangeText={(value) => setValue('walk_1km_seconds', value)} />
        <Input label="Stair flights" keyboardType="numeric" value={valueFor(values, 'stairs_flights_completed')} onChangeText={(value) => setValue('stairs_flights_completed', value)} />
        <Input label="RPE 1-10" keyboardType="numeric" value={valueFor(values, 'perceived_exertion_1_to_10')} onChangeText={(value) => setValue('perceived_exertion_1_to_10', value)} />
      </>
    );
  }

  if (day === 'day2_strength_power') {
    return (
      <>
        <Input label="Squat 1RM kg" keyboardType="decimal-pad" value={valueFor(values, 'squat_1rm_kg')} onChangeText={(value) => setValue('squat_1rm_kg', value)} />
        <Input label="Vertical jump cm" keyboardType="decimal-pad" value={valueFor(values, 'vertical_jump_cm')} onChangeText={(value) => setValue('vertical_jump_cm', value)} />
        <Input label="Broad jump cm" keyboardType="decimal-pad" value={valueFor(values, 'broad_jump_cm')} onChangeText={(value) => setValue('broad_jump_cm', value)} />
        <Input label="Pushups in 60s" keyboardType="numeric" value={valueFor(values, 'pushups_60s')} onChangeText={(value) => setValue('pushups_60s', value)} />
        <Input label="Plank seconds" keyboardType="numeric" value={valueFor(values, 'plank_hold_seconds')} onChangeText={(value) => setValue('plank_hold_seconds', value)} />
        <View className="gap-2">
          <Text className="text-[10px] font-black uppercase tracking-[0.22em] text-white/35">
            Strength training last year
          </Text>
          <View className="flex-row gap-2">
            <Choice active={values.strength_training_past_year === 'false'} label="No" onPress={() => setValue('strength_training_past_year', 'false')} />
            <Choice active={values.strength_training_past_year === 'true'} label="Yes" onPress={() => setValue('strength_training_past_year', 'true')} />
          </View>
        </View>
      </>
    );
  }

  if (day === 'day3_movement_quality') {
    return (
      <>
        <Input label="ASLR left 0-3" keyboardType="numeric" value={valueFor(values, 'aslr_left')} onChangeText={(value) => setValue('aslr_left', value)} />
        <Input label="ASLR right 0-3" keyboardType="numeric" value={valueFor(values, 'aslr_right')} onChangeText={(value) => setValue('aslr_right', value)} />
        <Input label="Shoulder left 0-3" keyboardType="numeric" value={valueFor(values, 'shoulder_left')} onChangeText={(value) => setValue('shoulder_left', value)} />
        <Input label="Shoulder right 0-3" keyboardType="numeric" value={valueFor(values, 'shoulder_right')} onChangeText={(value) => setValue('shoulder_right', value)} />
        <Input label="Pain 0-10" keyboardType="numeric" value={valueFor(values, 'self_reported_pain_0_to_10')} onChangeText={(value) => setValue('self_reported_pain_0_to_10', value)} />
        <View className="gap-2">
          <Text className="text-[10px] font-black uppercase tracking-[0.22em] text-white/35">
            Camera baseline completed
          </Text>
          <View className="flex-row gap-2">
            <Choice active={values.camera_baseline_completed === 'false'} label="No" onPress={() => setValue('camera_baseline_completed', 'false')} />
            <Choice active={values.camera_baseline_completed === 'true'} label="Yes" onPress={() => setValue('camera_baseline_completed', 'true')} />
          </View>
        </View>
      </>
    );
  }

  if (day === 'day4_anaerobic_recovery') {
    return (
      <>
        <Input label="100m sprint seconds" keyboardType="decimal-pad" value={valueFor(values, 'sprint_100m_seconds')} onChangeText={(value) => setValue('sprint_100m_seconds', value)} />
        <Input label="RSA best seconds" keyboardType="decimal-pad" value={valueFor(values, 'rsa_6x30m_best_seconds')} onChangeText={(value) => setValue('rsa_6x30m_best_seconds', value)} />
        <Input label="RSA average seconds" keyboardType="decimal-pad" value={valueFor(values, 'rsa_6x30m_average_seconds')} onChangeText={(value) => setValue('rsa_6x30m_average_seconds', value)} />
        <Input label="HR drop bpm 60s" keyboardType="numeric" value={valueFor(values, 'recovery_hr_drop_bpm_60s')} onChangeText={(value) => setValue('recovery_hr_drop_bpm_60s', value)} />
        <Input label="HRV PPG ms" keyboardType="decimal-pad" value={valueFor(values, 'hrv_ppg_ms')} onChangeText={(value) => setValue('hrv_ppg_ms', value)} />
        <Input label="Recovery rating 1-5" keyboardType="numeric" value={valueFor(values, 'recovery_rating_1_to_5')} onChangeText={(value) => setValue('recovery_rating_1_to_5', value)} />
      </>
    );
  }

  if (day === 'day5_nutrition') {
    return (
      <>
        <View className="gap-2">
          <Text className="text-[10px] font-black uppercase tracking-[0.22em] text-white/35">
            Diet pattern
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {(['omnivore', 'vegetarian', 'eggetarian', 'vegan', 'jain'] as const).map((pattern) => (
              <Choice key={pattern} active={values.diet_pattern === pattern} label={pattern} onPress={() => setValue('diet_pattern', pattern)} />
            ))}
          </View>
        </View>
        <Input label="Training hours/week" keyboardType="decimal-pad" value={valueFor(values, 'training_hours_per_week')} onChangeText={(value) => setValue('training_hours_per_week', value)} />
        <Input label="Body mass kg" keyboardType="decimal-pad" value={valueFor(values, 'body_mass_kg')} onChangeText={(value) => setValue('body_mass_kg', value)} />
        <Input label="Protein grams/day" keyboardType="decimal-pad" value={valueFor(values, 'estimated_protein_grams')} onChangeText={(value) => setValue('estimated_protein_grams', value)} />
        <Input label="Water cups/day" keyboardType="numeric" value={valueFor(values, 'water_cups_per_day')} onChangeText={(value) => setValue('water_cups_per_day', value)} />
        <Input label="Recent weight loss %" keyboardType="decimal-pad" value={valueFor(values, 'recent_weight_loss_pct')} onChangeText={(value) => setValue('recent_weight_loss_pct', value)} />
        <Input label="Fatigue 1-5" keyboardType="numeric" value={valueFor(values, 'fatigue_score_1_to_5')} onChangeText={(value) => setValue('fatigue_score_1_to_5', value)} />
      </>
    );
  }

  if (day === 'day6_psych_sleep') {
    return (
      <>
        {Array.from({ length: 10 }, (_, index) => (
          <Input
            key={index}
            label={`APSQ ${index + 1} 0-4`}
            keyboardType="numeric"
            value={valueFor(values, `apsq_${index + 1}`)}
            onChangeText={(value) => setValue(`apsq_${index + 1}`, value)}
          />
        ))}
        <Input label="Avg sleep hours" keyboardType="decimal-pad" value={valueFor(values, 'avg_sleep_hours')} onChangeText={(value) => setValue('avg_sleep_hours', value)} />
        <Input label="Sleep quality 1-5" keyboardType="numeric" value={valueFor(values, 'sleep_quality_1_to_5')} onChangeText={(value) => setValue('sleep_quality_1_to_5', value)} />
        <Input label="Life stress 1-5" keyboardType="numeric" value={valueFor(values, 'life_stress_1_to_5')} onChangeText={(value) => setValue('life_stress_1_to_5', value)} />
      </>
    );
  }

  return (
    <>
      <Input label="Training city" value={valueFor(values, 'primary_training_city')} onChangeText={(value) => setValue('primary_training_city', value)} />
      <Input label="Heat index C" keyboardType="decimal-pad" value={valueFor(values, 'heat_index_c')} onChangeText={(value) => setValue('heat_index_c', value)} />
      <Input label="AQI" keyboardType="numeric" value={valueFor(values, 'aqi')} onChangeText={(value) => setValue('aqi', value)} />
      <Input label="Altitude meters" keyboardType="numeric" value={valueFor(values, 'altitude_meters')} onChangeText={(value) => setValue('altitude_meters', value)} />
      <Input label="Outdoor split %" keyboardType="numeric" value={valueFor(values, 'indoor_outdoor_split_pct')} onChangeText={(value) => setValue('indoor_outdoor_split_pct', value)} />
      <Input label="Commute minutes" keyboardType="numeric" value={valueFor(values, 'commute_minutes')} onChangeText={(value) => setValue('commute_minutes', value)} />
    </>
  );
}
