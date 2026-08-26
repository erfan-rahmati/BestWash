/// <reference types="jest" />

import { calculateCapacityDurationMinutes } from './booking-capacity-policy';

describe('calculateCapacityDurationMinutes', () => {
  const bucketMinutes = 15;
  const overlapToleranceMinutes = 10;

  const cases: Array<[number, number]> = [
    [40, 30],
    [55, 45],
    [90, 90],
  ];

  it.each(cases)(
    'maps %i service minutes to %i occupied minutes',
    (durationMinutes: number, expectedOccupiedMinutes: number) => {
      expect(
        calculateCapacityDurationMinutes(
          durationMinutes,
          bucketMinutes,
          overlapToleranceMinutes,
        ),
      ).toBe(expectedOccupiedMinutes);
    },
  );

  it('always reserves at least one capacity bucket', () => {
    expect(
      calculateCapacityDurationMinutes(
        10,
        bucketMinutes,
        overlapToleranceMinutes,
      ),
    ).toBe(15);
  });
});
