import { z } from 'zod';

export const PregnancyStatusSchema = z
  .enum(['not_applicable', 'pregnant', 'trying_to_conceive', 'postpartum', 'no'])
  .default('not_applicable');

export const ParqPlusSchema = z.object({
  q1_heart_condition: z.boolean(),
  q2_chest_pain_activity: z.boolean(),
  q3_chest_pain_rest: z.boolean(),
  q4_dizziness_loc: z.boolean(),
  q5_bone_joint_problem: z.boolean(),
  q6_bp_heart_meds: z.boolean(),
  q7_other_reason: z.boolean(),
  q7_other_reason_text: z.string().trim().max(200).optional(),
  pregnancy_status: PregnancyStatusSchema,
  cycle_tracking_optin: z.boolean().default(false),
});

export type ParqPlus = z.infer<typeof ParqPlusSchema>;

export function isAnyParqYes(screening: ParqPlus) {
  return (
    screening.q1_heart_condition ||
    screening.q2_chest_pain_activity ||
    screening.q3_chest_pain_rest ||
    screening.q4_dizziness_loc ||
    screening.q5_bone_joint_problem ||
    screening.q6_bp_heart_meds ||
    screening.q7_other_reason
  );
}
