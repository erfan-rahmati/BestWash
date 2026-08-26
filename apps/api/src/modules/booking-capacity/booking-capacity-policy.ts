export function calculateCapacityDurationMinutes(
  durationMinutes: number,
  bucketMinutes: number,
  overlapToleranceMinutes: number,
): number {
  if (!Number.isInteger(durationMinutes) || durationMinutes <= 0) {
    throw new RangeError('durationMinutes must be a positive integer.');
  }

  if (!Number.isInteger(bucketMinutes) || bucketMinutes <= 0) {
    throw new RangeError('bucketMinutes must be a positive integer.');
  }

  if (
    !Number.isInteger(overlapToleranceMinutes) ||
    overlapToleranceMinutes < 0
  ) {
    throw new RangeError(
      'overlapToleranceMinutes must be a non-negative integer.',
    );
  }

  const effectiveDurationMinutes = Math.max(
    1,
    durationMinutes - overlapToleranceMinutes,
  );

  return Math.ceil(effectiveDurationMinutes / bucketMinutes) * bucketMinutes;
}
