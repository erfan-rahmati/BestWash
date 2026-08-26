export type VehicleType = "CAR" | "MOTORCYCLE";

export type IranPlateType = "IRAN_CAR" | "IRAN_MOTORCYCLE";

export interface IranCarPlate {
  plateType: "IRAN_CAR";
  firstTwo: string;
  letter: string;
  middleThree: string;
  iranCode: string;
}

export interface IranMotorcyclePlate {
  plateType: "IRAN_MOTORCYCLE";
  topThree: string;
  bottomFive: string;
}

export type IranPlateValue = IranCarPlate | IranMotorcyclePlate;

export interface IranPlateResult {
  value: IranPlateValue;
  isValid: boolean;
  normalized: string;
}

export const IRAN_CAR_PLATE_LETTERS = [
  "ب",
  "ج",
  "د",
  "س",
  "ص",
  "ط",
  "ق",
  "ل",
  "م",
  "ن",
  "و",
  "ه",
  "ی",
] as const;

const persianDigits = "۰۱۲۳۴۵۶۷۸۹";

const arabicDigits = "٠١٢٣٤٥٦٧٨٩";

export function normalizeDigits(value: string): string {
  return value
    .replace(/[۰-۹]/g, (digit) => String(persianDigits.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String(arabicDigits.indexOf(digit)))
    .replace(/\D/g, "");
}

export function toPersianDigits(value: string): string {
  return value.replace(/\d/g, (digit) => persianDigits[Number(digit)] ?? digit);
}

export function createEmptyIranPlate(vehicleType: VehicleType): IranPlateValue {
  if (vehicleType === "MOTORCYCLE") {
    return {
      plateType: "IRAN_MOTORCYCLE",
      topThree: "",
      bottomFive: "",
    };
  }

  return {
    plateType: "IRAN_CAR",
    firstTwo: "",
    letter: "",
    middleThree: "",
    iranCode: "",
  };
}

export function getIranPlateResult(value: IranPlateValue): IranPlateResult {
  if (value.plateType === "IRAN_MOTORCYCLE") {
    const isValid =
      value.topThree.length === 3 && value.bottomFive.length === 5;

    return {
      value,
      isValid,
      normalized: isValid ? `${value.topThree}${value.bottomFive}` : "",
    };
  }

  const isValid =
    value.firstTwo.length === 2 &&
    Boolean(value.letter) &&
    value.middleThree.length === 3 &&
    value.iranCode.length === 2;

  return {
    value,
    isValid,
    normalized: isValid
      ? `${value.firstTwo}${value.letter}${value.middleThree}ایران${value.iranCode}`
      : "",
  };
}
