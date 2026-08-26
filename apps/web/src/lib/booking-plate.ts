import { getIranPlateResult, type IranPlateResult } from "./iran-plate";

type PlateSource = {
  plateNormalized?: unknown;
  customerVehicle?: unknown;
  plateType?: unknown;
  plateFirstTwo?: unknown;
  plateLetter?: unknown;
  plateMiddleThree?: unknown;
  plateIranCode?: unknown;
  motorcycleTopThree?: unknown;
  motorcycleBottomFive?: unknown;
  carPlateFirstTwo?: unknown;
  carPlateLetter?: unknown;
  carPlateMiddleThree?: unknown;
  carPlateIranCode?: unknown;
  motorcyclePlateTop?: unknown;
  motorcyclePlateBottom?: unknown;
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function firstText(...values: unknown[]): string {
  for (const value of values) {
    if (value !== null && value !== undefined && String(value).trim()) {
      return String(value).trim();
    }
  }
  return "";
}

function normalizePlateText(value: string): string {
  const persianDigits = "۰۱۲۳۴۵۶۷۸۹";
  const arabicDigits = "٠١٢٣٤٥٦٧٨٩";
  return value
    .replace(/[\s-]/g, "")
    .replace(/[۰-۹]/g, (digit) => String(persianDigits.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String(arabicDigits.indexOf(digit)));
}

export function plateFromBooking(source: PlateSource): IranPlateResult {
  const booking = record(source);
  const vehicle = record(source.customerVehicle);
  const type = firstText(vehicle.plateType, booking.plateType);
  const normalized = normalizePlateText(
    firstText(vehicle.plateNormalized, booking.plateNormalized),
  );

  const motorcycleTop = firstText(
    vehicle.motorcyclePlateTop,
    vehicle.motorcycleTopThree,
    booking.motorcyclePlateTop,
    booking.motorcycleTopThree,
  );
  const motorcycleBottom = firstText(
    vehicle.motorcyclePlateBottom,
    vehicle.motorcycleBottomFive,
    booking.motorcyclePlateBottom,
    booking.motorcycleBottomFive,
  );
  if (type === "IRAN_MOTORCYCLE" && motorcycleTop && motorcycleBottom) {
    return getIranPlateResult({
      plateType: "IRAN_MOTORCYCLE",
      topThree: motorcycleTop,
      bottomFive: motorcycleBottom,
    });
  }

  const firstTwo = firstText(
    vehicle.carPlateFirstTwo,
    vehicle.plateFirstTwo,
    booking.carPlateFirstTwo,
    booking.plateFirstTwo,
  );
  const letter = firstText(
    vehicle.carPlateLetter,
    vehicle.plateLetter,
    booking.carPlateLetter,
    booking.plateLetter,
  );
  const middleThree = firstText(
    vehicle.carPlateMiddleThree,
    vehicle.plateMiddleThree,
    booking.carPlateMiddleThree,
    booking.plateMiddleThree,
  );
  const iranCode = firstText(
    vehicle.carPlateIranCode,
    vehicle.plateIranCode,
    booking.carPlateIranCode,
    booking.plateIranCode,
  );
  if (firstTwo && letter && middleThree && iranCode) {
    return getIranPlateResult({
      plateType: "IRAN_CAR",
      firstTwo,
      letter,
      middleThree,
      iranCode,
    });
  }

  const car = normalized.match(/^(\d{2})([^\d])(\d{3})(?:ایران)?(\d{2})$/);
  if (car) {
    return getIranPlateResult({
      plateType: "IRAN_CAR",
      firstTwo: car[1],
      letter: car[2],
      middleThree: car[3],
      iranCode: car[4],
    });
  }

  const digits = normalized.replace(/\D/g, "");
  return getIranPlateResult({
    plateType: "IRAN_MOTORCYCLE",
    topThree: motorcycleTop || digits.slice(0, 3),
    bottomFive: motorcycleBottom || digits.slice(3, 8),
  });
}
