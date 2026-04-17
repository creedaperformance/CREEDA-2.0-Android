import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { ArrowLeft, CheckCircle2, Flame, HeartPulse, Moon, ShieldAlert } from 'lucide-react-native';

import { GlowingButtonNative } from '../src/components/neon/GlowingButtonNative';
import { NeonGlassCardNative } from '../src/components/neon/NeonGlassCardNative';
import { ReadinessOrbNative } from '../src/components/neon/ReadinessOrbNative';
import { useMobileAuth } from '../src/lib/auth';
import {
  submitAthleteDailyCheckIn,
  type AthleteDailyCheckInPayload,
  type AthleteDailyCheckInResponse,
} from '../src/lib/mobile-api';

const sleepQualities = ['Poor', 'Okay', 'Good', 'Excellent'] as const;
const sleepDurations = ['<6', '6-7', '7-8', '8-9', '9+'] as const;
const sleepLatencies = ['<15 min', '15-30 min', '30-60 min', '>60 min'] as const;
const energyLevels = ['Drained', 'Low', 'Moderate', 'High', 'Peak'] as const;
const sorenessLevels = ['None', 'Low', 'Moderate', 'High'] as const;
const stressLevels = ['Low', 'Moderate', 'High', 'Very High'] as const;
const motivationLevels = ['Low', 'Moderate', 'High'] as const;
const sessionCompletions = ['completed', 'competition', 'rest', 'missed'] as const;
const sessionTypes = ['Skill', 'Strength', 'Speed', 'Endurance', 'Recovery'] as const;
const painStatuses = ['none', 'mild', 'moderate', 'severe'] as const;
const painLocations = ['Neck', 'Shoulder', 'Back', 'Hip', 'Knee', 'Ankle'] as const;
const heatLevels = ['normal', 'warm', 'hot', 'extreme'] as const;
const humidityLevels = ['low', 'moderate', 'high'] as const;
const aqiBands = ['good', 'moderate', 'poor', 'very_poor'] as const;
const fastingStates = ['none', 'light', 'strict'] as const;

type ChoiceValue = string;

type FormState = AthleteDailyCheckInPayload

function ChoiceGroup({
  label,
  values,
  value,
  onChange,
  renderLabel,
}: {
  label: string;
  values: readonly ChoiceValue[];
  value: ChoiceValue;
  onChange: (nextValue: ChoiceValue) => void;
  renderLabel?: (item: ChoiceValue) => string;
}) {
  return (
    <View className="mt-5">
      <Text className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">{label}</Text>
      <View className="mt-3 flex-row flex-wrap gap-3">
        {values.map((item) => {
          const active = value === item;

          return (
            <Pressable
              key={item}
              onPress={() => onChange(item)}
              className={`rounded-full border px-4 py-3 ${
                active ? 'border-[#00E5FF]/50 bg-[#00E5FF]/10' : 'border-white/5 bg-white/[0.03]'
              }`}
            >
              <Text className={`text-xs font-bold uppercase tracking-[0.18em] ${active ? 'text-chakra-neon' : 'text-white/60'}`}>
                {renderLabel ? renderLabel(item) : item}
              </Text>
            </Pressable>
          );
        })}
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
          keyboardType="number-pad"
          onChangeText={(text) => onChange(Number.parseInt(text || '0', 10) || 0)}
          value={String(value)}
          className="flex-1 py-3 text-base text-white"
          placeholderTextColor="rgba(255,255,255,0.28)"
        />
        {suffix ? <Text className="text-sm text-white/40">{suffix}</Text> : null}
      </View>
    </View>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (nextValue: boolean) => void;
}) {
  return (
    <View className="mt-4 flex-row items-center justify-between rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-4">
      <Text className="text-sm font-semibold text-white/75">{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        thumbColor={value ? '#00E5FF' : '#F4F3F4'}
        trackColor={{ false: '#2A2F36', true: 'rgba(0,229,255,0.35)' }}
      />
    </View>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

const initialFormState: FormState = {
  sleepQuality: 'Okay',
  sleepDuration: '7-8',
  sleepLatency: '15-30 min',
  energyLevel: 'Moderate',
  muscleSoreness: 'Low',
  lifeStress: 'Moderate',
  motivation: 'Moderate',
  sessionCompletion: 'completed',
  sessionType: 'Strength',
  yesterdayDemand: 6,
  yesterdayDuration: 60,
  painStatus: 'none',
  painLocation: [],
  competitionToday: false,
  competitionTomorrow: false,
  competitionYesterday: false,
  heatLevel: '',
  humidityLevel: '',
  aqiBand: '',
  commuteMinutes: 0,
  examStressScore: 0,
  fastingState: '',
  shiftWork: false,
  sessionNotes: '',
};

export default function AthleteCheckInScreen() {
  const router = useRouter();
  const { session, user, refreshUser } = useMobileAuth();
  const [form, setForm] = useState<FormState>(initialFormState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AthleteDailyCheckInResponse | null>(null);

  const sessionCaptured =
    form.sessionCompletion === 'completed' || form.sessionCompletion === 'competition';

  const canSubmit = useMemo(() => {
    if (!sessionCaptured) return true;
    if (form.painStatus !== 'none' && form.painLocation.length === 0) return false;
    return Boolean(form.sleepQuality && form.energyLevel && form.lifeStress && form.motivation);
  }, [form, sessionCaptured]);

  if (!session) {
    return <Redirect href="/login" />;
  }

  if (user && user.profile.role !== 'athlete') {
    return (
      <View className="flex-1 items-center justify-center bg-background px-8">
        <Text className="text-center text-xl font-black tracking-tight text-white">
          Daily check-in is currently athlete-only
        </Text>
        <Text className="mt-4 text-center text-sm leading-6 text-white/55">
          Your mobile role is `{user.profile.role}`. This first native check-in flow is wired to the athlete decision engine.
        </Text>
      </View>
    );
  }

  async function handleSubmit() {
    const accessToken = session?.access_token;
    if (!accessToken) {
      setError('Your session expired. Sign in again to submit today’s check-in.');
      return;
    }

    if (!canSubmit) {
      setError('Complete the required sections before sending today’s check-in.');
      return;
    }

    if (form.painStatus !== 'none' && form.painLocation.length === 0) {
      setError('Add the pain location so CREEDA can protect today’s prescription correctly.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload: AthleteDailyCheckInPayload = {
        ...form,
        yesterdayDemand: clamp(form.yesterdayDemand, 0, 10),
        yesterdayDuration: clamp(form.yesterdayDuration, 0, 300),
        commuteMinutes: clamp(form.commuteMinutes, 0, 240),
        examStressScore: clamp(form.examStressScore, 0, 5),
        sessionType: sessionCaptured ? form.sessionType || 'Recovery' : '',
        painLocation: form.painStatus === 'none' ? [] : form.painLocation,
      };

      const response = await submitAthleteDailyCheckIn(accessToken, payload);
      setResult(response);
      await refreshUser();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Failed to save your daily check-in.'
      );
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    return (
      <View className="flex-1 bg-background px-6 pt-16">
        <View className="flex-1 items-center justify-center">
          <ReadinessOrbNative score={result.readinessScore} />
          <Text className="mt-6 text-[10px] font-bold uppercase tracking-[0.28em] text-white/35">
            Updated Decision
          </Text>
          <Text className="mt-3 text-4xl font-black tracking-tight text-white">{result.decision}</Text>
          <Text className="mt-4 text-center text-sm leading-6 text-white/65">{result.action}</Text>
          <Text className="mt-4 text-center text-sm leading-6 text-white/45">{result.reason}</Text>

          <View className="mt-8 w-full gap-4">
            <GlowingButtonNative
              title="Open Updated Dashboard"
              variant="chakra"
              icon={<CheckCircle2 color="#00E5FF" size={18} />}
              onPress={() => router.replace('/(tabs)')}
            />
            <GlowingButtonNative
              title="Check In Again"
              variant="saffron"
              onPress={() => {
                setResult(null);
                setForm(initialFormState);
              }}
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
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 120 }}>
        <Pressable
          onPress={() => router.back()}
          className="mb-8 flex-row items-center gap-3"
        >
          <ArrowLeft color="#FF5F1F" size={18} />
          <Text className="text-sm font-semibold text-white/60">Back</Text>
        </Pressable>

        <View className="mb-8">
          <Text className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/35">
            Athlete Daily Check-In
          </Text>
          <Text className="mt-3 text-4xl font-black tracking-tight text-white">
            Update today’s decision
          </Text>
          <Text className="mt-3 text-sm leading-6 text-white/55">
            This native screen posts into the same CREEDA readiness engine as the web check-in.
          </Text>
        </View>

        <NeonGlassCardNative watermark="S">
          <View className="flex-row items-center gap-3">
            <Moon color="#FF5F1F" size={18} />
            <Text className="text-lg font-black tracking-tight text-white">Sleep</Text>
          </View>
          <ChoiceGroup
            label="Sleep quality"
            values={sleepQualities}
            value={form.sleepQuality}
            onChange={(next) => setForm((current) => ({ ...current, sleepQuality: next as FormState['sleepQuality'] }))}
          />
          <ChoiceGroup
            label="Sleep duration"
            values={sleepDurations}
            value={form.sleepDuration}
            onChange={(next) => setForm((current) => ({ ...current, sleepDuration: next as FormState['sleepDuration'] }))}
          />
          <ChoiceGroup
            label="Sleep latency"
            values={sleepLatencies}
            value={form.sleepLatency}
            onChange={(next) => setForm((current) => ({ ...current, sleepLatency: next as FormState['sleepLatency'] }))}
          />
        </NeonGlassCardNative>

        <NeonGlassCardNative watermark="R">
          <View className="flex-row items-center gap-3">
            <HeartPulse color="#FF5F1F" size={18} />
            <Text className="text-lg font-black tracking-tight text-white">Readiness</Text>
          </View>
          <ChoiceGroup
            label="Energy"
            values={energyLevels}
            value={form.energyLevel}
            onChange={(next) => setForm((current) => ({ ...current, energyLevel: next as FormState['energyLevel'] }))}
          />
          <ChoiceGroup
            label="Muscle soreness"
            values={sorenessLevels}
            value={form.muscleSoreness}
            onChange={(next) => setForm((current) => ({ ...current, muscleSoreness: next as FormState['muscleSoreness'] }))}
          />
          <ChoiceGroup
            label="Life stress"
            values={stressLevels}
            value={form.lifeStress}
            onChange={(next) => setForm((current) => ({ ...current, lifeStress: next as FormState['lifeStress'] }))}
          />
          <ChoiceGroup
            label="Motivation"
            values={motivationLevels}
            value={form.motivation}
            onChange={(next) => setForm((current) => ({ ...current, motivation: next as FormState['motivation'] }))}
          />
        </NeonGlassCardNative>

        <NeonGlassCardNative watermark="L">
          <View className="flex-row items-center gap-3">
            <Flame color="#FF5F1F" size={18} />
            <Text className="text-lg font-black tracking-tight text-white">Yesterday’s load</Text>
          </View>
          <ChoiceGroup
            label="Session outcome"
            values={sessionCompletions}
            value={form.sessionCompletion}
            onChange={(next) => setForm((current) => ({ ...current, sessionCompletion: next as FormState['sessionCompletion'] }))}
          />

          {sessionCaptured ? (
            <>
              <ChoiceGroup
                label="Session type"
                values={sessionTypes}
                value={form.sessionType || ''}
                onChange={(next) => setForm((current) => ({ ...current, sessionType: next as FormState['sessionType'] }))}
              />
              <NumberField
                label="Demand (RPE)"
                value={form.yesterdayDemand}
                onChange={(next) =>
                  setForm((current) => ({ ...current, yesterdayDemand: clamp(next, 0, 10) }))
                }
                suffix="/10"
              />
              <NumberField
                label="Duration"
                value={form.yesterdayDuration}
                onChange={(next) =>
                  setForm((current) => ({ ...current, yesterdayDuration: clamp(next, 0, 300) }))
                }
                suffix="min"
              />
            </>
          ) : (
            <Text className="mt-4 text-sm leading-6 text-white/55">
              Since yesterday was a rest or missed day, CREEDA will treat absorbed load as zero.
            </Text>
          )}
        </NeonGlassCardNative>

        <NeonGlassCardNative watermark="P">
          <View className="flex-row items-center gap-3">
            <ShieldAlert color="#FF5F1F" size={18} />
            <Text className="text-lg font-black tracking-tight text-white">Pain and schedule</Text>
          </View>
          <ChoiceGroup
            label="Pain status"
            values={painStatuses}
            value={form.painStatus}
            onChange={(next) =>
              setForm((current) => ({
                ...current,
                painStatus: next as FormState['painStatus'],
                painLocation: next === 'none' ? [] : current.painLocation,
              }))
            }
          />

          {form.painStatus !== 'none' ? (
            <View className="mt-5">
              <Text className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">Pain location</Text>
              <View className="mt-3 flex-row flex-wrap gap-3">
              {painLocations.map((location) => {
                const active = form.painLocation.includes(location);

                return (
                  <Pressable
                    key={location}
                    onPress={() =>
                      setForm((current) => ({
                        ...current,
                        painLocation: current.painLocation.includes(location)
                          ? current.painLocation.filter((item) => item !== location)
                          : [...current.painLocation, location],
                      }))
                    }
                    className={`rounded-full border px-4 py-3 ${
                      active ? 'border-[#FF8C5A]/50 bg-[#FF8C5A]/10' : 'border-white/5 bg-white/[0.03]'
                    }`}
                  >
                    <Text className={`text-xs font-bold uppercase tracking-[0.18em] ${active ? 'text-[#FF8C5A]' : 'text-white/60'}`}>
                      {location}
                    </Text>
                  </Pressable>
                );
              })}
              </View>
            </View>
          ) : null}

          <ToggleRow
            label="Competition today"
            value={form.competitionToday}
            onChange={(next) => setForm((current) => ({ ...current, competitionToday: next }))}
          />
          <ToggleRow
            label="Competition tomorrow"
            value={form.competitionTomorrow}
            onChange={(next) => setForm((current) => ({ ...current, competitionTomorrow: next }))}
          />
          <ToggleRow
            label="Competition yesterday"
            value={form.competitionYesterday}
            onChange={(next) => setForm((current) => ({ ...current, competitionYesterday: next }))}
          />
        </NeonGlassCardNative>

        <NeonGlassCardNative watermark="C">
          <Text className="text-lg font-black tracking-tight text-white">Context</Text>
          <Text className="mt-2 text-sm leading-6 text-white/55">
            These fields are optional, but they help CREEDA explain pressure from heat, travel, fasting, and schedule load.
          </Text>
          <ChoiceGroup
            label="Heat"
            values={['', ...heatLevels]}
            value={form.heatLevel || ''}
            onChange={(next) => setForm((current) => ({ ...current, heatLevel: next as FormState['heatLevel'] }))}
            renderLabel={(item) => item || 'Skip'}
          />
          <ChoiceGroup
            label="Humidity"
            values={['', ...humidityLevels]}
            value={form.humidityLevel || ''}
            onChange={(next) => setForm((current) => ({ ...current, humidityLevel: next as FormState['humidityLevel'] }))}
            renderLabel={(item) => item || 'Skip'}
          />
          <ChoiceGroup
            label="Air quality"
            values={['', ...aqiBands]}
            value={form.aqiBand || ''}
            onChange={(next) => setForm((current) => ({ ...current, aqiBand: next as FormState['aqiBand'] }))}
            renderLabel={(item) => item || 'Skip'}
          />
          <ChoiceGroup
            label="Fasting"
            values={['', ...fastingStates]}
            value={form.fastingState || ''}
            onChange={(next) => setForm((current) => ({ ...current, fastingState: next as FormState['fastingState'] }))}
            renderLabel={(item) => item || 'Skip'}
          />
          <NumberField
            label="Commute"
            value={form.commuteMinutes}
            onChange={(next) =>
              setForm((current) => ({ ...current, commuteMinutes: clamp(next, 0, 240) }))
            }
            suffix="min"
          />
          <NumberField
            label="Schedule stress"
            value={form.examStressScore}
            onChange={(next) =>
              setForm((current) => ({ ...current, examStressScore: clamp(next, 0, 5) }))
            }
            suffix="/5"
          />
          <ToggleRow
            label="Shift work"
            value={form.shiftWork}
            onChange={(next) => setForm((current) => ({ ...current, shiftWork: next }))}
          />
          <View className="mt-5">
            <Text className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">Session notes</Text>
            <TextInput
              multiline
              onChangeText={(text) => setForm((current) => ({ ...current, sessionNotes: text.slice(0, 300) }))}
              value={form.sessionNotes || ''}
              placeholder="Optional: anything CREEDA should know about today"
              placeholderTextColor="rgba(255,255,255,0.28)"
              className="mt-3 min-h-[120px] rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-4 text-base text-white"
              textAlignVertical="top"
            />
          </View>
        </NeonGlassCardNative>

        {error ? (
          <Text className="mt-4 text-sm leading-6 text-[#FF8C5A]">{error}</Text>
        ) : null}

        <View className="mt-6">
          {loading ? (
            <View className="items-center py-6">
              <ActivityIndicator color="#FF5F1F" />
              <Text className="mt-4 text-sm text-white/55">Generating today’s decision...</Text>
            </View>
          ) : (
            <GlowingButtonNative
              title="Send Check-In"
              variant="chakra"
              icon={<CheckCircle2 color="#00E5FF" size={18} />}
              onPress={handleSubmit}
            />
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
