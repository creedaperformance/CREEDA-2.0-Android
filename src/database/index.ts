import { Database } from '@nozbe/watermelondb'
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite'

import { schema } from './schema'
import { migrations } from './migrations'
import { DailyCheckin, Notification, OnboardingV2Submission, Profile } from './models'

// Set up the SQLite adapter (offline-first persistent storage)
const adapter = new SQLiteAdapter({
  schema,
  migrations,
  // (You might want to pass migrations here as the app grows)
  dbName: 'creeda_db', 
  jsi: true, // fast JSI mode for high performance array transfers
})

export const database = new Database({
  adapter,
  modelClasses: [
    Profile,
    DailyCheckin,
    Notification,
    OnboardingV2Submission,
  ],
})
