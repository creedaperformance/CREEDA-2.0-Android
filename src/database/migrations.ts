import { schemaMigrations, createTable } from '@nozbe/watermelondb/Schema/migrations';

export const migrations = schemaMigrations({
  migrations: [
    {
      toVersion: 2,
      steps: [
        createTable({
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
    },
  ],
});
