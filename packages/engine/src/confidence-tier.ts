export type ConfidenceTier = 'low' | 'medium' | 'high' | 'locked';

export interface ConfidenceInputs {
  daysSinceOnboarding: number;
  dataPointsCollected: number;
  hasWearable: boolean;
  movementScansCount: number;
  capacityTestsCompleted: number;
  daysOfChronicLoad: number;
  daysOfCheckIns: number;
}

export function computeConfidence(input: ConfidenceInputs): {
  tier: ConfidenceTier;
  pct: number;
} {
  let points = 0;

  if (input.daysSinceOnboarding >= 0) points += 10;
  points += Math.min(15, input.dataPointsCollected * 0.5);
  if (input.hasWearable) points += 15;
  points += Math.min(15, input.movementScansCount * 5);
  points += Math.min(15, input.capacityTestsCompleted * 2);
  points += Math.min(20, input.daysOfChronicLoad * 0.7);
  points += Math.min(10, input.daysOfCheckIns * 0.4);

  const pct = Math.min(100, Math.round(points));
  const tier: ConfidenceTier =
    pct < 35 ? 'low' : pct < 65 ? 'medium' : pct < 90 ? 'high' : 'locked';

  return { tier, pct };
}
