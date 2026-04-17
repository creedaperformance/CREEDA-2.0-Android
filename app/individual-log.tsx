import { useState } from 'react';
import {
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
import { ArrowLeft, Brain, CheckCircle2, Flame, Footprints, HeartPulse, Moon } from 'lucide-react-native';

import { GlowingButtonNative } from '../src/components/neon/GlowingButtonNative';
import { NeonGlassCardNative } from '../src/components/neon/NeonGlassCardNative';
import { ReadinessOrbNative } from '../src/components/neon/ReadinessOrbNative';
import { useMobileAuth } from '../src/lib/auth';
import {
  submitIndividualDailyLog,
  type IndividualDailyLogPayload,
  type IndividualDailyLogResponse,
} from '../src/lib/mobile-api';

type ChoiceValue = string | number;
type FormState = IndividualDailyLogPayload;

const positiveScale = [
  { label: 'Poor', value: 1 },
  { label: 'Low', value: 2 },
  { label: 'Okay', value: 3 },
  { label: 'Good', value: 4 },
  { label: 'Excellent', value: 5 },
] as const;

const stressScale = [
  { label: 'Calm', value: 1 },
  { label: 'Light', value: 2 },
  { label: 'Moderate', value: 3 },
  { label: 'High', value: 4 },
  { label: 'Overloaded', value: 5 },
] as const;

const sorenessScale = [
  { label: 'None', value: 1 },
  { label: 'Light', value: 2 },
  { label: 'Moderate', value: 3 },
  { label: 'High', value: 4 },
  { label: 'Severe', value: 5 },
] as const;

const sessionCompletions = [
  { label: 'Missed', value: 'missed' },
  { label: 'Partial', value: 'partial' },
  { label: 'Complete', value: 'complete' },
  { label: 'Crushed', value: 'crushed' },
] as const;

const heatLevels = [
  { label: 'Skip', value: '' },
  { label: 'Normal', value: 'normal' },
  { label: 'Warm', value: 'warm' },
  { label: 'Hot', value: 'hot' },
  { label: 'Extreme', value: 'extreme' },
] as const;

const humidityLevels = [
  { label: 'Skip', value: '' },
  { label: 'Low', value: 'low' },
  { label: 'Moderate', value: 'moderate' },
  { label: 'High', value: 'high' },
] as const;

const aqiBands = [
  { label: 'Skip', value: '' },
  { label: 'Good', value: 'good' },
  { label: 'Moderate', value: 'moderate' },
  { label: 'Poor', value: 'poor' },
  { label: 'Very Poor', value: 'very_poor' },
] as const;

const fastingStates = [
  { label: 'Skip', value: '' },
  { label: 'None', value: 'none' },
  { label: 'Light', value: 'light' },
  { label: 'Strict', value: 'strict' },
] as const;

const initialFormState: FormState = {
  sleep_quality: 3,
  energy_level: 3,
  stress_level: 3,
  recovery_feel: 3,
  soreness_level: 2,
  session_completion: 'complete',
  training_minutes: 45,
  session_rpe: 6,
  steps: 8000,
  hydration_liters: 2,
  heat_level: '',
  humidity_level: '',
  aqi_band: '',
  commute_minutes: 0,
  exam_stress_score: 0,
  fasting_state: '',
  shift_work: false,
  session_notes: '',
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function formatNumber(value: number) {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(1).replace(/\.0$/, '');
}

function ChoiceGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: ReadonlyArray<{ label: string; value: ChoiceValue }>;
  value: ChoiceValue;
  onChange: (nextValue: ChoiceValue) => void;
}) {
  return (
    <View className="mt-5">
      <Text className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">{label}</Text>
      <View className="mt-3 flex-row flex-wrap gap-3">
        {options.map((option) => {
          const active = value === option.value;

          return (
            <Pressable
              key={`${label}-${option.label}`}
              onPress={() => onChange(option.value)}
              className={`rounded-full border px-4 py-3 ${
                active ? 'border-[#00E5FF]/50 bg-[#00E5FF]/10' : 'border-white/5 bg-white/[0.03]'
              }`}
            >
              <Text
                className={`text-xs font-bold uppercase tracking-[0.18em] ${
                  active ? 'text-chakra-neon' : 'text-white/60'
                }`}
              >
                {option.label}
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

export default function IndividualLogScreen() {
  const router = useRouter();
  const { session, user, refreshUser } = useMobileAuth();
  const [form, setForm] = useState<FormState>(initialFormState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<IndividualDailyLogResponse | null>(null);

  if (!session) {
    return <Redirect href="/login" />;
  }

  if (user && user.profile.role !== 'individual') {
    return (
      <View className="flex-1 items-center justify-center bg-background px-8">
        <Text className="text-center text-xl font-black tracking-tight text-white">
          Daily log is currently individual-only
        </Text>
        <Text className="mt-4 text-center text-sm leading-6 text-white/55">
          Your mobile role is `{user.profile.role}`. Athlete check-in and coach review continue to live on their own CREEDA flows.
        </Text>
      </View>
    );
  }

  async function handleSubmit() {
    const accessToken = session?.access_token;
    if (!accessToken) {
      setError('Your session expired. Sign in again to send today’s individual log.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const missedSession = form.session_completion === 'missed';
      const payload: IndividualDailyLogPayload = {
        ...form,
        sleep_quality: clamp(Number(form.sleep_quality) || 3, 1, 5),
        energy_level: clamp(Number(form.energy_level) || 3, 1, 5),
        stress_level: clamp(Number(form.stress_level) || 3, 1, 5),
        recovery_feel: clamp(Number(form.recovery_feel) || 3, 1, 5),
        soreness_level: clamp(Number(form.soreness_level) || 2, 1, 5),
        training_minutes: missedSession ? 0 : clamp(form.training_minutes, 0, 300),
        session_rpe: missedSession ? 0 : clamp(form.session_rpe, 0, 10),
        steps: clamp(form.steps, 0, 100000),
        hydration_liters: clamp(form.hydration_liters, 0, 10),
        commute_minutes: clamp(form.commute_minutes || 0, 0, 240),
        exam_stress_score: clamp(form.exam_stress_score || 0, 0, 5),
        session_notes: (form.session_notes || '').trim().slice(0, 300),
      };

      const response = await submitIndividualDailyLog(accessToken, payload);
      setResult(response);
      await refreshUser();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Failed to save your individual daily log.'
      );
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    return (
      <View className="flex-1 bg-background px-6 pt-16">
        <View className="flex-1 items-center justify-center">
          <ReadinessOrbNative score={result.result.score} />
          <Text className="mt-6 text-[10px] font-bold uppercase tracking-[0.28em] text-white/35">
            Updated Direction
          </Text>
          <Text className="mt-3 text-4xl font-black tracking-tight text-white">
            {result.result.status}
          </Text>
          <Text className="mt-4 text-center text-sm leading-6 text-white/65">
            {result.result.action}
          </Text>
          <Text className="mt-4 text-center text-sm leading-6 text-white/45">
            {result.result.reason}
          </Text>

          <View className="mt-8 w-full gap-4">
            <GlowingButtonNative
              title="Open Updated Dashboard"
              variant="chakra"
              icon={<CheckCircle2 color="#00E5FF" size={18} />}
              onPress={() => router.replace('/(tabs)')}
            />
            <GlowingButtonNative
              title="Log Another Day"
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
        <Pressable onPress={() => router.back()} className="mb-8 flex-row items-center gap-3">
          <ArrowLeft color="#FF5F1F" size={18} />
          <Text className="text-sm font-semibold text-white/60">Back</Text>
        </Pressable>

        <View className="mb-8">
          <Text className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/35">
            Individual Daily Log
          </Text>
          <Text className="mt-3 text-4xl font-black tracking-tight text-white">
            Refresh today’s CREEDA direction
          </Text>
          <Text className="mt-3 text-sm leading-6 text-white/55">
            This native screen posts into the same FitStart-based individual decision engine that powers the web logging flow.
          </Text>
        </View>

        <NeonGlassCardNative watermark="R">
          <View className="flex-row items-center gap-3">
            <Moon color="#FF5F1F" size={18} />
            <Text className="text-lg font-black tracking-tight text-white">Recovery signal</Text>
          </View>
          <ChoiceGroup
            label="Sleep quality"
            options={positiveScale}
            value={form.sleep_quality}
            onChange={(next) => setForm((current) => ({ ...current, sleep_quality: next as number }))}
          />
          <ChoiceGroup
            label="Energy"
            options={positiveScale}
            value={form.energy_level}
            onChange={(next) => setForm((current) => ({ ...current, energy_level: next as number }))}
          />
          <ChoiceGroup
            label="Stress"
            options={stressScale}
            value={form.stress_level}
            onChange={(next) => setForm((current) => ({ ...current, stress_level: next as number }))}
          />
          <ChoiceGroup
            label="Recovery feel"
            options={positiveScale}
            value={form.recovery_feel}
            onChange={(next) => setForm((current) => ({ ...current, recovery_feel: next as number }))}
          />
          <ChoiceGroup
            label="Soreness"
            options={sorenessScale}
            value={form.soreness_level}
            onChange={(next) => setForm((current) => ({ ...current, soreness_level: next as number }))}
          />
        </NeonGlassCardNative>

        <NeonGlassCardNative watermark="L">
          <View className="flex-row items-center gap-3">
            <Footprints color="#FF5F1F" size={18} />
            <Text className="text-lg font-black tracking-tight text-white">Load and movement</Text>
          </View>
          <ChoiceGroup
            label="Session completion"
            options={sessionCompletions}
            value={form.session_completion}
            onChange={(next) =>
              setForm((current) => ({
                ...current,
                session_completion: next as FormState['session_completion'],
              }))
            }
          />

          {form.session_completion === 'missed' ? (
            <Text className="mt-4 text-sm leading-6 text-white/55">
              CREEDA will treat the session load as zero for today because the session was missed.
            </Text>
          ) : (
            <>
              <NumberField
                label="Training minutes"
                value={form.training_minutes}
                onChange={(next) =>
                  setForm((current) => ({ ...current, training_minutes: clamp(next, 0, 300) }))
                }
                suffix="min"
              />
              <NumberField
                label="Session RPE"
                value={form.session_rpe}
                onChange={(next) =>
                  setForm((current) => ({ ...current, session_rpe: clamp(next, 0, 10) }))
                }
                suffix="/10"
              />
            </>
          )}

          <NumberField
            label="Steps"
            value={form.steps}
            onChange={(next) => setForm((current) => ({ ...current, steps: clamp(next, 0, 100000) }))}
          />
          <NumberField
            label="Hydration"
            value={form.hydration_liters}
            onChange={(next) =>
              setForm((current) => ({ ...current, hydration_liters: clamp(next, 0, 10) }))
            }
            suffix="L"
          />
        </NeonGlassCardNative>

        <NeonGlassCardNative watermark="C">
          <View className="flex-row items-center gap-3">
            <Flame color="#FF5F1F" size={18} />
            <Text className="text-lg font-black tracking-tight text-white">Context load</Text>
          </View>
          <Text className="mt-2 text-sm leading-6 text-white/55">
            These optional factors help CREEDA explain travel, environment, and schedule stress around your training day.
          </Text>
          <ChoiceGroup
            label="Heat"
            options={heatLevels}
            value={form.heat_level || ''}
            onChange={(next) => setForm((current) => ({ ...current, heat_level: next as FormState['heat_level'] }))}
          />
          <ChoiceGroup
            label="Humidity"
            options={humidityLevels}
            value={form.humidity_level || ''}
            onChange={(next) =>
              setForm((current) => ({ ...current, humidity_level: next as FormState['humidity_level'] }))
            }
          />
          <ChoiceGroup
            label="Air quality"
            options={aqiBands}
            value={form.aqi_band || ''}
            onChange={(next) => setForm((current) => ({ ...current, aqi_band: next as FormState['aqi_band'] }))}
          />
          <ChoiceGroup
            label="Fasting"
            options={fastingStates}
            value={form.fasting_state || ''}
            onChange={(next) =>
              setForm((current) => ({ ...current, fasting_state: next as FormState['fasting_state'] }))
            }
          />
          <NumberField
            label="Commute"
            value={form.commute_minutes || 0}
            onChange={(next) =>
              setForm((current) => ({ ...current, commute_minutes: clamp(next, 0, 240) }))
            }
            suffix="min"
          />
          <NumberField
            label="Schedule stress"
            value={form.exam_stress_score || 0}
            onChange={(next) =>
              setForm((current) => ({ ...current, exam_stress_score: clamp(next, 0, 5) }))
            }
            suffix="/5"
          />
          <ToggleRow
            label="Shift work or late-hours schedule"
            value={form.shift_work || false}
            onChange={(next) => setForm((current) => ({ ...current, shift_work: next }))}
          />
        </NeonGlassCardNative>

        <NeonGlassCardNative watermark="N">
          <View className="flex-row items-center gap-3">
            <Brain color="#FF5F1F" size={18} />
            <Text className="text-lg font-black tracking-tight text-white">Coach note for yourself</Text>
          </View>
          <Text className="mt-2 text-sm leading-6 text-white/55">
            Capture anything unusual about today. This gets stored as context for the engine.
          </Text>
          <View className="mt-4 rounded-3xl border border-white/5 bg-white/[0.03] px-4 py-4">
            <TextInput
              multiline
              value={form.session_notes || ''}
              onChangeText={(text) =>
                setForm((current) => ({ ...current, session_notes: text.slice(0, 300) }))
              }
              placeholder="Travel day, poor sleep environment, hard work block, unusual soreness..."
              placeholderTextColor="rgba(255,255,255,0.28)"
              className="min-h-[120px] text-base leading-6 text-white"
              style={{ textAlignVertical: 'top' }}
            />
            <Text className="mt-3 text-right text-[10px] font-bold uppercase tracking-[0.18em] text-white/28">
              {(form.session_notes || '').length}/300
            </Text>
          </View>
        </NeonGlassCardNative>

        <NeonGlassCardNative watermark="H">
          <View className="flex-row items-center gap-3">
            <HeartPulse color="#FF5F1F" size={18} />
            <Text className="text-lg font-black tracking-tight text-white">How this feeds CREEDA</Text>
          </View>
          <Text className="mt-3 text-sm leading-6 text-white/65">
            The app blends this manual log with your FitStart pathway and any connected health metrics to refresh your readiness, today’s action, and the weekly peak projection.
          </Text>
        </NeonGlassCardNative>

        {error ? (
          <NeonGlassCardNative>
            <Text className="text-base font-bold text-[#FF8C5A]">Submission issue</Text>
            <Text className="mt-3 text-sm leading-6 text-white/65">{error}</Text>
          </NeonGlassCardNative>
        ) : null}

        <View className="mt-6">
          <GlowingButtonNative
            title={loading ? 'Saving today...' : 'Update Direction'}
            variant="chakra"
            icon={loading ? undefined : <CheckCircle2 color="#00E5FF" size={18} />}
            onPress={() => {
              if (!loading) {
                void handleSubmit();
              }
            }}
          />
        </View>

        <View className="mt-4 items-center">
          <Text className="text-center text-xs leading-5 text-white/35">
            Your daily log is written into the same CREEDA individual engine as the web experience.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
