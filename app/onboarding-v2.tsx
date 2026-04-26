import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowRight,
  CheckCircle2,
  Dumbbell,
  HeartPulse,
  ShieldCheck,
  TriangleAlert,
  UserRound,
  Users,
} from 'lucide-react-native';

import { computeConfidence } from '../packages/engine/src';
import {
  OnboardingV2SafetyGateSubmissionSchema,
  type ParqPlus,
  type Persona,
} from '../packages/schemas/src';
import { GlowingButtonNative } from '../src/components/neon/GlowingButtonNative';
import { NeonGlassCardNative } from '../src/components/neon/NeonGlassCardNative';
import { useMobileAuth } from '../src/lib/auth';
import {
  markOnboardingV2SubmissionFailed,
  markOnboardingV2SubmissionSynced,
  queueOnboardingV2SafetyGate,
} from '../src/lib/onboarding-v2/offline-store';
import { submitOnboardingV2SafetyGate } from '../src/lib/mobile-api';

const PERSONA_OPTIONS: Array<{
  id: Persona;
  title: string;
  detail: string;
  metric: string;
  icon: typeof Dumbbell;
}> = [
  {
    id: 'athlete',
    title: 'Athlete',
    detail: 'Performance, load, recovery, and sport-specific decision support.',
    metric: 'Performance mode',
    icon: Dumbbell,
  },
  {
    id: 'individual',
    title: 'Individual',
    detail: 'Plain-language health, movement, sleep, and consistency guidance.',
    metric: 'Health mode',
    icon: UserRound,
  },
  {
    id: 'coach',
    title: 'Coach',
    detail: 'Squad triage, compliance, readiness, and athlete drill-down.',
    metric: 'Triage mode',
    icon: Users,
  },
];

const PARQ_ITEMS: Array<{
  key: keyof Pick<
    ParqPlus,
    | 'q1_heart_condition'
    | 'q2_chest_pain_activity'
    | 'q3_chest_pain_rest'
    | 'q4_dizziness_loc'
    | 'q5_bone_joint_problem'
    | 'q6_bp_heart_meds'
    | 'q7_other_reason'
  >;
  label: string;
}> = [
  { key: 'q1_heart_condition', label: 'A doctor has said you have a heart condition.' },
  { key: 'q2_chest_pain_activity', label: 'You feel chest pain during physical activity.' },
  { key: 'q3_chest_pain_rest', label: 'You have had chest pain while resting.' },
  { key: 'q4_dizziness_loc', label: 'You lose balance from dizziness or have lost consciousness.' },
  { key: 'q5_bone_joint_problem', label: 'You have a bone or joint issue that could worsen with activity.' },
  { key: 'q6_bp_heart_meds', label: 'A doctor currently prescribes blood pressure or heart medication.' },
  { key: 'q7_other_reason', label: 'You know another reason you should not do physical activity.' },
];

const defaultParq: ParqPlus = {
  q1_heart_condition: false,
  q2_chest_pain_activity: false,
  q3_chest_pain_rest: false,
  q4_dizziness_loc: false,
  q5_bone_joint_problem: false,
  q6_bp_heart_meds: false,
  q7_other_reason: false,
  q7_other_reason_text: '',
  pregnancy_status: 'not_applicable',
  cycle_tracking_optin: false,
};

type Step = 'persona' | 'safety' | 'complete';

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function isPersona(value: unknown): value is Persona {
  return value === 'athlete' || value === 'individual' || value === 'coach';
}

function anyParqYes(parq: ParqPlus) {
  return PARQ_ITEMS.some((item) => Boolean(parq[item.key]));
}

function legacyOnboardingRoute(persona: Persona) {
  if (persona === 'athlete') return '/athlete-onboarding';
  if (persona === 'coach') return '/coach-onboarding';
  return '/fitstart';
}

function ChoiceButton({
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

export default function OnboardingV2Screen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    persona?: string | string[];
    coach?: string | string[];
    invite?: string | string[];
  }>();
  const { session, user, refreshUser } = useMobileAuth();
  const requestedPersona = firstParam(params.persona);
  const coachLockerCode = firstParam(params.coach);
  const inviteToken = firstParam(params.invite);
  const [persona, setPersona] = useState<Persona>(
    isPersona(requestedPersona) ? requestedPersona : user?.profile.role ?? 'individual'
  );
  const [step, setStep] = useState<Step>('persona');
  const [parq, setParq] = useState<ParqPlus>(defaultParq);
  const [startedAt] = useState(() => Date.now());
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [calibrationPct, setCalibrationPct] = useState(0);

  const selectedPersona = useMemo(
    () => PERSONA_OPTIONS.find((option) => option.id === persona) ?? PERSONA_OPTIONS[1],
    [persona]
  );
  const confidence = computeConfidence({
    daysSinceOnboarding: 0,
    dataPointsCollected: anyParqYes(parq) ? 9 : 8,
    hasWearable: false,
    movementScansCount: 0,
    capacityTestsCompleted: 0,
    daysOfChronicLoad: 0,
    daysOfCheckIns: 0,
  });

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

  async function submitSafetyGate() {
    if (!session || !user) return;

    setSubmitting(true);
    setError(null);
    setMessage(null);

    const parsed = OnboardingV2SafetyGateSubmissionSchema.safeParse({
      persona,
      source: 'mobile',
      parq,
      completion_seconds: Math.round((Date.now() - startedAt) / 1000),
    });

    if (!parsed.success) {
      setSubmitting(false);
      setError('Please complete the safety gate before continuing.');
      return;
    }

    let queuedId = '';
    try {
      queuedId = await queueOnboardingV2SafetyGate(user.id, parsed.data);
      const response = await submitOnboardingV2SafetyGate(session.access_token, parsed.data);
      await markOnboardingV2SubmissionSynced(queuedId);
      setCalibrationPct(response.profileCalibrationPct);
      setMessage(
        response.modifiedModeActive
          ? 'Saved. Modified mode is active until more data or clearance improves confidence.'
          : 'Saved. Your first confidence tier is low while calibration starts.'
      );
      await refreshUser();
      setStep('complete');
    } catch (submitError) {
      const detail =
        submitError instanceof Error
          ? submitError.message
          : 'Saved offline. Sync will retry when the backend is reachable.';
      if (queuedId) {
        await markOnboardingV2SubmissionFailed(queuedId, detail);
      }
      setCalibrationPct(anyParqYes(parq) ? 8 : 12);
      setMessage('Saved offline first. We will sync this safety gate when the backend is reachable.');
      setStep('complete');
    } finally {
      setSubmitting(false);
    }
  }

  function continueToPhaseOne() {
    const baseRoute = legacyOnboardingRoute(persona);
    if (persona === 'athlete' && (coachLockerCode || inviteToken)) {
      router.replace({
        pathname: baseRoute,
        params: {
          ...(coachLockerCode ? { coach: coachLockerCode } : {}),
          ...(inviteToken ? { invite: inviteToken } : {}),
        },
      });
      return;
    }

    router.replace(baseRoute);
  }

  const Icon = selectedPersona.icon;
  const modifiedModeActive = anyParqYes(parq);

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="px-5 pb-10 pt-16">
      <View className="mb-6">
        <View className="self-start flex-row items-center gap-2 rounded-full border border-[#6EE7B7]/25 bg-[#6EE7B7]/10 px-3 py-2">
          <ShieldCheck color="#6EE7B7" size={16} />
          <Text className="text-[10px] font-black uppercase tracking-[0.22em] text-[#A7F3D0]">
            Onboarding v2
          </Text>
        </View>
        <Text className="mt-5 text-4xl font-black leading-tight text-white">
          Build confidence before we score you.
        </Text>
        <Text className="mt-3 text-sm leading-6 text-white/58">
          Persona routing, visible calibration, and a safety-first starting mode.
        </Text>
      </View>

      <NeonGlassCardNative>
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-[10px] font-black uppercase tracking-[0.22em] text-white/35">
              Profile calibration
            </Text>
            <Text className="mt-2 text-3xl font-black text-white">{calibrationPct}%</Text>
          </View>
          <View className="h-14 w-14 items-center justify-center rounded-2xl bg-[#6EE7B7]/10">
            <HeartPulse color="#6EE7B7" size={28} />
          </View>
        </View>
        <View className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
          <View className="h-full rounded-full bg-[#6EE7B7]" style={{ width: `${calibrationPct}%` }} />
        </View>
        <Text className="mt-3 text-xs leading-5 text-white/45">
          First-day readiness stays {confidence.tier}-confidence until measured context arrives.
        </Text>
      </NeonGlassCardNative>

      {step === 'persona' ? (
        <NeonGlassCardNative className="mt-5">
          <Text className="text-[10px] font-black uppercase tracking-[0.22em] text-[#6EE7B7]">
            Pick your route
          </Text>
          <Text className="mt-3 text-2xl font-black text-white">Same engine. Different experience.</Text>
          <View className="mt-5 gap-3">
            {PERSONA_OPTIONS.map((option) => {
              const OptionIcon = option.icon;
              const active = persona === option.id;
              return (
                <Pressable
                  key={option.id}
                  onPress={() => setPersona(option.id)}
                  className={`rounded-3xl border p-4 ${
                    active ? 'border-[#6EE7B7]/60 bg-[#6EE7B7]/10' : 'border-white/10 bg-white/[0.03]'
                  }`}
                >
                  <View className="flex-row gap-4">
                    <View className="h-12 w-12 items-center justify-center rounded-2xl bg-white/8">
                      <OptionIcon color="#6EE7B7" size={24} />
                    </View>
                    <View className="flex-1">
                      <Text className="text-lg font-black text-white">{option.title}</Text>
                      <Text className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/35">
                        {option.metric}
                      </Text>
                      <Text className="mt-2 text-sm leading-6 text-white/58">{option.detail}</Text>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
          <View className="mt-6">
            <GlowingButtonNative
              title={`Continue with ${selectedPersona.title}`}
              variant="chakra"
              onPress={() => setStep('safety')}
            />
          </View>
        </NeonGlassCardNative>
      ) : null}

      {step === 'safety' ? (
        <NeonGlassCardNative className="mt-5">
          <View className="flex-row items-center justify-between gap-3">
            <View className="flex-1">
              <Text className="text-[10px] font-black uppercase tracking-[0.22em] text-[#6EE7B7]">
                Phase 0 Safety Gate
              </Text>
              <Text className="mt-3 text-2xl font-black text-white">Seven quick safety checks.</Text>
            </View>
            <View className="h-12 w-12 items-center justify-center rounded-2xl bg-white/8">
              <Icon color="#6EE7B7" size={24} />
            </View>
          </View>
          <Text className="mt-3 text-sm leading-6 text-white/58">
            This does not diagnose anything. It only decides whether Creeda starts in modified mode.
          </Text>

          <View className="mt-5 gap-3">
            {PARQ_ITEMS.map((item) => (
              <View key={item.key} className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
                <Text className="text-sm font-semibold leading-6 text-white/78">{item.label}</Text>
                <View className="mt-3 flex-row gap-2">
                  <ChoiceButton
                    active={!parq[item.key]}
                    label="No"
                    onPress={() => setParq((current) => ({ ...current, [item.key]: false }))}
                  />
                  <ChoiceButton
                    active={Boolean(parq[item.key])}
                    label="Yes"
                    onPress={() => setParq((current) => ({ ...current, [item.key]: true }))}
                  />
                </View>
              </View>
            ))}
          </View>

          {parq.q7_other_reason ? (
            <View className="mt-5">
              <Text className="text-[10px] font-black uppercase tracking-[0.22em] text-white/35">
                Optional context
              </Text>
              <TextInput
                multiline
                value={parq.q7_other_reason_text ?? ''}
                onChangeText={(text) =>
                  setParq((current) => ({ ...current, q7_other_reason_text: text.slice(0, 200) }))
                }
                placeholder="A short note for your own record."
                placeholderTextColor="rgba(255,255,255,0.28)"
                className="mt-3 min-h-24 rounded-3xl border border-white/10 bg-white/[0.03] px-4 py-4 text-base text-white"
              />
            </View>
          ) : null}

          <View className="mt-5 rounded-3xl border border-white/10 bg-white/[0.03] p-4">
            <Text className="text-[10px] font-black uppercase tracking-[0.22em] text-white/35">
              Pregnancy or cycle context
            </Text>
            <View className="mt-3 flex-row flex-wrap gap-2">
              {(['not_applicable', 'no', 'pregnant', 'trying_to_conceive', 'postpartum'] as const).map(
                (status) => (
                  <ChoiceButton
                    key={status}
                    active={parq.pregnancy_status === status}
                    label={status.replaceAll('_', ' ')}
                    onPress={() => setParq((current) => ({ ...current, pregnancy_status: status }))}
                  />
                )
              )}
            </View>
            <Pressable
              onPress={() =>
                setParq((current) => ({
                  ...current,
                  cycle_tracking_optin: !current.cycle_tracking_optin,
                }))
              }
              className="mt-4 flex-row items-start gap-3"
            >
              <View
                className={`mt-1 h-5 w-5 rounded-md border ${
                  parq.cycle_tracking_optin ? 'border-[#6EE7B7] bg-[#6EE7B7]' : 'border-white/20'
                }`}
              />
              <Text className="flex-1 text-sm leading-6 text-white/62">
                Use cycle context to adjust future readiness confidence.
              </Text>
            </Pressable>
          </View>

          <View
            className={`mt-5 rounded-3xl border p-4 ${
              modifiedModeActive ? 'border-[#FBBF24]/30 bg-[#FBBF24]/10' : 'border-[#6EE7B7]/25 bg-[#6EE7B7]/10'
            }`}
          >
            <View className="flex-row gap-3">
              {modifiedModeActive ? (
                <TriangleAlert color="#FDE68A" size={22} />
              ) : (
                <CheckCircle2 color="#6EE7B7" size={22} />
              )}
              <Text className={`flex-1 text-sm leading-6 ${modifiedModeActive ? 'text-[#FEF3C7]' : 'text-[#D1FAE5]'}`}>
                {modifiedModeActive
                  ? 'Modified mode will keep recommendations conservative until clearance and more data improve confidence.'
                  : 'No safety flag selected. Confidence still starts low until measured context builds.'}
              </Text>
            </View>
          </View>

          {error ? <Text className="mt-4 text-sm font-semibold text-[#FFB084]">{error}</Text> : null}

          <View className="mt-6 gap-3">
            {submitting ? (
              <View className="items-center py-4">
                <ActivityIndicator color="#6EE7B7" />
              </View>
            ) : (
              <>
                <GlowingButtonNative title="Save safety gate" variant="chakra" onPress={submitSafetyGate} />
                <Pressable onPress={() => setStep('persona')} className="items-center py-3">
                  <Text className="text-sm font-bold text-white/58">Back to persona</Text>
                </Pressable>
              </>
            )}
          </View>
        </NeonGlassCardNative>
      ) : null}

      {step === 'complete' ? (
        <NeonGlassCardNative className="mt-5">
          <View className="h-16 w-16 items-center justify-center rounded-3xl bg-[#6EE7B7]/10">
            <CheckCircle2 color="#6EE7B7" size={34} />
          </View>
          <Text className="mt-6 text-[10px] font-black uppercase tracking-[0.22em] text-[#6EE7B7]">
            Phase 0 complete
          </Text>
          <Text className="mt-3 text-3xl font-black leading-tight text-white">
            Your first confidence tier is {confidence.tier}.
          </Text>
          {message ? <Text className="mt-3 text-sm leading-6 text-white/62">{message}</Text> : null}
          <Pressable
            onPress={continueToPhaseOne}
            className="mt-6 min-h-14 flex-row items-center justify-center gap-2 rounded-2xl bg-[#6EE7B7] px-5"
          >
            <Text className="text-sm font-black text-slate-950">Continue to Phase 1</Text>
            <ArrowRight color="#020617" size={18} />
          </Pressable>
        </NeonGlassCardNative>
      ) : null}
    </ScrollView>
  );
}
