import { z } from 'zod';

import { ParqPlusSchema } from './medical-screening';
import { PersonaSchema, PersonaSourceSchema } from './persona';

export const OnboardingV2SafetyGateSubmissionSchema = z.object({
  persona: PersonaSchema,
  source: PersonaSourceSchema,
  parq: ParqPlusSchema,
  completion_seconds: z.number().int().min(0).max(900),
});

export type OnboardingV2SafetyGateSubmission = z.infer<
  typeof OnboardingV2SafetyGateSubmissionSchema
>;
