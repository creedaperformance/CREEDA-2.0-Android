import { useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  Text,
  TextInput,
  View,
} from 'react-native'
import { Redirect, useRouter } from 'expo-router'
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  ClipboardList,
  Mail,
  Phone,
  ShieldCheck,
  Users,
} from 'lucide-react-native'

import { GlowingButtonNative } from '../src/components/neon/GlowingButtonNative'
import { ProfileAvatarNative } from '../src/components/profile/ProfileAvatarNative'
import {
  ReviewEmptyState,
  ReviewSurfaceCard,
  ReviewTonePill,
} from '../src/components/review/ReviewPrimitives'
import { useMobileAuth } from '../src/lib/auth'
import {
  fetchCoachAcademy,
  markCoachGuardianHandoffSent,
  updateCoachAcademyTeam,
  type CoachAcademyAgeBand,
  type CoachAcademySnapshot,
  type CoachAcademyTeam,
  type CoachAcademyType,
} from '../src/lib/mobile-api'

const ACADEMY_TYPE_OPTIONS: Array<{ value: CoachAcademyType | ''; label: string }> = [
  { value: '', label: 'Not Set' },
  { value: 'academy', label: 'Academy' },
  { value: 'club', label: 'Club' },
  { value: 'school', label: 'School' },
  { value: 'college', label: 'College' },
  { value: 'independent', label: 'Independent' },
  { value: 'federation', label: 'Federation' },
]

const AGE_BAND_OPTIONS: Array<{ value: CoachAcademyAgeBand; label: string }> = [
  { value: 'mixed', label: 'Mixed' },
  { value: 'u12', label: 'U12' },
  { value: 'u14', label: 'U14' },
  { value: 'u16', label: 'U16' },
  { value: 'u18', label: 'U18' },
  { value: 'senior', label: 'Senior' },
]

type TeamDraftState = Record<
  string,
  {
    academyName: string
    academyType: CoachAcademyType | ''
    academyCity: string
    ageBandFocus: CoachAcademyAgeBand
    parentHandoffEnabled: boolean
    lowCostMode: boolean
  }
>

function buildTeamDrafts(teams: CoachAcademyTeam[]): TeamDraftState {
  return Object.fromEntries(
    teams.map((team) => [
      team.id,
      {
        academyName: team.academyProfile.academyName || '',
        academyType: team.academyProfile.academyType || '',
        academyCity: team.academyProfile.academyCity || '',
        ageBandFocus: team.academyProfile.ageBandFocus,
        parentHandoffEnabled: team.academyProfile.parentHandoffEnabled,
        lowCostMode: team.academyProfile.lowCostMode,
      },
    ])
  )
}

function ChoicePill({
  label,
  active,
  onPress,
}: {
  label: string
  active: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`rounded-full border px-4 py-3 ${
        active ? 'border-[#00E5FF]/50 bg-[#00E5FF]/10' : 'border-white/5 bg-white/[0.03]'
      }`}
    >
      <Text
        className={`text-[10px] font-bold uppercase tracking-[0.18em] ${
          active ? 'text-chakra-neon' : 'text-white/60'
        }`}
      >
        {label}
      </Text>
    </Pressable>
  )
}

function FieldLabel({ children }: { children: string }) {
  return (
    <Text className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">
      {children}
    </Text>
  )
}

function MiniInfo({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string
  icon: typeof Users
}) {
  return (
    <View className="flex-1 rounded-[20px] border border-white/5 bg-white/[0.03] p-4">
      <View className="flex-row items-center gap-2">
        <Icon color="#FF5F1F" size={14} />
        <Text className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/35">
          {label}
        </Text>
      </View>
      <Text className="mt-3 text-sm font-semibold text-white">{value}</Text>
    </View>
  )
}

function ToggleTile({
  title,
  body,
  active,
  onPress,
}: {
  title: string
  body: string
  active: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`rounded-[24px] border p-4 ${
        active ? 'border-[#00E5FF]/30 bg-[#00E5FF]/10' : 'border-white/5 bg-white/[0.03]'
      }`}
    >
      <Text className="text-sm font-bold text-white">{title}</Text>
      <Text className="mt-2 text-sm leading-6 text-white/55">{body}</Text>
    </Pressable>
  )
}

function StatCard({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string
  value: string
  detail: string
  icon: typeof Users
}) {
  return (
    <View className="rounded-[24px] border border-white/5 bg-white/[0.03] p-5">
      <View className="flex-row items-center gap-2">
        <Icon color="#FF5F1F" size={16} />
        <Text className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">
          {label}
        </Text>
      </View>
      <Text className="mt-3 text-3xl font-black tracking-tight text-white">{value}</Text>
      <Text className="mt-2 text-sm leading-6 text-white/55">{detail}</Text>
    </View>
  )
}

function formatConsent(status: string) {
  switch (status) {
    case 'confirmed':
      return 'confirmed'
    case 'coach_confirmed':
      return 'coach confirmed'
    case 'pending':
      return 'pending'
    case 'declined':
      return 'declined'
    default:
      return 'unknown'
  }
}

function formatHandoffPreference(preference: string) {
  return preference === 'coach_led' ? 'coach-led' : preference
}

export default function CoachAcademyScreen() {
  const router = useRouter()
  const { session, user } = useMobileAuth()
  const [academy, setAcademy] = useState<CoachAcademySnapshot | null>(null)
  const [drafts, setDrafts] = useState<TeamDraftState>({})
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [savingTeamId, setSavingTeamId] = useState<string | null>(null)
  const [sendingAthleteId, setSendingAthleteId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function loadAcademy(showRefreshState = false) {
    if (!session?.access_token) {
      setLoading(false)
      return
    }

    try {
      if (showRefreshState) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      const response = await fetchCoachAcademy(session.access_token)
      setAcademy(response.academy)
      setDrafts(buildTeamDrafts(response.academy.teams))
      setError(null)
    } catch (academyError) {
      setError(
        academyError instanceof Error
          ? academyError.message
          : 'Failed to load coach academy operations.'
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    void loadAcademy()
  }, [session?.access_token])

  const academyStats = useMemo(() => {
    const athletes = academy?.juniorAthletes || []
    const readyCount = athletes.filter((athlete) => athlete.guardianProfile.handoffReady).length
    const missingCount = athletes.filter((athlete) => !athlete.guardianProfile.isComplete).length
    const pendingConsent = athletes.filter(
      (athlete) =>
        athlete.guardianProfile.consentStatus === 'pending' ||
        athlete.guardianProfile.consentStatus === 'unknown'
    ).length

    return {
      juniorCount: athletes.length,
      readyCount,
      missingCount,
      pendingConsent,
    }
  }, [academy])

  if (!session) {
    return <Redirect href="/login" />
  }

  if (user && user.profile.role !== 'coach') {
    return (
      <View className="flex-1 items-center justify-center bg-background px-8">
        <Text className="text-center text-xl font-black tracking-tight text-white">
          Academy ops is coach-only
        </Text>
        <Text className="mt-4 text-center text-sm leading-6 text-white/55">
          This route mirrors the coach academy workflow from web, and your current mobile role is {user.profile.role}.
        </Text>
      </View>
    )
  }

  async function handleTeamSave(teamId: string) {
    if (!session?.access_token) return

    const draft = drafts[teamId]
    if (!draft) return

    try {
      setSavingTeamId(teamId)
      setError(null)
      await updateCoachAcademyTeam(session.access_token, {
        teamId,
        academyName: draft.academyName,
        academyType: draft.academyType,
        academyCity: draft.academyCity,
        ageBandFocus: draft.ageBandFocus,
        parentHandoffEnabled: draft.parentHandoffEnabled,
        lowCostMode: draft.lowCostMode,
      })
      await loadAcademy(true)
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Failed to save academy settings.'
      )
    } finally {
      setSavingTeamId(null)
    }
  }

  async function handleShareParentSummary(message: string) {
    try {
      await Share.share({ message })
    } catch (shareError) {
      setError(
        shareError instanceof Error
          ? shareError.message
          : 'Could not open the parent handoff share sheet.'
      )
    }
  }

  async function handleMarkSent(athleteId: string) {
    if (!session?.access_token) return

    try {
      setSendingAthleteId(athleteId)
      setError(null)
      await markCoachGuardianHandoffSent(session.access_token, athleteId)
      await loadAcademy(true)
    } catch (handoffError) {
      setError(
        handoffError instanceof Error
          ? handoffError.message
          : 'Failed to mark guardian handoff as sent.'
      )
    } finally {
      setSendingAthleteId(null)
    }
  }

  if (loading && !academy && !error) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-8">
        <ActivityIndicator color="#FF5F1F" size="large" />
        <Text className="mt-4 text-center text-sm font-semibold tracking-wide text-white/70">
          Loading coach academy operations...
        </Text>
      </View>
    )
  }

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        contentContainerStyle={{ padding: 24, paddingBottom: 120, paddingTop: 64 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              void loadAcademy(true)
            }}
            tintColor="#FF5F1F"
          />
        }
      >
        <Pressable onPress={() => router.back()} className="mb-8 flex-row items-center gap-3">
          <ArrowLeft color="#FF5F1F" size={18} />
          <Text className="text-sm font-semibold text-white/60">Back</Text>
        </Pressable>

        <View className="mb-8">
          <Text className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/35">
            Academy Ops
          </Text>
          <Text className="mt-3 text-4xl font-black tracking-tight text-white">
            Multi-team coaching, junior-athlete clarity, parent handoff
          </Text>
          <Text className="mt-3 text-sm leading-6 text-white/55">
            This is the academy layer from the web app, now in mobile: team academy settings, junior-athlete readiness, and clean family communication without extra admin overhead.
          </Text>
        </View>

        <View className="gap-3">
          <StatCard
            label="Teams"
            value={`${academy?.teams.length || 0}`}
            detail="Coach-owned squads in this academy view."
            icon={Building2}
          />
          <StatCard
            label="Junior athletes"
            value={`${academyStats.juniorCount}`}
            detail="Roster members under 18."
            icon={Users}
          />
          <StatCard
            label="Handoff ready"
            value={`${academyStats.readyCount}`}
            detail="Guardian context is complete enough to share."
            icon={ShieldCheck}
          />
          <StatCard
            label="Needs follow-up"
            value={`${academyStats.missingCount + academyStats.pendingConsent}`}
            detail="Missing guardian detail or pending consent."
            icon={ClipboardList}
          />
        </View>

        {error ? (
          <View className="mt-6">
            <ReviewEmptyState title="Academy workflow unavailable" body={error} />
          </View>
        ) : null}

        {!academy && !error ? (
          <View className="mt-6">
            <ReviewEmptyState
              title="No academy data yet"
              body="Create teams and add athletes to start using academy operations from mobile."
            />
          </View>
        ) : null}

        {academy?.teams.length ? (
          <View className="mt-6 gap-3">
            {academy.teams.map((team) => {
              const draft = drafts[team.id]
              if (!draft) return null

              return (
                <ReviewSurfaceCard key={team.id}>
                  <View className="flex-row items-start justify-between gap-4">
                    <View className="flex-1">
                      <Text className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/35">
                        Team academy profile
                      </Text>
                      <Text className="mt-3 text-2xl font-black tracking-tight text-white">
                        {team.teamName}
                      </Text>
                      <Text className="mt-2 text-sm leading-6 text-white/55">
                        {team.memberCount} athletes • {team.juniorCount} junior athletes • {team.guardianReadyCount} handoff-ready
                      </Text>
                    </View>
                    {team.academyProfile.lowCostMode ? (
                      <ReviewTonePill label="Low-cost mode" tone="success" />
                    ) : null}
                  </View>

                  <View className="mt-6">
                    <FieldLabel>Academy name</FieldLabel>
                    <TextInput
                      value={draft.academyName}
                      onChangeText={(academyName) =>
                        setDrafts((current) => {
                          const previous = current[team.id] ?? draft
                          return {
                            ...current,
                            [team.id]: { ...previous, academyName },
                          }
                        })
                      }
                      placeholder="Example: Sunrise Badminton Academy"
                      placeholderTextColor="rgba(255,255,255,0.28)"
                      className="mt-3 rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-4 text-base text-white"
                    />
                  </View>

                  <View className="mt-5">
                    <FieldLabel>Academy city</FieldLabel>
                    <TextInput
                      value={draft.academyCity}
                      onChangeText={(academyCity) =>
                        setDrafts((current) => {
                          const previous = current[team.id] ?? draft
                          return {
                            ...current,
                            [team.id]: { ...previous, academyCity },
                          }
                        })
                      }
                      placeholder="Example: Bengaluru"
                      placeholderTextColor="rgba(255,255,255,0.28)"
                      className="mt-3 rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-4 text-base text-white"
                    />
                  </View>

                  <View className="mt-5">
                    <FieldLabel>Academy type</FieldLabel>
                    <View className="mt-3 flex-row flex-wrap gap-3">
                      {ACADEMY_TYPE_OPTIONS.map((option) => (
                        <ChoicePill
                          key={`${team.id}-${option.label}`}
                          label={option.label}
                          active={draft.academyType === option.value}
                          onPress={() =>
                            setDrafts((current) => {
                              const previous = current[team.id] ?? draft
                              return {
                                ...current,
                                [team.id]: { ...previous, academyType: option.value },
                              }
                            })
                          }
                        />
                      ))}
                    </View>
                  </View>

                  <View className="mt-5">
                    <FieldLabel>Age-band focus</FieldLabel>
                    <View className="mt-3 flex-row flex-wrap gap-3">
                      {AGE_BAND_OPTIONS.map((option) => (
                        <ChoicePill
                          key={`${team.id}-${option.value}`}
                          label={option.label}
                          active={draft.ageBandFocus === option.value}
                          onPress={() =>
                            setDrafts((current) => {
                              const previous = current[team.id] ?? draft
                              return {
                                ...current,
                                [team.id]: { ...previous, ageBandFocus: option.value },
                              }
                            })
                          }
                        />
                      ))}
                    </View>
                  </View>

                  <View className="mt-5 gap-3">
                    <ToggleTile
                      title="Parent handoff enabled"
                      body="Coaches can use guardian contact summaries for junior athletes."
                      active={draft.parentHandoffEnabled}
                      onPress={() =>
                        setDrafts((current) => {
                          const previous = current[team.id] ?? draft
                          return {
                            ...current,
                            [team.id]: {
                              ...previous,
                              parentHandoffEnabled: !previous.parentHandoffEnabled,
                            },
                          }
                        })
                      }
                    />
                    <ToggleTile
                      title="Low-cost workflow"
                      body="Keep communication and testing assumptions realistic for schools and academies."
                      active={draft.lowCostMode}
                      onPress={() =>
                        setDrafts((current) => {
                          const previous = current[team.id] ?? draft
                          return {
                            ...current,
                            [team.id]: {
                              ...previous,
                              lowCostMode: !previous.lowCostMode,
                            },
                          }
                        })
                      }
                    />
                  </View>

                  <View className="mt-6">
                    <GlowingButtonNative
                      title={savingTeamId === team.id ? 'Saving...' : 'Save Academy Settings'}
                      variant="chakra"
                      onPress={() => {
                        void handleTeamSave(team.id)
                      }}
                      disabled={savingTeamId === team.id}
                    />
                  </View>
                </ReviewSurfaceCard>
              )
            })}
          </View>
        ) : null}

        <View className="mt-6">
          <ReviewSurfaceCard>
            <View className="flex-row items-center gap-2">
              <Users color="#00E5FF" size={16} />
              <Text className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/35">
                Junior roster and parent handoff
              </Text>
            </View>
            <Text className="mt-4 text-2xl font-black tracking-tight text-white">
              Coach the athlete, keep the family loop clean
            </Text>
            <Text className="mt-3 text-sm leading-6 text-white/60">
              This queue keeps junior-athlete family communication lightweight. Share a parent handoff summary only when the team has enabled it and the guardian profile is ready.
            </Text>

            {academy?.juniorAthletes.length ? (
              <View className="mt-6 gap-3">
                {academy.juniorAthletes.map((athlete) => {
                  const contactValue =
                    athlete.guardianProfile.guardianPhone ||
                    athlete.guardianProfile.guardianEmail ||
                    'Missing'

                  return (
                    <View
                      key={athlete.athleteId}
                      className="rounded-[24px] border border-white/5 bg-white/[0.03] p-4"
                    >
                      <View className="flex-row items-start justify-between gap-4">
                        <View className="flex-1 flex-row items-start gap-4">
                          <ProfileAvatarNative
                            uri={athlete.avatarUrl}
                            name={athlete.athleteName}
                            size={52}
                          />
                          <View className="flex-1">
                            <View className="flex-row flex-wrap items-center gap-2">
                              <Text className="text-lg font-black tracking-tight text-white">
                                {athlete.athleteName}
                              </Text>
                              <ReviewTonePill label={athlete.teamName} tone="neutral" />
                              <ReviewTonePill
                                label={athlete.guardianProfile.statusLabel}
                                tone={
                                  athlete.guardianProfile.handoffReady ? 'success' : 'warning'
                                }
                              />
                            </View>
                            <Text className="mt-2 text-sm leading-6 text-white/55">
                              Age {athlete.ageYears ?? 'N/A'} • Consent {formatConsent(athlete.guardianProfile.consentStatus)} • Preference {formatHandoffPreference(athlete.guardianProfile.handoffPreference)}
                            </Text>
                          </View>
                        </View>
                        {athlete.guardianProfile.lastHandoffSentAt ? (
                          <Text className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-200">
                            Sent already
                          </Text>
                        ) : null}
                      </View>

                      <View className="mt-4 flex-row gap-3">
                        <MiniInfo
                          label="Guardian"
                          value={athlete.guardianProfile.guardianName || 'Missing'}
                          icon={Users}
                        />
                        <MiniInfo
                          label="Best contact"
                          value={contactValue}
                          icon={
                            athlete.guardianProfile.handoffPreference === 'email'
                              ? Mail
                              : Phone
                          }
                        />
                      </View>

                      <View className="mt-4 rounded-[20px] border border-white/5 bg-white/[0.03] p-4">
                        <Text className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">
                          Next action
                        </Text>
                        <Text className="mt-2 text-sm leading-6 text-white/60">
                          {athlete.guardianProfile.nextAction}
                        </Text>
                      </View>

                      <View className="mt-4 gap-3">
                        <Pressable
                          onPress={() => {
                            void handleShareParentSummary(athlete.parentMessage)
                          }}
                          disabled={
                            !athlete.academyProfile.parentHandoffEnabled ||
                            !athlete.guardianProfile.handoffReady
                          }
                          className={`rounded-full border px-4 py-3 ${
                            athlete.academyProfile.parentHandoffEnabled &&
                            athlete.guardianProfile.handoffReady
                              ? 'border-blue-400/30 bg-blue-400/10'
                              : 'border-white/5 bg-white/[0.03]'
                          }`}
                        >
                          <Text className="text-center text-[10px] font-bold uppercase tracking-[0.18em] text-white">
                            Share Parent Summary
                          </Text>
                        </Pressable>

                        <Pressable
                          onPress={() => {
                            void handleMarkSent(athlete.athleteId)
                          }}
                          disabled={
                            !athlete.academyProfile.parentHandoffEnabled ||
                            !athlete.guardianProfile.handoffReady ||
                            sendingAthleteId === athlete.athleteId
                          }
                          className={`rounded-full border px-4 py-3 ${
                            athlete.academyProfile.parentHandoffEnabled &&
                            athlete.guardianProfile.handoffReady
                              ? 'border-emerald-400/30 bg-emerald-400/10'
                              : 'border-white/5 bg-white/[0.03]'
                          }`}
                        >
                          <View className="flex-row items-center justify-center gap-2">
                            <CheckCircle2 color="#A7F3D0" size={14} />
                            <Text className="text-center text-[10px] font-bold uppercase tracking-[0.18em] text-white">
                              {sendingAthleteId === athlete.athleteId
                                ? 'Saving...'
                                : 'Mark Handoff Sent'}
                            </Text>
                          </View>
                        </Pressable>
                      </View>
                    </View>
                  )
                })}
              </View>
            ) : (
              <View className="mt-6">
                <ReviewEmptyState
                  title="No junior athletes detected"
                  body="As soon as a roster athlete has a date of birth under 18, CREEDA will surface parent handoff readiness here."
                />
              </View>
            )}
          </ReviewSurfaceCard>
        </View>

        <View className="mt-6 gap-3">
          <GlowingButtonNative
            title="Coach Analytics"
            variant="chakra"
            onPress={() => router.push('/coach-analytics')}
          />
          <GlowingButtonNative
            title="Weekly Review"
            variant="saffron"
            onPress={() => router.push('/coach-review')}
          />
        </View>
      </ScrollView>
    </View>
  )
}
