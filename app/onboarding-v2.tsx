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
  OnboardingV2Phase1SubmissionSchema,
  OnboardingV2SafetyGateSubmissionSchema,
  type OnboardingV2Phase1Submission,
  type ParqPlus,
  type Persona,
} from '../packages/schemas/src';
import { GlowingButtonNative } from '../src/components/neon/GlowingButtonNative';
import { NeonGlassCardNative } from '../src/components/neon/NeonGlassCardNative';
import { useMobileAuth } from '../src/lib/auth';
import {
  markOnboardingV2SubmissionFailed,
  markOnboardingV2SubmissionSynced,
  queueOnboardingV2Phase1,
  queueOnboardingV2SafetyGate,
} from '../src/lib/onboarding-v2/offline-store';
import {
  submitOnboardingV2Phase1,
  submitOnboardingV2SafetyGate,
  type OnboardingV2Phase1Response,
} from '../src/lib/mobile-api';

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
    detail: 'Health, movement, sleep, and consistency guidance.',
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

const BODY_REGION_OPTIONS = [
  { value: 'lower_back', label: 'Lower back' },
  { value: 'left_shoulder', label: 'Left shoulder' },
  { value: 'right_shoulder', label: 'Right shoulder' },
  { value: 'left_knee_acl', label: 'Left knee' },
  { value: 'right_knee_acl', label: 'Right knee' },
  { value: 'left_ankle', label: 'Left ankle' },
  { value: 'right_ankle', label: 'Right ankle' },
  { value: 'left_hamstring', label: 'Left hamstring' },
  { value: 'right_hamstring', label: 'Right hamstring' },
  { value: 'groin', label: 'Groin' },
] as const;

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

type Step =
  | 'persona'
  | 'safety'
  | 'phase0Complete'
  | 'identity'
  | 'sport'
  | 'goal'
  | 'load'
  | 'ortho'
  | 'squad'
  | 'wearable'
  | 'phase1Complete';

type Phase1FormState = {
  identity: OnboardingV2Phase1Submission['identity'];
  sport: OnboardingV2Phase1Submission['sport'];
  goal: OnboardingV2Phase1Submission['goal'];
  training_load: NonNullable<OnboardingV2Phase1Submission['training_load']>;
  orthopedic_entry: OnboardingV2Phase1Submission['orthopedic_history'][number];
  has_orthopedic_history: boolean;
  wearable: OnboardingV2Phase1Submission['wearable'];
  squad: NonNullable<OnboardingV2Phase1Submission['squad']>;
};

const defaultPhase1: Phase1FormState = {
  identity: {
    display_name: 'Creeda Athlete',
    date_of_birth: '2005-01-01',
    biological_sex: 'prefer_not_to_say',
    gender_identity: '',
    height_cm: 175,
    weight_kg: 70,
    dominant_hand: 'right',
    dominant_leg: 'right',
  },
  sport: {
    primary_sport: 'Cricket',
    position: '',
    level: 'recreational',
  },
  goal: {
    primary_goal: 'sport_performance',
    goal_detail: '',
    target_event_name: '',
    target_event_date: undefined,
  },
  training_load: {
    weekly_sessions: 3,
    avg_session_minutes: 60,
    typical_rpe: 6,
    pattern_4_weeks: 'same',
  },
  orthopedic_entry: {
    body_region: 'lower_back',
    severity: 'annoying',
    occurred_at_estimate: '2025-01-01',
    currently_symptomatic: false,
    current_pain_score: 0,
    has_seen_clinician: false,
    clinician_type: 'none',
    notes: '',
  },
  has_orthopedic_history: false,
  wearable: {
    preference: 'later',
    provider: 'none',
  },
  squad: {
    name: 'First Squad',
    sport: 'Cricket',
    level: 'Academy',
    size_estimate: 12,
    primary_focus: 'in_season_maintenance',
  },
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function isPersona(value: unknown): value is Persona {
  return value === 'athlete' || value === 'individual' || value === 'coach';
}

function anyParqYes(parq: ParqPlus) {
  return PARQ_ITEMS.some((item) => Boolean(parq[item.key]));
}

function cleanOptional(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
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

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View className="gap-2">
      <Text className="text-[10px] font-black uppercase tracking-[0.22em] text-white/35">
        {label}
      </Text>
      {children}
    </View>
  );
}

function Input({
  value,
  onChangeText,
  keyboardType,
  placeholder,
}: {
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: 'default' | 'numeric';
  placeholder?: string;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      keyboardType={keyboardType}
      placeholder={placeholder}
      placeholderTextColor="rgba(255,255,255,0.28)"
      className="min-h-12 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-base text-white"
    />
  );
}

function SectionHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <View>
      <Text className="text-[10px] font-black uppercase tracking-[0.22em] text-[#6EE7B7]">
        {eyebrow}
      </Text>
      <Text className="mt-3 text-2xl font-black leading-tight text-white">{title}</Text>
    </View>
  );
}

export default function OnboardingV2Screen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ persona?: string | string[] }>();
  const { session, user, refreshUser } = useMobileAuth();
  const requestedPersona = firstParam(params.persona);
  const [persona, setPersona] = useState<Persona>(
    isPersona(requestedPersona) ? requestedPersona : user?.profile.role ?? 'individual'
  );
  const [step, setStep] = useState<Step>('persona');
  const [parq, setParq] = useState<ParqPlus>(defaultParq);
  const [phase1, setPhase1] = useState<Phase1FormState>(defaultPhase1);
  const [startedAt] = useState(() => Date.now());
  const [phase1StartedAt] = useState(() => Date.now());
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [calibrationPct, setCalibrationPct] = useState(0);
  const [phase1Result, setPhase1Result] = useState<OnboardingV2Phase1Response | null>(null);

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

  function updatePhase1<K extends keyof Phase1FormState>(key: K, value: Phase1FormState[K]) {
    setPhase1((current) => ({ ...current, [key]: value }));
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
      setStep('phase0Complete');
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
      setStep('phase0Complete');
    } finally {
      setSubmitting(false);
    }
  }

  function buildPhase1Payload(): OnboardingV2Phase1Submission {
    const targetEventName = cleanOptional(phase1.goal.target_event_name);
    const payload = {
      phase: 1,
      persona,
      source: 'mobile',
      identity: {
        ...phase1.identity,
        display_name: phase1.identity.display_name.trim(),
        gender_identity: cleanOptional(phase1.identity.gender_identity),
      },
      sport: {
        ...phase1.sport,
        primary_sport: phase1.sport.primary_sport.trim(),
        position: cleanOptional(phase1.sport.position),
      },
      goal: {
        ...phase1.goal,
        goal_detail: cleanOptional(phase1.goal.goal_detail),
        target_event_name: targetEventName,
        target_event_date: targetEventName ? phase1.goal.target_event_date : undefined,
      },
      training_load: persona === 'coach' ? undefined : phase1.training_load,
      orthopedic_history:
        persona === 'coach' || !phase1.has_orthopedic_history
          ? []
          : [
              {
                ...phase1.orthopedic_entry,
                current_pain_score: phase1.orthopedic_entry.currently_symptomatic
                  ? phase1.orthopedic_entry.current_pain_score
                  : undefined,
                clinician_type: phase1.orthopedic_entry.has_seen_clinician
                  ? phase1.orthopedic_entry.clinician_type
                  : 'none',
                notes: cleanOptional(phase1.orthopedic_entry.notes),
              },
            ],
      wearable: phase1.wearable,
      squad: persona === 'coach' ? phase1.squad : undefined,
      completion_seconds: Math.round((Date.now() - phase1StartedAt) / 1000),
    };

    return payload as OnboardingV2Phase1Submission;
  }

  async function submitPhase1() {
    if (!session || !user) return;

    setSubmitting(true);
    setError(null);
    setMessage(null);

    const parsed = OnboardingV2Phase1SubmissionSchema.safeParse(buildPhase1Payload());
    if (!parsed.success) {
      setSubmitting(false);
      setError('Please complete the required Phase 1 fields before finishing.');
      return;
    }

    let queuedId = '';
    try {
      queuedId = await queueOnboardingV2Phase1(user.id, parsed.data);
      const response = await submitOnboardingV2Phase1(session.access_token, parsed.data);
      await markOnboardingV2SubmissionSynced(queuedId);
      setPhase1Result(response);
      setCalibrationPct(response.profileCalibrationPct);
      await refreshUser();
      setStep('phase1Complete');
    } catch (submitError) {
      const detail =
        submitError instanceof Error
          ? submitError.message
          : 'Saved offline. Sync will retry when the backend is reachable.';
      if (queuedId) {
        await markOnboardingV2SubmissionFailed(queuedId, detail);
      }
      setCalibrationPct(persona === 'coach' ? 28 : 24);
      setMessage('Saved offline first. Phase 1 will sync when the backend is reachable.');
      setPhase1Result(null);
      setStep('phase1Complete');
    } finally {
      setSubmitting(false);
    }
  }

  const Icon = selectedPersona.icon;
  const modifiedModeActive = anyParqYes(parq);

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerClassName="px-5 pb-10 pt-16"
    >
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
          <SectionHeader eyebrow="Pick your route" title="Same engine. Different experience." />
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
              <SectionHeader eyebrow="Phase 0 Safety Gate" title="Seven quick safety checks." />
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
              <Field label="Optional context">
                <TextInput
                  multiline
                  value={parq.q7_other_reason_text ?? ''}
                  onChangeText={(text) =>
                    setParq((current) => ({ ...current, q7_other_reason_text: text.slice(0, 200) }))
                  }
                  placeholder="A short note for your own record."
                  placeholderTextColor="rgba(255,255,255,0.28)"
                  className="min-h-24 rounded-3xl border border-white/10 bg-white/[0.03] px-4 py-4 text-base text-white"
                />
              </Field>
            </View>
          ) : null}

          <View className="mt-5 rounded-3xl border border-white/10 bg-white/[0.03] p-4">
            <Field label="Pregnancy or cycle context">
              <View className="flex-row flex-wrap gap-2">
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
            </Field>
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

      {step === 'phase0Complete' ? (
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
            onPress={() => setStep('identity')}
            className="mt-6 min-h-14 flex-row items-center justify-center gap-2 rounded-2xl bg-[#6EE7B7] px-5"
          >
            <Text className="text-sm font-black text-slate-950">Continue to Phase 1</Text>
            <ArrowRight color="#020617" size={18} />
          </Pressable>
        </NeonGlassCardNative>
      ) : null}

      {step === 'identity' ? (
        <NeonGlassCardNative className="mt-5">
          <SectionHeader eyebrow="Phase 1 Identity" title="Profile basics." />
          <View className="mt-5 gap-4">
            <Field label="Display name">
              <Input
                value={phase1.identity.display_name}
                onChangeText={(text) => updatePhase1('identity', { ...phase1.identity, display_name: text })}
              />
            </Field>
            <Field label="Date of birth">
              <Input
                value={phase1.identity.date_of_birth}
                onChangeText={(text) => updatePhase1('identity', { ...phase1.identity, date_of_birth: text })}
                placeholder="YYYY-MM-DD"
              />
            </Field>
            <Field label="Biological sex">
              <View className="flex-row flex-wrap gap-2">
                {(['prefer_not_to_say', 'male', 'female', 'intersex'] as const).map((value) => (
                  <ChoiceButton
                    key={value}
                    active={phase1.identity.biological_sex === value}
                    label={value.replaceAll('_', ' ')}
                    onPress={() => updatePhase1('identity', { ...phase1.identity, biological_sex: value })}
                  />
                ))}
              </View>
            </Field>
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Field label="Height cm">
                  <Input
                    keyboardType="numeric"
                    value={String(phase1.identity.height_cm)}
                    onChangeText={(text) =>
                      updatePhase1('identity', { ...phase1.identity, height_cm: Number(text) || 0 })
                    }
                  />
                </Field>
              </View>
              <View className="flex-1">
                <Field label="Weight kg">
                  <Input
                    keyboardType="numeric"
                    value={String(phase1.identity.weight_kg)}
                    onChangeText={(text) =>
                      updatePhase1('identity', { ...phase1.identity, weight_kg: Number(text) || 0 })
                    }
                  />
                </Field>
              </View>
            </View>
            <Field label="Dominant side">
              <View className="flex-row flex-wrap gap-2">
                {(['left', 'right', 'ambidextrous'] as const).map((value) => (
                  <ChoiceButton
                    key={value}
                    active={phase1.identity.dominant_hand === value && phase1.identity.dominant_leg === value}
                    label={value}
                    onPress={() =>
                      updatePhase1('identity', {
                        ...phase1.identity,
                        dominant_hand: value,
                        dominant_leg: value,
                      })
                    }
                  />
                ))}
              </View>
            </Field>
          </View>
          <View className="mt-6 gap-3">
            <GlowingButtonNative title="Continue" variant="chakra" onPress={() => setStep('sport')} />
            <Pressable onPress={() => setStep('phase0Complete')} className="items-center py-3">
              <Text className="text-sm font-bold text-white/58">Back</Text>
            </Pressable>
          </View>
        </NeonGlassCardNative>
      ) : null}

      {step === 'sport' ? (
        <NeonGlassCardNative className="mt-5">
          <SectionHeader eyebrow="Sport Context" title="Specificity before scoring." />
          <View className="mt-5 gap-4">
            <Field label={persona === 'coach' ? 'Squad sport' : 'Primary sport or activity'}>
              <Input
                value={phase1.sport.primary_sport}
                onChangeText={(text) => updatePhase1('sport', { ...phase1.sport, primary_sport: text })}
              />
            </Field>
            <Field label="Position or focus">
              <Input
                value={phase1.sport.position ?? ''}
                onChangeText={(text) => updatePhase1('sport', { ...phase1.sport, position: text })}
                placeholder="Optional"
              />
            </Field>
            <Field label="Current level">
              <View className="flex-row flex-wrap gap-2">
                {(['starter', 'recreational', 'competitive', 'academy', 'elite'] as const).map((value) => (
                  <ChoiceButton
                    key={value}
                    active={phase1.sport.level === value}
                    label={value}
                    onPress={() => updatePhase1('sport', { ...phase1.sport, level: value })}
                  />
                ))}
              </View>
            </Field>
          </View>
          <View className="mt-6 gap-3">
            <GlowingButtonNative title="Continue" variant="chakra" onPress={() => setStep('goal')} />
            <Pressable onPress={() => setStep('identity')} className="items-center py-3">
              <Text className="text-sm font-bold text-white/58">Back</Text>
            </Pressable>
          </View>
        </NeonGlassCardNative>
      ) : null}

      {step === 'goal' ? (
        <NeonGlassCardNative className="mt-5">
          <SectionHeader eyebrow="Goal Anchor" title="What should Creeda bias toward?" />
          <View className="mt-5 gap-4">
            <Field label="Primary goal">
              <View className="flex-row flex-wrap gap-2">
                {(['general_fitness', 'sport_performance', 'strength_gain', 'fat_loss', 'return_to_play', 'event_prep', 'movement_quality'] as const).map(
                  (value) => (
                    <ChoiceButton
                      key={value}
                      active={phase1.goal.primary_goal === value}
                      label={value.replaceAll('_', ' ')}
                      onPress={() => updatePhase1('goal', { ...phase1.goal, primary_goal: value })}
                    />
                  )
                )}
              </View>
            </Field>
            <Field label="Goal detail">
              <Input
                value={phase1.goal.goal_detail ?? ''}
                onChangeText={(text) => updatePhase1('goal', { ...phase1.goal, goal_detail: text })}
                placeholder="Optional"
              />
            </Field>
            <Field label="Target event">
              <Input
                value={phase1.goal.target_event_name ?? ''}
                onChangeText={(text) => updatePhase1('goal', { ...phase1.goal, target_event_name: text })}
                placeholder="Optional"
              />
            </Field>
          </View>
          <View className="mt-6 gap-3">
            <GlowingButtonNative
              title="Continue"
              variant="chakra"
              onPress={() => setStep(persona === 'coach' ? 'squad' : 'load')}
            />
            <Pressable onPress={() => setStep('sport')} className="items-center py-3">
              <Text className="text-sm font-bold text-white/58">Back</Text>
            </Pressable>
          </View>
        </NeonGlassCardNative>
      ) : null}

      {step === 'load' ? (
        <NeonGlassCardNative className="mt-5">
          <SectionHeader eyebrow="Load Snapshot" title="Four-week training reality." />
          <View className="mt-5 gap-4">
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Field label="Weekly sessions">
                  <Input
                    keyboardType="numeric"
                    value={String(phase1.training_load.weekly_sessions)}
                    onChangeText={(text) =>
                      updatePhase1('training_load', {
                        ...phase1.training_load,
                        weekly_sessions: Number(text) || 0,
                      })
                    }
                  />
                </Field>
              </View>
              <View className="flex-1">
                <Field label="Typical RPE">
                  <Input
                    keyboardType="numeric"
                    value={String(phase1.training_load.typical_rpe)}
                    onChangeText={(text) =>
                      updatePhase1('training_load', {
                        ...phase1.training_load,
                        typical_rpe: Number(text) || 0,
                      })
                    }
                  />
                </Field>
              </View>
            </View>
            <Field label="Average session minutes">
              <View className="flex-row flex-wrap gap-2">
                {([30, 45, 60, 90, 120] as const).map((minutes) => (
                  <ChoiceButton
                    key={minutes}
                    active={phase1.training_load.avg_session_minutes === minutes}
                    label={`${minutes} min`}
                    onPress={() =>
                      updatePhase1('training_load', {
                        ...phase1.training_load,
                        avg_session_minutes: minutes,
                      })
                    }
                  />
                ))}
              </View>
            </Field>
            <Field label="Last four weeks">
              <View className="flex-row flex-wrap gap-2">
                {(['same', 'more_now', 'less_now', 'returning_from_break'] as const).map((value) => (
                  <ChoiceButton
                    key={value}
                    active={phase1.training_load.pattern_4_weeks === value}
                    label={value.replaceAll('_', ' ')}
                    onPress={() =>
                      updatePhase1('training_load', {
                        ...phase1.training_load,
                        pattern_4_weeks: value,
                      })
                    }
                  />
                ))}
              </View>
            </Field>
          </View>
          <View className="mt-6 gap-3">
            <GlowingButtonNative title="Continue" variant="chakra" onPress={() => setStep('ortho')} />
            <Pressable onPress={() => setStep('goal')} className="items-center py-3">
              <Text className="text-sm font-bold text-white/58">Back</Text>
            </Pressable>
          </View>
        </NeonGlassCardNative>
      ) : null}

      {step === 'ortho' ? (
        <NeonGlassCardNative className="mt-5">
          <SectionHeader eyebrow="Orthopedic History" title="Pain and injury context." />
          <View className="mt-5 flex-row flex-wrap gap-2">
            <ChoiceButton
              active={!phase1.has_orthopedic_history}
              label="Nothing to report"
              onPress={() => updatePhase1('has_orthopedic_history', false)}
            />
            <ChoiceButton
              active={phase1.has_orthopedic_history}
              label="Add one area"
              onPress={() => updatePhase1('has_orthopedic_history', true)}
            />
          </View>
          {phase1.has_orthopedic_history ? (
            <View className="mt-5 gap-4">
              <Field label="Body region">
                <View className="flex-row flex-wrap gap-2">
                  {BODY_REGION_OPTIONS.map((region) => (
                    <ChoiceButton
                      key={region.value}
                      active={phase1.orthopedic_entry.body_region === region.value}
                      label={region.label}
                      onPress={() =>
                        updatePhase1('orthopedic_entry', {
                          ...phase1.orthopedic_entry,
                          body_region: region.value,
                        })
                      }
                    />
                  ))}
                </View>
              </Field>
              <Field label="Current pain score">
                <Input
                  keyboardType="numeric"
                  value={String(phase1.orthopedic_entry.current_pain_score ?? 0)}
                  onChangeText={(text) =>
                    updatePhase1('orthopedic_entry', {
                      ...phase1.orthopedic_entry,
                      current_pain_score: Number(text) || 0,
                      currently_symptomatic: (Number(text) || 0) > 0,
                    })
                  }
                />
              </Field>
              <Field label="When it happened">
                <Input
                  value={phase1.orthopedic_entry.occurred_at_estimate}
                  onChangeText={(text) =>
                    updatePhase1('orthopedic_entry', {
                      ...phase1.orthopedic_entry,
                      occurred_at_estimate: text,
                    })
                  }
                  placeholder="YYYY-MM-DD"
                />
              </Field>
              <Field label="Clinician seen">
                <View className="flex-row flex-wrap gap-2">
                  <ChoiceButton
                    active={!phase1.orthopedic_entry.has_seen_clinician}
                    label="No"
                    onPress={() =>
                      updatePhase1('orthopedic_entry', {
                        ...phase1.orthopedic_entry,
                        has_seen_clinician: false,
                        clinician_type: 'none',
                      })
                    }
                  />
                  <ChoiceButton
                    active={phase1.orthopedic_entry.has_seen_clinician}
                    label="Yes"
                    onPress={() =>
                      updatePhase1('orthopedic_entry', {
                        ...phase1.orthopedic_entry,
                        has_seen_clinician: true,
                        clinician_type: 'physio',
                      })
                    }
                  />
                </View>
              </Field>
            </View>
          ) : null}
          <View className="mt-6 gap-3">
            <GlowingButtonNative title="Continue" variant="chakra" onPress={() => setStep('wearable')} />
            <Pressable onPress={() => setStep('load')} className="items-center py-3">
              <Text className="text-sm font-bold text-white/58">Back</Text>
            </Pressable>
          </View>
        </NeonGlassCardNative>
      ) : null}

      {step === 'squad' ? (
        <NeonGlassCardNative className="mt-5">
          <SectionHeader eyebrow="Squad Setup" title="Create the first coach workspace." />
          <View className="mt-5 gap-4">
            <Field label="Squad name">
              <Input
                value={phase1.squad.name}
                onChangeText={(text) => updatePhase1('squad', { ...phase1.squad, name: text })}
              />
            </Field>
            <Field label="Sport">
              <Input
                value={phase1.squad.sport}
                onChangeText={(text) => updatePhase1('squad', { ...phase1.squad, sport: text })}
              />
            </Field>
            <Field label="Level">
              <Input
                value={phase1.squad.level}
                onChangeText={(text) => updatePhase1('squad', { ...phase1.squad, level: text })}
              />
            </Field>
            <Field label="Athlete count">
              <Input
                keyboardType="numeric"
                value={String(phase1.squad.size_estimate ?? 0)}
                onChangeText={(text) =>
                  updatePhase1('squad', { ...phase1.squad, size_estimate: Number(text) || 0 })
                }
              />
            </Field>
          </View>
          <View className="mt-6 gap-3">
            <GlowingButtonNative title="Continue" variant="chakra" onPress={() => setStep('wearable')} />
            <Pressable onPress={() => setStep('goal')} className="items-center py-3">
              <Text className="text-sm font-bold text-white/58">Back</Text>
            </Pressable>
          </View>
        </NeonGlassCardNative>
      ) : null}

      {step === 'wearable' ? (
        <NeonGlassCardNative className="mt-5">
          <SectionHeader eyebrow="Wearable Preference" title="Objective data path." />
          <View className="mt-5 gap-4">
            <Field label="Preference">
              <View className="flex-row flex-wrap gap-2">
                <ChoiceButton
                  active={phase1.wearable.preference === 'connect_now'}
                  label="Connect now"
                  onPress={() =>
                    updatePhase1('wearable', {
                      preference: 'connect_now',
                      provider:
                        phase1.wearable.provider === 'none'
                          ? 'android_health_connect'
                          : phase1.wearable.provider,
                    })
                  }
                />
                <ChoiceButton
                  active={phase1.wearable.preference === 'later'}
                  label="Later"
                  onPress={() => updatePhase1('wearable', { preference: 'later', provider: 'none' })}
                />
              </View>
            </Field>
            <Field label="Provider">
              <View className="flex-row flex-wrap gap-2">
                {(['none', 'android_health_connect', 'apple_health', 'fitbit', 'garmin'] as const).map((provider) => (
                  <ChoiceButton
                    key={provider}
                    active={phase1.wearable.provider === provider}
                    label={provider.replaceAll('_', ' ')}
                    onPress={() =>
                      updatePhase1('wearable', {
                        provider,
                        preference: provider === 'none' ? 'later' : 'connect_now',
                      })
                    }
                  />
                ))}
              </View>
            </Field>
          </View>
          {error ? <Text className="mt-4 text-sm font-semibold text-[#FFB084]">{error}</Text> : null}
          <View className="mt-6 gap-3">
            {submitting ? (
              <View className="items-center py-4">
                <ActivityIndicator color="#6EE7B7" />
              </View>
            ) : (
              <>
                <GlowingButtonNative title="Finish Phase 1" variant="chakra" onPress={submitPhase1} />
                <Pressable
                  onPress={() => setStep(persona === 'coach' ? 'squad' : 'ortho')}
                  className="items-center py-3"
                >
                  <Text className="text-sm font-bold text-white/58">Back</Text>
                </Pressable>
              </>
            )}
          </View>
        </NeonGlassCardNative>
      ) : null}

      {step === 'phase1Complete' ? (
        <NeonGlassCardNative className="mt-5">
          <View className="h-16 w-16 items-center justify-center rounded-3xl bg-[#6EE7B7]/10">
            <CheckCircle2 color="#6EE7B7" size={34} />
          </View>
          <Text className="mt-6 text-[10px] font-black uppercase tracking-[0.22em] text-[#6EE7B7]">
            Phase 1 complete
          </Text>
          <Text className="mt-3 text-3xl font-black leading-tight text-white">
            Calibration is now {calibrationPct}%.
          </Text>
          {phase1Result?.readiness ? (
            <Text className="mt-3 text-sm leading-6 text-white/62">
              Provisional readiness is {phase1Result.readiness.score}/100. {phase1Result.readiness.directive}
            </Text>
          ) : null}
          {message ? <Text className="mt-3 text-sm leading-6 text-white/62">{message}</Text> : null}
          <Pressable
            onPress={() => router.replace('/(tabs)')}
            className="mt-6 min-h-14 flex-row items-center justify-center gap-2 rounded-2xl bg-[#6EE7B7] px-5"
          >
            <Text className="text-sm font-black text-slate-950">Open dashboard</Text>
            <ArrowRight color="#020617" size={18} />
          </Pressable>
        </NeonGlassCardNative>
      ) : null}
    </ScrollView>
  );
}
