import { Q } from '@nozbe/watermelondb';

import type {
  OnboardingV2Phase1Submission,
  OnboardingV2SafetyGateSubmission,
} from '../../../packages/schemas/src';
import { database } from '../../database';
import type { OnboardingV2Submission } from '../../database/models';
import { submitOnboardingV2Phase1, submitOnboardingV2SafetyGate } from '../mobile-api';

const TABLE = 'onboarding_v2_submissions';

function getCollection() {
  return database.collections.get<OnboardingV2Submission>(TABLE);
}

export async function queueOnboardingV2SafetyGate(
  userId: string,
  payload: OnboardingV2SafetyGateSubmission
) {
  return queueOnboardingV2Submission(userId, payload);
}

export async function queueOnboardingV2Phase1(
  userId: string,
  payload: OnboardingV2Phase1Submission
) {
  return queueOnboardingV2Submission(userId, payload);
}

async function queueOnboardingV2Submission(
  userId: string,
  payload: OnboardingV2SafetyGateSubmission | OnboardingV2Phase1Submission
) {
  let queuedId = '';
  const now = Date.now();
  const collection = getCollection();

  await database.write(async () => {
    const record = await collection.create((draft) => {
      draft.userId = userId;
      draft.persona = payload.persona;
      draft.payloadJson = JSON.stringify(payload);
      draft.status = 'queued';
      draft.remoteError = null;
      draft.createdAtMs = now;
      draft.updatedAtMs = now;
    });
    queuedId = record.id;
  });

  return queuedId;
}

function isPhase1Payload(
  payload: OnboardingV2SafetyGateSubmission | OnboardingV2Phase1Submission
): payload is OnboardingV2Phase1Submission {
  return 'identity' in payload && 'sport' in payload;
}

export async function markOnboardingV2SubmissionSynced(queuedId: string) {
  const collection = getCollection();
  const record = await collection.find(queuedId);
  await database.write(async () => {
    await record.update((draft) => {
      draft.status = 'synced';
      draft.remoteError = null;
      draft.updatedAtMs = Date.now();
    });
  });
}

export async function markOnboardingV2SubmissionFailed(queuedId: string, error: string) {
  const collection = getCollection();
  const record = await collection.find(queuedId);
  await database.write(async () => {
    await record.update((draft) => {
      draft.status = 'failed';
      draft.remoteError = error.slice(0, 500);
      draft.updatedAtMs = Date.now();
    });
  });
}

export async function syncQueuedOnboardingV2Submissions(accessToken: string) {
  const collection = getCollection();
  const queued = await collection
    .query(Q.where('status', Q.oneOf(['queued', 'failed'])))
    .fetch();

  for (const record of queued) {
    try {
      const payload = JSON.parse(record.payloadJson) as
        | OnboardingV2SafetyGateSubmission
        | OnboardingV2Phase1Submission;
      if (isPhase1Payload(payload)) {
        await submitOnboardingV2Phase1(accessToken, payload);
      } else {
        await submitOnboardingV2SafetyGate(accessToken, payload);
      }
      await markOnboardingV2SubmissionSynced(record.id);
    } catch (error) {
      await markOnboardingV2SubmissionFailed(
        record.id,
        error instanceof Error ? error.message : 'Unable to sync onboarding v2 payload.'
      );
    }
  }

  return queued.length;
}
