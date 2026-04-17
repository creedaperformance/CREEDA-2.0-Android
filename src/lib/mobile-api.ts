import { mobileEnv } from './env'

export type AppRole = 'athlete' | 'coach' | 'individual'

export interface MobileProfile {
  id: string
  role: AppRole
  fullName: string
  username: string | null
  avatarUrl: string | null
  mobileNumber: string | null
  primarySport: string | null
  position: string | null
  onboardingCompleted: boolean
}

export interface MobileUserEnvelope {
  id: string
  email: string | null
  profile: MobileProfile
  homeRoute: string
  onboardingRoute: string
}

export interface AthleteMobileDashboard {
  type: 'athlete'
  readinessScore: number | null
  decision: string | null
  primaryReason: string
  actionInstruction: string
  riskScore: number | null
  objective: {
    summary: string
    headline: string | null
    trustStatus: string
    freshness: string
  }
  health: {
    connected: boolean
    available: boolean
    source: 'apple' | 'android' | 'mixed' | 'none'
    lastSyncAt: string | null
    lastSyncStatus: string | null
    lastError: string | null
    latestMetricDate: string | null
    latestSteps: number | null
    avgSleepHours: number | null
    avgHeartRate: number | null
    avgHrv: number | null
    sampleDays: number
  }
  context: {
    summary: string
    nextAction: string
    loadLabel: string
  } | null
  nutrition: {
    statusLabel: string
    gateTitle: string
    summary: string
    nextAction: string
    blocksDetailedAdvice: boolean
  }
  latestVideoReport: {
    status: 'available'
  } | null
}

export interface CoachMobileDashboard {
  type: 'coach'
  periodLabel: string
  athleteCount: number
  teamCount: number
  averageReadiness: number
  readinessDelta: number
  squadCompliancePct: number
  activeInterventions: number
  lowDataCount: number
  resolvedThisWeek: number
  objectiveCoveragePct: number
  objectiveDecliningCount: number
  bottleneck: string
  biggestWin: string
  highestRiskCluster: string
  nextWeekFocus: string
  topPriorityAthletes: Array<{
    athleteId: string
    athleteName: string
    teamName: string
    queueType: string
    priority: string
    reasons: string[]
    recommendation: string
    updatedAt: string | null
  }>
  groupSuggestions: Array<{
    title: string
    detail: string
    priority: string
  }>
  teamSummaries: Array<{
    teamId: string
    teamName: string
    athleteCount: number
    averageReadiness: number
    compliancePct: number
    interventionCount: number
    lowDataCount: number
    highRiskCount: number
    objectiveCoveragePct: number
    consistencyScore: number | null
    reliabilityScore: number | null
  }>
}

export interface MobileWeeklyReviewPoint {
  date: string
  label: string
  readinessScore: number
  loadMinutes?: number
}

export interface MobileReviewContextSummary {
  summary: string
  nextAction: string
  loadLabel: string
}

export interface MobileReviewTrustSummary {
  confidenceLevel: string
  confidenceScore: number
  dataQuality: string
  dataCompleteness: number
  nextBestInputs: string[]
}

export interface MobileReviewObjectiveSignal {
  displayName: string
  formattedHeadline: string | null
  trend: 'improving' | 'stable' | 'declining' | 'missing'
}

export interface MobileReviewObjectiveTest {
  latestValidatedScoreMs: number | null
  trend: 'improving' | 'stable' | 'declining' | 'missing'
  freshness: 'fresh' | 'stale' | 'missing'
  trustStatus: string
  classification: string | null
  summary: string
  nextAction: string
  primarySignal: MobileReviewObjectiveSignal | null
}

export interface MobileIdentityMetricSummary {
  key: string
  label: string
  score: number | null
  status: string
  summary: string
  nextAction: string
}

export interface MobileSquadIdentityMetricSummary
  extends MobileIdentityMetricSummary {
  athleteCount: number
  flaggedCount: number
}

export interface AthleteWeeklyReview {
  periodLabel: string
  averageReadiness: number
  adherencePct: number
  loadMinutes: number
  trainingDays: number
  readinessDelta: number
  bottleneck: string
  biggestWin: string
  nextWeekFocus: string
  trustSummary: MobileReviewTrustSummary | null
  decision: {
    decision: string
  } | null
  trend: MobileWeeklyReviewPoint[]
  objectiveTest: MobileReviewObjectiveTest | null
  contextSummary: MobileReviewContextSummary | null
  identityMetrics: MobileIdentityMetricSummary[]
}

export interface IndividualWeeklyReview {
  periodLabel: string
  averageReadiness: number
  adherencePct: number
  readinessDelta: number
  progressToPeakPct: number
  streakCount: number
  bottleneck: string
  biggestWin: string
  nextWeekFocus: string
  trustSummary: MobileReviewTrustSummary
  decision: {
    directionLabel: string
    pathway: {
      title: string
      rationale: string
    }
  }
  trend: MobileWeeklyReviewPoint[]
  objectiveTest: MobileReviewObjectiveTest | null
  contextSummary: MobileReviewContextSummary | null
  identityMetrics: MobileIdentityMetricSummary[]
}

export interface CoachWeeklyReviewPriority {
  athleteId: string
  athleteName: string
  teamId: string
  teamName: string
  queueType: 'intervention' | 'low_data'
  priority: 'Critical' | 'Warning' | 'Informational'
  reasons: string[]
  recommendation: string
  updatedAt: string | null
}

export interface CoachGroupSuggestion {
  title: string
  detail: string
  priority: 'High' | 'Watch' | 'Build'
}

export interface CoachTeamReviewSummary {
  teamId: string
  teamName: string
  athleteCount: number
  averageReadiness: number
  compliancePct: number
  interventionCount: number
  lowDataCount: number
  highRiskCount: number
  objectiveCoveragePct: number
  consistencyScore: number | null
  reliabilityScore: number | null
}

export interface CoachWeeklyReview {
  periodLabel: string
  athleteCount: number
  teamCount: number
  averageReadiness: number
  readinessDelta: number
  squadCompliancePct: number
  activeInterventions: number
  lowDataCount: number
  resolvedThisWeek: number
  objectiveCoveragePct: number
  objectiveDecliningCount: number
  bottleneck: string
  biggestWin: string
  highestRiskCluster: string
  nextWeekFocus: string
  trend: MobileWeeklyReviewPoint[]
  topPriorityAthletes: CoachWeeklyReviewPriority[]
  groupSuggestions: CoachGroupSuggestion[]
  teamSummaries: CoachTeamReviewSummary[]
  identityMetrics: MobileSquadIdentityMetricSummary[]
}

export type CoachAcademyType =
  | 'independent'
  | 'school'
  | 'college'
  | 'academy'
  | 'club'
  | 'federation'

export type CoachAcademyAgeBand = 'mixed' | 'u12' | 'u14' | 'u16' | 'u18' | 'senior'

export type CoachGuardianConsentStatus =
  | 'unknown'
  | 'pending'
  | 'confirmed'
  | 'coach_confirmed'
  | 'declined'

export type CoachParentHandoffPreference = 'whatsapp' | 'email' | 'coach_led' | 'none'

export interface CoachAcademyProfile {
  academyName: string | null
  academyType: CoachAcademyType | null
  academyCity: string | null
  ageBandFocus: CoachAcademyAgeBand
  parentHandoffEnabled: boolean
  lowCostMode: boolean
}

export interface CoachAcademyGuardianProfile {
  athleteId: string
  guardianName: string | null
  guardianRelationship: string | null
  guardianPhone: string | null
  guardianEmail: string | null
  emergencyContactName: string | null
  emergencyContactPhone: string | null
  consentStatus: CoachGuardianConsentStatus
  handoffPreference: CoachParentHandoffPreference
  lastHandoffSentAt: string | null
  notes: string | null
  isComplete: boolean
  handoffReady: boolean
  statusLabel: string
  nextAction: string
}

export interface CoachAcademyTeam {
  id: string
  teamName: string
  memberCount: number
  juniorCount: number
  guardianReadyCount: number
  academyProfile: CoachAcademyProfile
}

export interface CoachAcademyAthlete {
  athleteId: string
  athleteName: string
  avatarUrl: string | null
  teamId: string
  teamName: string
  academyProfile: CoachAcademyProfile
  sport: string | null
  ageYears: number | null
  isJunior: boolean
  guardianConsentConfirmed: boolean
  guardianProfile: CoachAcademyGuardianProfile
  readinessLabel: string | null
  nextAction: string | null
  restrictions: string[]
  parentMessage: string
}

export interface CoachAcademySnapshot {
  teams: CoachAcademyTeam[]
  juniorAthletes: CoachAcademyAthlete[]
}

export interface AthleteMonthlyReportRow {
  id: string
  logDate: string
  readiness: number
  plannedTraining: string
  load: number
  painLevel: number
}

export interface AthleteMonthlyReport {
  startDate: string
  endDate: string
  periodLabel: string
  reportedDays: number
  consistencyScore: number
  averageReadiness: number
  macroLoadAU: number
  warnings: string[]
  rows: AthleteMonthlyReportRow[]
}

export interface AthleteEventPrepPlan {
  focus: string
  risk: string
  description: string
}

export interface AthleteEventSummary {
  id: string
  eventName: string
  eventType: string
  location: string
  eventDate: string
  skillLevel: string
  description: string | null
  registrationLink: string | null
}

export interface AthleteEventDetail extends AthleteEventSummary {
  daysLeft: number
  weeksLeft: number
  prepPlan: AthleteEventPrepPlan
}

export interface CoachVideoReportRecommendation {
  title: string
  reason: string
  drills: string[]
  priority: 'high' | 'medium' | 'low'
}

export interface CoachVideoReportSummary {
  id: string
  userId: string
  sportId: string
  sportLabel: string
  createdAt: string
  frameCount: number
  warnings: number
  positive: number
  issuesDetected: string[]
  summary: {
    score: number
    status: 'clean' | 'watch' | 'corrective'
    headline: string
    coachSummary: string
  }
  recommendations: CoachVideoReportRecommendation[]
  athleteName: string
  athleteAvatarUrl: string | null
}

export type MobileVideoAnalysisRole = 'athlete' | 'individual'

export type MobileVideoAnalysisFamily =
  | 'sprint_mechanics'
  | 'change_of_direction'
  | 'batting_stance'
  | 'bowling_delivery'
  | 'overhead_mechanics'
  | 'combat_stance'
  | 'strength_pattern'
  | 'rotational_swing'
  | 'precision_posture'
  | 'endurance_posture'
  | 'movement_screen'

export interface MobileVideoAnalysisSportOption {
  sportId: string
  sportLabel: string
  emoji: string
  family: MobileVideoAnalysisFamily
  captureView: string
  shortPrompt: string
}

export interface MobileVideoAnalysisFeedbackEvent {
  message: string
  isError: boolean
  timestampMs?: number
}

export interface MobileVideoAnalysisFault {
  fault: string
  riskMapping: string
  correctiveDrills: string[]
  severity: 'high' | 'moderate' | 'low'
  confidence: number
  timestamp?: string
}

export interface MobileVideoAnalysisRecommendation {
  title: string
  reason: string
  drills: string[]
  priority: 'high' | 'medium' | 'low'
}

export interface MobileVideoAnalysisSummary {
  score: number
  status: 'clean' | 'watch' | 'corrective'
  headline: string
  coachSummary: string
}

export interface MobileVideoAnalysisReport {
  id: string
  userId: string
  sportId: string
  sportLabel: string
  subjectRole: MobileVideoAnalysisRole
  subjectPosition: string | null
  analyzerFamily: MobileVideoAnalysisFamily
  createdAt: string
  frameCount: number
  warnings: number
  positive: number
  issuesDetected: string[]
  feedbackLog: MobileVideoAnalysisFeedbackEvent[]
  visionFaults: MobileVideoAnalysisFault[]
  summary: MobileVideoAnalysisSummary
  recommendations: MobileVideoAnalysisRecommendation[]
  athleteName?: string
  athleteAvatarUrl?: string | null
}

export type ObjectiveTestRole = 'athlete' | 'individual'

export type ObjectiveTestType =
  | 'reaction_tap'
  | 'balance_single_leg'
  | 'breathing_recovery'
  | 'jump_landing_control'
  | 'mobility_battery'
  | 'sprint_10m'
  | 'agility_505'

export type ObjectiveCaptureMode =
  | 'screen_tap'
  | 'camera_pose_live'
  | 'camera_pose_upload'
  | 'guided_timer_hr_optional'
  | 'camera_timed_distance'

export type ObjectiveRecommendationState =
  | 'recommended'
  | 'optional'
  | 'cooldown'
  | 'not_useful_now'
  | 'unsafe_now'
  | 'replace_with_lower_load'

export type ObjectiveValidityStatus =
  | 'accepted'
  | 'low_confidence'
  | 'invalid_saved'
  | 'supplemental'

export type ObjectiveBaselineStatus =
  | 'building'
  | 'provisional'
  | 'ready'
  | 'stale'

export interface MobileObjectiveMetricDefinition {
  key: string
  label: string
  unit: string
  direction: 'higher_better' | 'lower_better' | 'target_band'
  decimals: number
  minimumDetectableChange: number
}

export interface MobileObjectiveProtocol {
  id: ObjectiveTestType
  family: string
  displayName: string
  shortDescription: string
  analysisMode: string
  captureMode: ObjectiveCaptureMode
  estimatedDurationMinutes: number
  estimatedLoad: string
  heroLabel: string
  protocolRules: string[]
  setupChecklist: string[]
  whenUseful: string[]
  whenToSkip: string[]
  headlineMetric: MobileObjectiveMetricDefinition
  secondaryMetrics: MobileObjectiveMetricDefinition[]
  weeklyCap: number
  cooldownHours: number
  alternativesWhenUnsafe?: ObjectiveTestType[]
}

export interface MobileObjectiveSession {
  id: string
  userId: string
  role: ObjectiveTestRole
  testType: ObjectiveTestType
  family: string | null
  protocolVersion: string
  source: string
  captureMode: ObjectiveCaptureMode | null
  sport: string | null
  captureContext: Record<string, unknown>
  sideScope: 'none' | 'left' | 'right' | 'bilateral' | 'battery'
  dominantSide: 'left' | 'right' | null
  sampleCount: number
  falseStartCount: number
  averageScoreMs: number | null
  validatedScoreMs: number | null
  bestScoreMs: number | null
  consistencyMs: number | null
  classification: string | null
  headlineMetricKey: string | null
  headlineMetricValue: number | null
  headlineMetricUnit: string | null
  confidenceScore: number | null
  captureQualityScore: number | null
  validityStatus: ObjectiveValidityStatus
  baselineStatus: ObjectiveBaselineStatus
  qualityFlags: string[]
  safetyFlags: string[]
  trialResults: number[]
  resultsJson: Record<string, unknown>
  metadata: Record<string, unknown>
  linkedVideoReportId: string | null
  completedAt: string
}

export interface MobileObjectiveBaseline {
  userId: string
  role: ObjectiveTestRole
  testType: ObjectiveTestType
  metricKey: string
  side: 'left' | 'right' | 'bilateral' | 'none'
  baselineMethod: string
  baselineN: number
  baselineValue: number
  baselineUnit: string
  minDetectableChange: number
  ready: boolean
  metadata: Record<string, unknown>
}

export interface MobileObjectiveSignalSummary {
  protocolId: ObjectiveTestType
  displayName: string
  family: string
  headlineMetricKey: string
  headlineMetricLabel: string
  headlineMetricValue: number | null
  headlineMetricUnit: string
  headlineMetricDirection: 'higher_better' | 'lower_better' | 'target_band'
  formattedHeadline: string
  confidenceScore: number | null
  captureQualityScore: number | null
  freshness: 'fresh' | 'stale' | 'missing'
  trend: 'improving' | 'stable' | 'declining' | 'missing'
  classification: string | null
  summary: string
  nextAction: string
  completedAt: string | null
  baselineStatus: ObjectiveBaselineStatus
  validityStatus: ObjectiveValidityStatus
  deltaVsBaseline: number | null
  deltaVsPrevious: number | null
}

export interface MobileObjectiveCadenceDecision {
  protocolId: ObjectiveTestType
  state: ObjectiveRecommendationState
  reason: string
  alternativeProtocolId?: ObjectiveTestType
}

export interface CoachOnboardingPayload {
  fullName: string
  username: string
  mobileNumber: string
  teamName: string
  sportCoached: string
  coachingLevel: 'Private Pro Coach' | 'Academy / Club Coach' | 'School / University Coach'
  teamType: 'Single Team' | 'Multiple Teams / Age Groups' | 'Individual Athletes'
  mainCoachingFocus:
    | 'Injury Risk Reduction'
    | 'Peak Performance Optimization'
    | 'Player Compliance'
    | 'Scouting / Talent ID'
  numberOfAthletes: '1-5' | '6-15' | '16-30' | '30+'
  trainingFrequency: 'Daily' | '3-4x Weekly' | '1-2x Weekly'
  criticalRisks: string[]
  avatarUrl?: string | null
}

export interface CoachOnboardingResponse {
  success: true
  destination: '/coach/dashboard'
  coachLockerCode: string
  teamInviteCode: string
  teamName: string
}

export interface IndividualMobileDashboard {
  type: 'individual'
  readinessScore: number
  sport: string
  primaryGoal: string
  directionLabel: string
  directionSummary: string
  explanation: string
  today: {
    todayFocus: string
    intensity: 'low' | 'moderate' | 'high'
    sessionDurationMinutes: number
    whatToDo: string[]
    recoveryActions: string[]
    adaptationNote: string
  } | null
  pathway: {
    title: string
    mappedSport: string
    type: string
    rationale: string
  } | null
  health: {
    usedInDecision: boolean
    influencePct: number
    latestMetricDate: string | null
    connectedMetricDays: number
    summary: AthleteMobileDashboard['health']
  }
  objective: {
    summary: string
    headline: string | null
    freshness: string
  }
  context: {
    summary: string
    nextAction: string
    loadLabel: string
  } | null
  nutrition: {
    statusLabel: string
    gateTitle: string
    summary: string
    nextAction: string
    blocksDetailedAdvice: boolean
  }
}

export type MobileDashboard =
  | AthleteMobileDashboard
  | CoachMobileDashboard
  | IndividualMobileDashboard

export interface MobileMeResponse {
  success: true
  user: MobileUserEnvelope
}

export interface MobileDashboardResponse {
  success: true
  user: MobileUserEnvelope
  dashboard: MobileDashboard
}

export interface AthleteWeeklyReviewResponse {
  success: true
  user: MobileUserEnvelope
  review: AthleteWeeklyReview
}

export interface IndividualWeeklyReviewResponse {
  success: true
  user: MobileUserEnvelope
  review: IndividualWeeklyReview
}

export interface CoachWeeklyReviewResponse {
  success: true
  user: MobileUserEnvelope
  review: CoachWeeklyReview
}

export interface CoachAnalyticsResponse {
  success: true
  user: MobileUserEnvelope
  analytics: CoachWeeklyReview
}

export interface CoachAcademyResponse {
  success: true
  user: MobileUserEnvelope
  academy: CoachAcademySnapshot
}

export interface AthleteMonthlyReportResponse {
  success: true
  user: MobileUserEnvelope
  report: AthleteMonthlyReport
}

export interface AthleteEventsResponse {
  success: true
  user: MobileUserEnvelope
  events: AthleteEventSummary[]
}

export interface AthleteEventDetailResponse {
  success: true
  user: MobileUserEnvelope
  event: AthleteEventDetail
}

export interface CoachReportsResponse {
  success: true
  user: MobileUserEnvelope
  reports: CoachVideoReportSummary[]
}

export interface MobileVideoAnalysisHubResponse {
  success: true
  user: MobileUserEnvelope
  hub: {
    role: MobileVideoAnalysisRole
    preferredSport: string | null
    sports: MobileVideoAnalysisSportOption[]
    recentReports: MobileVideoAnalysisReport[]
  }
}

export interface MobileVideoAnalysisReportResponse {
  success: true
  user: MobileUserEnvelope
  report: MobileVideoAnalysisReport
}

export interface ObjectiveTestsResponse {
  success: true
  user: MobileUserEnvelope
  lab: {
    role: ObjectiveTestRole
    protocols: MobileObjectiveProtocol[]
    sessions: MobileObjectiveSession[]
    signals: MobileObjectiveSignalSummary[]
    baselines: MobileObjectiveBaseline[]
    cadence: MobileObjectiveCadenceDecision[]
  }
}

export interface SaveReactionTapPayload {
  acceptedTrials: number[]
  falseStartCount: number
  sport?: string | null
  captureContext?: Record<string, unknown>
  metadata?: Record<string, unknown>
}

export interface SaveReactionTapResponse {
  success: true
  session: MobileObjectiveSession
}

export interface AthleteDailyCheckInPayload {
  sleepQuality: 'Poor' | 'Okay' | 'Good' | 'Excellent'
  sleepDuration: '<6' | '6-7' | '7-8' | '8-9' | '9+'
  sleepLatency: '<15 min' | '15-30 min' | '30-60 min' | '>60 min'
  energyLevel: 'Drained' | 'Low' | 'Moderate' | 'High' | 'Peak'
  muscleSoreness: 'None' | 'Low' | 'Moderate' | 'High'
  lifeStress: 'Low' | 'Moderate' | 'High' | 'Very High'
  motivation: 'Low' | 'Moderate' | 'High'
  sessionCompletion: 'completed' | 'competition' | 'rest' | 'missed'
  sessionType?: 'Skill' | 'Strength' | 'Speed' | 'Endurance' | 'Recovery' | ''
  yesterdayDemand: number
  yesterdayDuration: number
  painStatus: 'none' | 'mild' | 'moderate' | 'severe'
  painLocation: string[]
  competitionToday: boolean
  competitionTomorrow: boolean
  competitionYesterday: boolean
  heatLevel?: 'normal' | 'warm' | 'hot' | 'extreme' | ''
  humidityLevel?: 'low' | 'moderate' | 'high' | ''
  aqiBand?: 'good' | 'moderate' | 'poor' | 'very_poor' | ''
  commuteMinutes: number
  examStressScore: number
  fastingState?: 'none' | 'light' | 'strict' | ''
  shiftWork: boolean
  sessionNotes?: string
}

export interface AthleteDailyCheckInResponse {
  success: true
  readinessScore: number
  decision: string
  action: string
  reason: string
}

export interface AthleteOnboardingInjuryEntry {
  region: string
  type: string
  side: string
  recurring: boolean
}

export interface AthleteOnboardingPayload {
  fullName: string
  username: string
  primarySport: string
  position: string
  coachId?: string | null
  coachLockerCode?: string
  inviteToken?: string
  heightCm: number
  weightKg: number
  avatar_url?: string | null
  minorGuardianConsent?: boolean
  typicalWeeklyHours: number
  typicalRPE: number
  age: number
  biologicalSex: 'Male' | 'Female' | 'Other'
  dominantSide: 'Left' | 'Right' | 'Both' | 'Ambidextrous'
  playingLevel:
    | 'Recreational'
    | 'School'
    | 'District'
    | 'State'
    | 'National'
    | 'Professional'
  seasonPhase?: string
  trainingFrequency: '1-3 days' | '4-6 days' | 'Daily'
  avgIntensity: 'Low' | 'Moderate' | 'High'
  typicalSleep: '< 6 hours' | '6-7 hours' | '7-8 hours' | '8-9 hours' | '> 9 hours'
  usualWakeUpTime: string
  typicalSoreness: 'None' | 'Low' | 'Moderate' | 'High'
  typicalEnergy: 'Low' | 'Moderate' | 'High'
  currentIssue: 'No' | 'Yes'
  activeInjuries?: AthleteOnboardingInjuryEntry[]
  pastMajorInjury: 'No' | 'Yes'
  pastInjuries?: AthleteOnboardingInjuryEntry[]
  hasIllness?: 'No' | 'Yes'
  illnesses?: string[]
  endurance_capacity: number
  strength_capacity: number
  explosive_power: number
  agility_control: number
  reaction_self_perception?: number
  recovery_efficiency: number
  fatigue_resistance: number
  load_tolerance: number
  movement_robustness: number
  coordination_control: number
  reaction_time_ms?: number
  primaryGoal:
    | 'Performance Enhancement'
    | 'Injury Prevention'
    | 'Recovery Efficiency'
    | 'Return from Injury'
    | 'Competition Prep'
  health_connection_preference?: 'connect_now' | 'later'
  legalConsent: boolean
  medicalDisclaimerConsent: boolean
  dataProcessingConsent: boolean
  aiAcknowledgementConsent: boolean
  marketingConsent?: boolean
}

export interface AthleteOnboardingResponse {
  success: true
  destination: '/athlete/dashboard'
}

export interface IndividualDailyLogPayload {
  sleep_quality: number | string
  energy_level: number | string
  stress_level: number | string
  recovery_feel: number | string
  soreness_level: number | string
  session_completion: 'missed' | 'partial' | 'complete' | 'crushed'
  training_minutes: number
  session_rpe: number
  steps: number
  hydration_liters: number
  heat_level?: 'normal' | 'warm' | 'hot' | 'extreme' | ''
  humidity_level?: 'low' | 'moderate' | 'high' | ''
  aqi_band?: 'good' | 'moderate' | 'poor' | 'very_poor' | ''
  commute_minutes?: number
  exam_stress_score?: number
  fasting_state?: 'none' | 'light' | 'strict' | ''
  shift_work?: boolean
  session_notes?: string
}

export interface IndividualDailyLogResponse {
  success: true
  result: {
    score: number
    status: string
    reason: string
    action: string
    guidance: unknown
    weekly: unknown
    peak: unknown
  }
}

export interface FitStartRecommendationInput {
  basic: {
    age: number
    gender: string
    heightCm: number
    weightKg: number
    occupation: string
    activityLevel: 'sedentary' | 'moderate' | 'active'
  }
  physiology: {
    sleepQuality: number
    energyLevels: number
    stressLevels: number
    recoveryRate: number
    injuryHistory: 'none' | 'minor' | 'moderate' | 'major' | 'chronic'
    mobilityLimitations: 'none' | 'mild' | 'moderate' | 'severe'
    trainingExperience: 'beginner' | 'novice' | 'intermediate' | 'advanced' | 'experienced'
    endurance_capacity: number
    strength_capacity: number
    explosive_power: number
    agility_control: number
    reaction_self_perception: number
    recovery_efficiency: number
    fatigue_resistance: number
    load_tolerance: number
    movement_robustness: number
    coordination_control: number
    reaction_time_ms?: number
  }
  lifestyle: {
    scheduleConstraints: string[]
    equipmentAccess: string[]
    nutritionHabits: 'poor' | 'basic' | 'good' | 'structured'
    sedentaryHours: number
  }
  goals: {
    primaryGoal: 'fat_loss' | 'muscle_gain' | 'endurance' | 'general_fitness' | 'sport_specific'
    timeHorizon: '4_weeks' | '8_weeks' | '12_weeks' | 'long_term'
    intensityPreference: 'low' | 'moderate' | 'high'
  }
}

export interface FitStartRecommendation {
  id: string
  type: 'sport' | 'training' | 'lifestyle'
  title: string
  mappedSport: string
  score: number
  summary: string
  why: string[]
}

export interface FitStartRecommendationsResponse {
  success: true
  recommendations: FitStartRecommendation[]
}

export interface FitStartSavePayload extends FitStartRecommendationInput {
  sport: {
    selectedSport: string
    selectedPathwayId?: string
    selectedPathwayType?: 'sport' | 'training' | 'lifestyle'
    selectedRecommendationTitle?: string
    selectionRationale?: string
  }
  timeTakenMs: number
  health_connection_preference?: 'connect_now' | 'later'
}

export interface FitStartSaveResponse {
  success: true
  destination: '/individual/dashboard'
  summary: {
    readinessScore: number
    primaryGap: string
    projectedPeakDate: string
  }
}

export interface HealthConnectionState {
  user_id: string
  apple_connected?: boolean
  android_connected?: boolean
  connection_preference?: 'connect_now' | 'later'
  permission_state?: Record<string, unknown>
  last_sync_status?: 'never' | 'success' | 'failed'
  last_sync_at?: string | null
  last_error?: string | null
  updated_at?: string
}

export interface HealthConnectionResponse {
  success: true
  user_id: string
  connection: HealthConnectionState | null
}

export interface AvatarUpdateResponse {
  success: true
  avatarUrl: string | null
}

export interface UpdateMobileProfilePayload {
  full_name?: string
  username?: string
  mobile_number?: string
  avatar_url?: string | null
}

export interface UpdateCoachAcademyTeamPayload {
  teamId: string
  academyName: string
  academyType: CoachAcademyType | ''
  academyCity: string
  ageBandFocus: CoachAcademyAgeBand
  parentHandoffEnabled: boolean
  lowCostMode: boolean
}

export interface UpdateMobileProfileResponse {
  success: true
  profile: MobileProfile
}

export interface DeleteMobileAccountResponse {
  success: true
}

export interface UpdateCoachAcademyTeamResponse {
  success: true
  user: MobileUserEnvelope
}

export interface MarkCoachGuardianHandoffSentResponse {
  success: true
  user: MobileUserEnvelope
  athleteId: string
}

function getErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== 'object') return fallback

  const record = payload as Record<string, unknown>
  if (typeof record.details === 'string' && record.details) return record.details
  if (typeof record.error === 'string' && record.error) return record.error
  return fallback
}

async function apiFetch<T>(path: string, accessToken: string, init?: RequestInit) {
  const headers = new Headers(init?.headers || {})
  headers.set('Authorization', `Bearer ${accessToken}`)
  headers.set('Accept', 'application/json')

  if (init?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(`${mobileEnv.apiBaseUrl}${path}`, {
    ...init,
    headers,
  })

  const payload = (await response.json().catch(() => null)) as T | null
  if (!response.ok) {
    throw new Error(getErrorMessage(payload, `Request failed with status ${response.status}.`))
  }

  if (!payload) {
    throw new Error('Server returned an empty response.')
  }

  return payload
}

export function fetchMobileMe(accessToken: string) {
  return apiFetch<MobileMeResponse>('/api/mobile/me', accessToken)
}

export function fetchMobileDashboard(accessToken: string) {
  return apiFetch<MobileDashboardResponse>('/api/mobile/dashboard', accessToken)
}

export function fetchAthleteWeeklyReview(accessToken: string) {
  return apiFetch<AthleteWeeklyReviewResponse>('/api/mobile/athlete/review', accessToken)
}

export function fetchIndividualWeeklyReview(accessToken: string) {
  return apiFetch<IndividualWeeklyReviewResponse>('/api/mobile/individual/review', accessToken)
}

export function fetchCoachWeeklyReview(accessToken: string) {
  return apiFetch<CoachWeeklyReviewResponse>('/api/mobile/coach/review', accessToken)
}

export function fetchCoachAnalytics(accessToken: string) {
  return apiFetch<CoachAnalyticsResponse>('/api/mobile/coach/analytics', accessToken)
}

export function fetchCoachAcademy(accessToken: string) {
  return apiFetch<CoachAcademyResponse>('/api/mobile/coach/academy', accessToken)
}

export function fetchAthleteMonthlyReport(accessToken: string) {
  return apiFetch<AthleteMonthlyReportResponse>('/api/mobile/athlete/report', accessToken)
}

export function fetchAthleteEvents(accessToken: string) {
  return apiFetch<AthleteEventsResponse>('/api/mobile/athlete/events', accessToken)
}

export function fetchAthleteEventDetail(accessToken: string, eventId: string) {
  return apiFetch<AthleteEventDetailResponse>(
    `/api/mobile/athlete/events/${encodeURIComponent(eventId)}`,
    accessToken
  )
}

export function fetchCoachReports(accessToken: string) {
  return apiFetch<CoachReportsResponse>('/api/mobile/coach/reports', accessToken)
}

export function updateCoachAcademyTeam(
  accessToken: string,
  payload: UpdateCoachAcademyTeamPayload
) {
  return apiFetch<UpdateCoachAcademyTeamResponse>(
    '/api/mobile/coach/academy/team',
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  )
}

export function markCoachGuardianHandoffSent(accessToken: string, athleteId: string) {
  return apiFetch<MarkCoachGuardianHandoffSentResponse>(
    '/api/mobile/coach/academy/handoff',
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify({ athleteId }),
    }
  )
}

export function fetchMobileVideoAnalysisHub(accessToken: string) {
  return apiFetch<MobileVideoAnalysisHubResponse>('/api/mobile/video-analysis', accessToken)
}

export function fetchMobileVideoAnalysisReport(accessToken: string, reportId: string) {
  return apiFetch<MobileVideoAnalysisReportResponse>(
    `/api/mobile/video-analysis/${encodeURIComponent(reportId)}`,
    accessToken
  )
}

export function fetchObjectiveTests(accessToken: string) {
  return apiFetch<ObjectiveTestsResponse>('/api/mobile/objective-tests', accessToken)
}

export function saveReactionTapSession(
  accessToken: string,
  payload: SaveReactionTapPayload
) {
  return apiFetch<SaveReactionTapResponse>(
    '/api/mobile/objective-tests/reaction-tap',
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  )
}

export function submitAthleteDailyCheckIn(
  accessToken: string,
  payload: AthleteDailyCheckInPayload
) {
  return apiFetch<AthleteDailyCheckInResponse>('/api/mobile/athlete/checkin', accessToken, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function submitAthleteOnboarding(
  accessToken: string,
  payload: AthleteOnboardingPayload
) {
  return apiFetch<AthleteOnboardingResponse>('/api/mobile/athlete/onboarding', accessToken, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function submitIndividualDailyLog(
  accessToken: string,
  payload: IndividualDailyLogPayload
) {
  return apiFetch<IndividualDailyLogResponse>('/api/mobile/individual/logging', accessToken, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function fetchFitStartRecommendations(
  accessToken: string,
  payload: FitStartRecommendationInput
) {
  return apiFetch<FitStartRecommendationsResponse>(
    '/api/mobile/fitstart/recommendations',
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  )
}

export function submitFitStart(
  accessToken: string,
  payload: FitStartSavePayload
) {
  return apiFetch<FitStartSaveResponse>('/api/mobile/fitstart', accessToken, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function submitCoachOnboarding(
  accessToken: string,
  payload: CoachOnboardingPayload
) {
  return apiFetch<CoachOnboardingResponse>('/api/mobile/coach/onboarding', accessToken, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function fetchHealthConnection(accessToken: string) {
  return apiFetch<HealthConnectionResponse>('/api/v1/health/connection', accessToken)
}

export function updateHealthConnection(
  accessToken: string,
  payload: {
    source?: 'apple' | 'android'
    connected?: boolean
    connection_preference?: 'connect_now' | 'later'
    permission_state?: Record<string, unknown>
    status?: 'never' | 'success' | 'failed'
    error?: string
  }
) {
  return apiFetch<HealthConnectionResponse>('/api/v1/health/connection', accessToken, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function syncHealthMetrics(
  accessToken: string,
  payload: {
    data: Array<{
      date: string
      steps: number
      sleep_hours: number
      heart_rate_avg: number
      hrv: number
      source: 'apple' | 'android'
    }>
  }
) {
  return apiFetch<{ success: true; synced_rows: number; user_id: string }>(
    '/api/v1/health/sync',
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  )
}

export function updateMobileAvatar(accessToken: string, avatarUrl: string) {
  return apiFetch<AvatarUpdateResponse>('/api/mobile/profile/avatar', accessToken, {
    method: 'POST',
    body: JSON.stringify({ avatarUrl }),
  })
}

export function removeMobileAvatar(accessToken: string) {
  return apiFetch<AvatarUpdateResponse>('/api/mobile/profile/avatar', accessToken, {
    method: 'DELETE',
  })
}

export function updateMobileProfile(
  accessToken: string,
  payload: UpdateMobileProfilePayload
) {
  return apiFetch<UpdateMobileProfileResponse>('/api/mobile/profile', accessToken, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function deleteMobileAccount(accessToken: string) {
  return apiFetch<DeleteMobileAccountResponse>('/api/mobile/account', accessToken, {
    method: 'DELETE',
  })
}
