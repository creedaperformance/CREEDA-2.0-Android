import { z } from 'zod';

import { ParqPlusSchema } from './medical-screening';
import { PersonaSchema, PersonaSourceSchema } from './persona';

export const OnboardingV2SafetyGateSubmissionSchema = z.object({
  persona: PersonaSchema,
  source: PersonaSourceSchema,
  parq: ParqPlusSchema,
  completion_seconds: z.number().int().min(0).max(900),
});

export const IdentitySchema = z.object({
  display_name: z.string().trim().min(1).max(40),
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  biological_sex: z.enum(['male', 'female', 'intersex', 'prefer_not_to_say']),
  gender_identity: z.string().trim().max(40).optional(),
  height_cm: z.number().int().min(100).max(230),
  weight_kg: z.number().min(30).max(200),
  dominant_hand: z.enum(['left', 'right', 'ambidextrous']),
  dominant_leg: z.enum(['left', 'right', 'ambidextrous']),
});

export const TrainingLoadSnapshotSchema = z.object({
  weekly_sessions: z.number().int().min(0).max(14),
  avg_session_minutes: z.union([
    z.literal(15),
    z.literal(30),
    z.literal(45),
    z.literal(60),
    z.literal(90),
    z.literal(120),
    z.literal(150),
  ]),
  typical_rpe: z.number().min(1).max(10),
  pattern_4_weeks: z.enum(['same', 'more_now', 'less_now', 'returning_from_break']),
});

export const OrthopedicHistoryEntrySchema = z.object({
  body_region: z.string().trim().min(2).max(80),
  severity: z.enum(['annoying', 'limited_1_2_weeks', 'limited_1_2_months', 'surgery_required']),
  occurred_at_estimate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  currently_symptomatic: z.boolean().default(false),
  current_pain_score: z.number().int().min(0).max(10).optional(),
  has_seen_clinician: z.boolean().default(false),
  clinician_type: z.enum(['physio', 'orthopedist', 'sports_doctor', 'gp', 'other', 'none']).optional(),
  notes: z.string().trim().max(500).optional(),
});

export const SquadSetupSchema = z.object({
  name: z.string().trim().min(2).max(80),
  sport: z.string().trim().min(2).max(60),
  level: z.string().trim().min(2).max(60),
  size_estimate: z.number().int().min(0).max(500).optional(),
  primary_focus: z
    .enum(['rehab', 'peak_velocity', 'avoid_burnout', 'in_season_maintenance', 'preseason_build'])
    .optional(),
});

export const OnboardingV2SportSpecificitySchema = z.object({
  primary_sport: z.string().trim().min(2).max(60),
  position: z.string().trim().max(60).optional(),
  level: z
    .enum(['starter', 'recreational', 'competitive', 'academy', 'elite'])
    .default('recreational'),
});

export const OnboardingV2GoalAnchorSchema = z.object({
  primary_goal: z.enum([
    'general_fitness',
    'sport_performance',
    'strength_gain',
    'fat_loss',
    'return_to_play',
    'event_prep',
    'movement_quality',
  ]),
  goal_detail: z.string().trim().max(180).optional(),
  target_event_name: z.string().trim().max(80).optional(),
  target_event_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export const OnboardingV2WearablePreferenceSchema = z.object({
  preference: z.enum(['connect_now', 'later']),
  provider: z.enum(['apple_health', 'android_health_connect', 'fitbit', 'garmin', 'none']).default('none'),
});

export const DietPatternSchema = z.enum([
  'vegetarian',
  'eggetarian',
  'pescatarian',
  'omnivore',
  'vegan',
  'jain',
]);

export const NutritionProfileSchema = z.object({
  diet_pattern: DietPatternSchema,
  protein_portions_per_day: z.number().min(0).max(12).optional(),
  estimated_protein_grams: z.number().min(0).max(400).optional(),
  water_cups_per_day: z.number().int().min(0).max(30).optional(),
  caffeine_mg_per_day: z.number().int().min(0).max(1200).optional(),
  pre_workout_pattern: z.enum(['carb_heavy', 'mixed', 'minimal', 'fasted']).optional(),
  allergies: z.array(z.string().trim().min(1).max(60)).default([]),
  supplements: z.array(z.string().trim().min(1).max(60)).default([]),
  known_deficiencies: z.array(z.string().trim().min(1).max(60)).default([]),
});

export const EnvironmentalContextSchema = z.object({
  primary_training_city: z.string().trim().min(1).max(80),
  primary_training_lat: z.number().min(-90).max(90).optional(),
  primary_training_lng: z.number().min(-180).max(180).optional(),
  altitude_meters: z.number().int().min(-500).max(9000).optional(),
  indoor_outdoor_split_pct: z.number().int().min(0).max(100).optional(),
  sleep_environment: z.enum(['ac', 'fan_only', 'open_windows', 'shared_room']).optional(),
  commute_minutes: z.number().int().min(0).max(300).optional(),
  commute_mode: z.string().trim().max(60).optional(),
  travel_frequency: z.enum(['rarely', 'monthly', 'biweekly', 'weekly']).optional(),
  current_high_stress_phase: z.boolean().default(false),
  high_stress_reason: z.string().trim().max(160).optional(),
  caregiving_responsibilities: z.boolean().default(false),
});

export const Apsq10Schema = z.object({
  responses: z.array(z.number().int().min(0).max(4)).length(10),
});

export const OnboardingV2Phase2DaySchema = z.enum([
  'day1_aerobic',
  'day2_strength_power',
  'day3_movement_quality',
  'day4_anaerobic_recovery',
  'day5_nutrition',
  'day6_psych_sleep',
  'day7_environment',
]);

const Phase2BaseSchema = z.object({
  phase: z.literal(2).default(2),
  persona: z.enum(['athlete', 'individual']),
  source: PersonaSourceSchema,
  completion_seconds: z.number().int().min(0).max(900).optional(),
});

const OptionalSecondsSchema = z.number().int().min(1).max(21600).optional();
const OptionalPositiveNumberSchema = z.number().min(0).max(10000).optional();
const OptionalOneToFiveSchema = z.number().int().min(1).max(5).optional();
const FmsScoreSchema = z.number().int().min(0).max(3);

export const OnboardingV2Phase2SubmissionSchema = z
  .discriminatedUnion('day', [
    Phase2BaseSchema.extend({
      day: z.literal('day1_aerobic'),
      resting_hr_bpm: z.number().int().min(30).max(130).optional(),
      cooper_distance_meters: z.number().int().min(400).max(5000).optional(),
      run_1km_seconds: OptionalSecondsSchema,
      run_5km_seconds: OptionalSecondsSchema,
      run_10km_seconds: OptionalSecondsSchema,
      walk_1km_seconds: OptionalSecondsSchema,
      stairs_flights_completed: z.number().int().min(0).max(150).optional(),
      perceived_exertion_1_to_10: z.number().int().min(1).max(10).optional(),
    }),
    Phase2BaseSchema.extend({
      day: z.literal('day2_strength_power'),
      squat_1rm_kg: OptionalPositiveNumberSchema,
      deadlift_1rm_kg: OptionalPositiveNumberSchema,
      bench_1rm_kg: OptionalPositiveNumberSchema,
      ohp_1rm_kg: OptionalPositiveNumberSchema,
      vertical_jump_cm: z.number().min(0).max(150).optional(),
      broad_jump_cm: z.number().min(0).max(400).optional(),
      pushups_60s: z.number().int().min(0).max(200).optional(),
      plank_hold_seconds: z.number().int().min(0).max(1800).optional(),
      strength_training_past_year: z.boolean().optional(),
    }),
    Phase2BaseSchema.extend({
      day: z.literal('day3_movement_quality'),
      fms: z
        .object({
          aslr_left: FmsScoreSchema.optional(),
          aslr_right: FmsScoreSchema.optional(),
          shoulder_left: FmsScoreSchema.optional(),
          shoulder_right: FmsScoreSchema.optional(),
          trunk_pushup: FmsScoreSchema.optional(),
          single_leg_squat_left: FmsScoreSchema.optional(),
          single_leg_squat_right: FmsScoreSchema.optional(),
          inline_lunge_left: FmsScoreSchema.optional(),
          inline_lunge_right: FmsScoreSchema.optional(),
        })
        .default({}),
      self_reported_pain_0_to_10: z.number().int().min(0).max(10).optional(),
      camera_baseline_completed: z.boolean().default(false),
      notes: z.string().trim().max(240).optional(),
    }),
    Phase2BaseSchema.extend({
      day: z.literal('day4_anaerobic_recovery'),
      sprint_100m_seconds: z.number().min(8).max(90).optional(),
      rsa_6x30m_best_seconds: z.number().min(3).max(30).optional(),
      rsa_6x30m_average_seconds: z.number().min(3).max(45).optional(),
      recovery_hr_drop_bpm_60s: z.number().int().min(0).max(120).optional(),
      hrv_ppg_ms: z.number().min(0).max(300).optional(),
      recovery_rating_1_to_5: OptionalOneToFiveSchema,
    }),
    Phase2BaseSchema.extend({
      day: z.literal('day5_nutrition'),
      nutrition: NutritionProfileSchema,
      body_mass_kg: z.number().min(30).max(250).optional(),
      training_hours_per_week: z.number().min(0).max(45),
      target_protein_g_per_kg: z.number().min(0.8).max(2.6).default(1.6),
      recent_weight_loss_pct: z.number().min(0).max(30).optional(),
      missed_periods_last_90_days: z.number().int().min(0).max(6).optional(),
      fatigue_score_1_to_5: OptionalOneToFiveSchema,
    }),
    Phase2BaseSchema.extend({
      day: z.literal('day6_psych_sleep'),
      apsq10: Apsq10Schema.optional(),
      sleep_baseline: z
        .object({
          avg_sleep_hours: z.number().min(0).max(14),
          sleep_quality_1_to_5: OptionalOneToFiveSchema,
          wakeups_per_night: z.number().int().min(0).max(20).optional(),
          bedtime_consistency_1_to_5: OptionalOneToFiveSchema,
          screen_before_bed_minutes: z.number().int().min(0).max(600).optional(),
        })
        .optional(),
      life_stress_1_to_5: OptionalOneToFiveSchema,
    }),
    Phase2BaseSchema.extend({
      day: z.literal('day7_environment'),
      environment: EnvironmentalContextSchema,
      heat_index_c: z.number().min(-20).max(60).optional(),
      aqi: z.number().int().min(0).max(500).optional(),
      training_surface: z.enum(['grass', 'turf', 'track', 'road', 'gym_floor', 'mixed']).optional(),
      heat_acclimated: z.boolean().optional(),
    }),
  ])
  .superRefine((payload, context) => {
    if (payload.day === 'day1_aerobic') {
      const hasMetric = Boolean(
        payload.resting_hr_bpm ||
          payload.cooper_distance_meters ||
          payload.run_1km_seconds ||
          payload.run_5km_seconds ||
          payload.run_10km_seconds ||
          payload.walk_1km_seconds ||
          payload.stairs_flights_completed
      );
      if (!hasMetric) {
        context.addIssue({
          code: 'custom',
          message: 'Add at least one aerobic or resting heart-rate measure.',
        });
      }
    }

    if (payload.day === 'day2_strength_power') {
      const hasMetric = Boolean(
        payload.squat_1rm_kg ||
          payload.deadlift_1rm_kg ||
          payload.bench_1rm_kg ||
          payload.ohp_1rm_kg ||
          payload.vertical_jump_cm ||
          payload.broad_jump_cm ||
          payload.pushups_60s ||
          payload.plank_hold_seconds
      );
      if (!hasMetric) {
        context.addIssue({
          code: 'custom',
          message: 'Add at least one strength or power measure.',
        });
      }
    }

    if (payload.day === 'day3_movement_quality') {
      const hasFms = Object.values(payload.fms).some((value) => value !== undefined);
      if (!hasFms && payload.self_reported_pain_0_to_10 === undefined && !payload.camera_baseline_completed) {
        context.addIssue({
          code: 'custom',
          message: 'Add an FMS score, pain score, or completed camera baseline.',
        });
      }
    }

    if (payload.day === 'day4_anaerobic_recovery') {
      const hasMetric = Boolean(
        payload.sprint_100m_seconds ||
          payload.rsa_6x30m_best_seconds ||
          payload.rsa_6x30m_average_seconds ||
          payload.recovery_hr_drop_bpm_60s ||
          payload.hrv_ppg_ms ||
          payload.recovery_rating_1_to_5
      );
      if (!hasMetric) {
        context.addIssue({
          code: 'custom',
          message: 'Add at least one anaerobic or recovery measure.',
        });
      }
    }

    if (payload.day === 'day6_psych_sleep' && !payload.apsq10 && !payload.sleep_baseline) {
      context.addIssue({
        code: 'custom',
        message: 'Add APSQ-10 responses or a sleep baseline.',
      });
    }
  });

export const OnboardingV2DailyRitualSubmissionSchema = z.object({
  phase: z.literal(3).default(3),
  persona: z.enum(['athlete', 'individual']),
  source: PersonaSourceSchema,
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  energy: z.number().int().min(1).max(5),
  body_feel: z.number().int().min(1).max(5),
  mental_load: z.number().int().min(1).max(5),
  sleep_hours_self: z.number().min(0).max(16).optional(),
  sleep_quality_self: z.number().int().min(1).max(10).optional(),
  pain_locations: z.array(z.string().trim().min(1).max(60)).max(8).default([]),
  pain_scores: z.record(z.string(), z.number().int().min(0).max(10)).default({}),
  apsq3: z.array(z.number().int().min(0).max(4)).length(3).optional(),
  wants_recovery_day: z.boolean().default(false),
  completion_seconds: z.number().int().min(0).max(180).optional(),
});

export const OnboardingV2Phase1SubmissionSchema = z
  .object({
    phase: z.literal(1).default(1),
    persona: PersonaSchema,
    source: PersonaSourceSchema,
    identity: IdentitySchema,
    sport: OnboardingV2SportSpecificitySchema,
    goal: OnboardingV2GoalAnchorSchema,
    training_load: TrainingLoadSnapshotSchema.optional(),
    orthopedic_history: z.array(OrthopedicHistoryEntrySchema).max(5).default([]),
    wearable: OnboardingV2WearablePreferenceSchema,
    squad: SquadSetupSchema.optional(),
    completion_seconds: z.number().int().min(0).max(900),
  })
  .superRefine((payload, context) => {
    if (payload.persona !== 'coach' && !payload.training_load) {
      context.addIssue({
        code: 'custom',
        path: ['training_load'],
        message: 'Training load snapshot is required for athlete and individual onboarding.',
      });
    }

    if (payload.persona === 'coach' && !payload.squad) {
      context.addIssue({
        code: 'custom',
        path: ['squad'],
        message: 'Coach squad setup is required for coach onboarding.',
      });
    }
  });

export type OnboardingV2SafetyGateSubmission = z.infer<
  typeof OnboardingV2SafetyGateSubmissionSchema
>;
export type OnboardingV2Phase1Submission = z.infer<
  typeof OnboardingV2Phase1SubmissionSchema
>;
export type NutritionProfile = z.infer<typeof NutritionProfileSchema>;
export type OnboardingV2Phase2Day = z.infer<typeof OnboardingV2Phase2DaySchema>;
export type OnboardingV2Phase2Submission = z.infer<
  typeof OnboardingV2Phase2SubmissionSchema
>;
export type OnboardingV2DailyRitualSubmission = z.infer<
  typeof OnboardingV2DailyRitualSubmissionSchema
>;
