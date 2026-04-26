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
