import { z } from 'zod';

export const PersonaSchema = z.enum(['athlete', 'individual', 'coach']);
export type Persona = z.infer<typeof PersonaSchema>;

export const PersonaSourceSchema = z.enum(['web', 'mobile']);
export type PersonaSource = z.infer<typeof PersonaSourceSchema>;
