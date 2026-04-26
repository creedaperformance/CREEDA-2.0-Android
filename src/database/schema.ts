import { appSchema, tableSchema } from '@nozbe/watermelondb'

export const schema = appSchema({
  version: 2,
  tables: [
    tableSchema({
      name: 'profiles',
      columns: [
        { name: 'role', type: 'string' },
        { name: 'onboarding_completed', type: 'boolean' },
        { name: 'updated_at', type: 'number', isOptional: true },
        // other Supabase mirror fields
      ],
    }),
    tableSchema({
      name: 'daily_checkins',
      columns: [
        { name: 'athlete_id', type: 'string', isIndexed: true },
        { name: 'date', type: 'string' },
        { name: 'readiness_score', type: 'number' },
        { name: 'decision', type: 'string' },
        { name: 'synced_to_remote', type: 'boolean' }, // Local offline flag
      ],
    }),
    tableSchema({
      name: 'notifications',
      columns: [
        { name: 'title', type: 'string' },
        { name: 'body', type: 'string' },
        { name: 'is_read', type: 'boolean' },
        { name: 'created_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'onboarding_v2_submissions',
      columns: [
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'persona', type: 'string' },
        { name: 'payload_json', type: 'string' },
        { name: 'status', type: 'string', isIndexed: true },
        { name: 'remote_error', type: 'string', isOptional: true },
        { name: 'created_at_ms', type: 'number' },
        { name: 'updated_at_ms', type: 'number' },
      ],
    }),
  ],
})
