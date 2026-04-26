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
  Brain,
  CheckCircle2,
  HeartPulse,
  Moon,
  ShieldAlert,
  Zap,
} from 'lucide-react-native';

import {
  OnboardingV2DailyRitualSubmissionSchema,
  type OnboardingV2DailyRitualSubmission,
} from '../packages/schemas/src';
import { GlowingButtonNative } from '../src/components/neon/GlowingButtonNative';
import { NeonGlassCardNative } from '../src/components/neon/NeonGlassCardNative';
import { useMobileAuth } from '../src/lib/auth';
import {
  markOnboardingV2SubmissionFailed,
  markOnboardingV2SubmissionSynced,
  queueOnboardingV2DailyRitual,
} from '../src/lib/onboarding-v2/offline-store';
import { scheduleOnboardingV2DailyRitualReminder } from '../src/lib/onboarding-v2/reminders';
import {
  submitOnboardingV2DailyRitual,
  type OnboardingV2DailyRitualResponse,
} from '../src/lib/mobile-api';

const SCORE_OPTIONS = [1, 2, 3, 4, 5] as const;
const APSQ_OPTIONS = [0, 1, 2, 3, 4] as const;
const PAIN_LOCATIONS = ['Knee', 'Back', 'Shoulder', 'Hip', 'Ankle', 'Neck'] as const;

function todayInIndia() {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

function numberFrom(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function ScoreRow({
  label,
  value,
  lowLabel,
  highLabel,
  icon: Icon,
  onChange,
}: {
  label: string;
  value: number;
  lowLabel: string;
  highLabel: string;
  icon: typeof Zap;
  onChange: (value: number) => void;
}) {
  return (
    <NeonGlassCardNative className="gap-4">
      <View className="flex-row items-center gap-3">
        <View className="h-10 w-10 items-center justify-center rounded-2xl bg-[#6EE7B7]/10">
          <Icon color="#6EE7B7" size={20} />
        </View>
        <View>
          <Text className="text-base font-black text-white">{label}</Text>
          <Text className="mt-1 text-xs text-white/42">
            {lowLabel} to {highLabel}
          </Text>
        </View>
      </View>
      <View className="flex-row gap-2">
        {SCORE_OPTIONS.map((score) => (
          <Pressable
            key={score}
            onPress={() => onChange(score)}
            className={`h-12 flex-1 items-center justify-center rounded-2xl border ${
              value === score
                ? 'border-[#6EE7B7]/70 bg-[#6EE7B7]/15'
                : 'border-white/10 bg-white/[0.03]'
            }`}
          >
            <Text className={`text-base font-black ${value === score ? 'text-[#D1FAE5]' : 'text-white/58'}`}>
              {score}
            </Text>
          </Pressable>
        ))}
      </View>
    </NeonGlassCardNative>
  );
}

function NumberInput({
  label,
  value,
  onChangeText,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
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
        keyboardType="decimal-pad"
        placeholder={placeholder}
        placeholderTextColor="rgba(255,255,255,0.28)"
        className="min-h-12 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white"
      />
    </View>
  );
}

export default function DailyRitualScreen() {
  const router = useRouter();
  const { session, user, refreshUser } = useMobileAuth();
  const role = user?.profile.role;
  const persona = role === 'athlete' || role === 'individual' ? role : 'individual';
  const [energy, setEnergy] = useState(3);
  const [bodyFeel, setBodyFeel] = useState(3);
  const [mentalLoad, setMentalLoad] = useState(3);
  const [sleepHours, setSleepHours] = useState('');
  const [sleepQuality, setSleepQuality] = useState('');
  const [painLocations, setPainLocations] = useState<string[]>([]);
  const [painScore, setPainScore] = useState('');
  const [apsq3, setApsq3] = useState<[number, number, number]>([1, 1, 1]);
  const [wantsRecoveryDay, setWantsRecoveryDay] = useState(false);
  const [startedAt] = useState(() => Date.now());
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<OnboardingV2DailyRitualResponse | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const showSleep = energy <= 2;
  const showPain = bodyFeel <= 2;
  const showStress = mentalLoad >= 4;
  const today = useMemo(() => todayInIndia(), []);

  if (!session) return <Redirect href="/login" />;

  if (role === 'coach') {
    return (
      <View className="flex-1 items-center justify-center bg-background px-8">
        <Text className="text-center text-xl font-black tracking-tight text-white">
          Daily ritual is for athlete and individual accounts
        </Text>
        <Text className="mt-4 text-center text-sm leading-6 text-white/55">
          Coach command stays focused on squad visibility and follow-up.
        </Text>
      </View>
    );
  }

  function togglePainLocation(location: string) {
    setPainLocations((current) =>
      current.includes(location)
        ? current.filter((item) => item !== location)
        : [...current, location]
    );
  }

  function buildPayload(): OnboardingV2DailyRitualSubmission {
    const painValue = numberFrom(painScore);
    const painScores =
      showPain && painValue !== undefined
        ? Object.fromEntries(painLocations.map((location) => [location, painValue]))
        : {};

    return {
      phase: 3,
      persona,
      source: 'mobile',
      date: today,
      energy,
      body_feel: bodyFeel,
      mental_load: mentalLoad,
      sleep_hours_self: showSleep ? numberFrom(sleepHours) : undefined,
      sleep_quality_self: showSleep ? numberFrom(sleepQuality) : undefined,
      pain_locations: showPain ? painLocations : [],
      pain_scores: painScores,
      apsq3: showStress ? apsq3 : undefined,
      wants_recovery_day: wantsRecoveryDay,
      completion_seconds: Math.round((Date.now() - startedAt) / 1000),
    };
  }

  async function submitRitual() {
    if (!session || !user) return;
    const parsed = OnboardingV2DailyRitualSubmissionSchema.safeParse(buildPayload());
    if (!parsed.success) {
      setError('Complete the required daily ritual inputs.');
      setMessage(null);
      return;
    }

    setSubmitting(true);
    setError(null);
    setMessage(null);
    let queuedId = '';

    try {
      queuedId = await queueOnboardingV2DailyRitual(user.id, parsed.data);
      const response = await submitOnboardingV2DailyRitual(session.access_token, parsed.data);
      await markOnboardingV2SubmissionSynced(queuedId);
      await scheduleOnboardingV2DailyRitualReminder();
      setResult(response);
      await refreshUser();
    } catch (submitError) {
      const detail =
        submitError instanceof Error
          ? submitError.message
          : 'Saved offline. Sync will retry when the backend is reachable.';
      if (queuedId) {
        await markOnboardingV2SubmissionFailed(queuedId, detail);
      }
      setMessage('Saved offline first. Daily ritual will sync when the backend is reachable.');
      await scheduleOnboardingV2DailyRitualReminder();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerClassName="px-5 pb-10 pt-16"
    >
      <View className="flex-row items-center gap-2 rounded-full border border-[#6EE7B7]/20 bg-[#6EE7B7]/10 px-4 py-2 self-start">
        <CheckCircle2 color="#6EE7B7" size={16} />
        <Text className="text-[10px] font-black uppercase tracking-[0.24em] text-[#A7F3D0]">
          Phase 3 daily ritual
        </Text>
      </View>

      <Text className="mt-6 text-4xl font-black leading-tight text-white">
        Tell Creeda how today starts.
      </Text>
      <Text className="mt-3 text-sm leading-6 text-white/62">
        Three signals update readiness, confidence, and today's training guardrails.
      </Text>

      {result ? (
        <NeonGlassCardNative className="mt-6">
          <Text className="text-[10px] font-black uppercase tracking-[0.22em] text-[#38BDF8]">
            Readiness
          </Text>
          <Text className="mt-2 text-4xl font-black text-white">{result.readiness.score}</Text>
          <Text className="mt-3 text-sm leading-6 text-white/62">
            {result.readiness.directive}
          </Text>
          <Text className="mt-3 text-xs font-bold text-white/42">
            Confidence {result.confidence.pct}% - Calibration {result.profileCalibrationPct}%
          </Text>
        </NeonGlassCardNative>
      ) : null}

      <View className="mt-6 gap-4">
        <ScoreRow
          label="Energy"
          icon={Zap}
          value={energy}
          lowLabel="flat"
          highLabel="charged"
          onChange={setEnergy}
        />
        <ScoreRow
          label="Body feel"
          icon={HeartPulse}
          value={bodyFeel}
          lowLabel="heavy"
          highLabel="ready"
          onChange={setBodyFeel}
        />
        <ScoreRow
          label="Mental load"
          icon={Brain}
          value={mentalLoad}
          lowLabel="calm"
          highLabel="loaded"
          onChange={setMentalLoad}
        />
      </View>

      {showSleep ? (
        <NeonGlassCardNative className="mt-5 gap-4">
          <View className="flex-row items-center gap-3">
            <Moon color="#6EE7B7" size={20} />
            <Text className="text-sm font-black text-white">Sleep context</Text>
          </View>
          <NumberInput label="Sleep hours" value={sleepHours} onChangeText={setSleepHours} placeholder="7.5" />
          <NumberInput label="Sleep quality 1-10" value={sleepQuality} onChangeText={setSleepQuality} placeholder="7" />
        </NeonGlassCardNative>
      ) : null}

      {showPain ? (
        <NeonGlassCardNative className="mt-5 gap-4">
          <View className="flex-row items-center gap-3">
            <ShieldAlert color="#FDE68A" size={20} />
            <Text className="text-sm font-black text-white">Pain context</Text>
          </View>
          <View className="flex-row flex-wrap gap-2">
            {PAIN_LOCATIONS.map((location) => (
              <Pressable
                key={location}
                onPress={() => togglePainLocation(location)}
                className={`min-h-10 rounded-2xl border px-4 py-3 ${
                  painLocations.includes(location)
                    ? 'border-[#FDE68A]/60 bg-[#FDE68A]/12'
                    : 'border-white/10 bg-white/[0.03]'
                }`}
              >
                <Text className={`text-xs font-black ${painLocations.includes(location) ? 'text-[#FEF3C7]' : 'text-white/58'}`}>
                  {location}
                </Text>
              </Pressable>
            ))}
          </View>
          <NumberInput label="Pain score 0-10" value={painScore} onChangeText={setPainScore} placeholder="3" />
        </NeonGlassCardNative>
      ) : null}

      {showStress ? (
        <NeonGlassCardNative className="mt-5 gap-4">
          <Text className="text-sm font-black text-white">Stress pulse</Text>
          {['I feel tense', 'I feel mentally drained', 'I am struggling to switch off'].map(
            (label, index) => (
              <View key={label} className="gap-2">
                <Text className="text-xs font-bold text-white/55">{label}</Text>
                <View className="flex-row gap-2">
                  {APSQ_OPTIONS.map((score) => (
                    <Pressable
                      key={score}
                      onPress={() =>
                        setApsq3((current) => {
                          const next: [number, number, number] = [
                            current[0],
                            current[1],
                            current[2],
                          ];
                          next[index] = score;
                          return next;
                        })
                      }
                      className={`h-10 flex-1 items-center justify-center rounded-xl border ${
                        apsq3[index] === score
                          ? 'border-[#38BDF8]/70 bg-[#38BDF8]/15'
                          : 'border-white/10 bg-white/[0.03]'
                      }`}
                    >
                      <Text className={`text-sm font-black ${apsq3[index] === score ? 'text-[#BAE6FD]' : 'text-white/58'}`}>
                        {score}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )
          )}
        </NeonGlassCardNative>
      ) : null}

      <Pressable
        onPress={() => setWantsRecoveryDay((current) => !current)}
        className={`mt-5 rounded-2xl border px-4 py-4 ${
          wantsRecoveryDay
            ? 'border-[#6EE7B7]/60 bg-[#6EE7B7]/12'
            : 'border-white/10 bg-white/[0.03]'
        }`}
      >
        <Text className={`text-sm font-black ${wantsRecoveryDay ? 'text-[#D1FAE5]' : 'text-white/62'}`}>
          Bias today toward recovery
        </Text>
      </Pressable>

      {message ? <Text className="mt-4 text-sm leading-6 text-white/62">{message}</Text> : null}
      {error ? <Text className="mt-4 text-sm font-semibold text-[#FFB084]">{error}</Text> : null}

      <View className="mt-6 gap-3">
        {submitting ? (
          <View className="items-center py-4">
            <ActivityIndicator color="#6EE7B7" />
          </View>
        ) : (
          <>
            <GlowingButtonNative title="Save today" variant="chakra" onPress={submitRitual} />
            <Pressable
              onPress={() => router.replace('/(tabs)')}
              className="min-h-12 flex-row items-center justify-center gap-2"
            >
              <Text className="text-sm font-bold text-white/58">Open dashboard</Text>
              {result ? (
                <Activity color="rgba(255,255,255,0.58)" size={16} />
              ) : (
                <ArrowRight color="rgba(255,255,255,0.58)" size={16} />
              )}
            </Pressable>
          </>
        )}
      </View>
    </ScrollView>
  );
}
