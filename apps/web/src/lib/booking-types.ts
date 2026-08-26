import type {
  ServiceAddonOption,
  ServicePackageOption,
} from "./api/service-catalog";
import type {
  VehicleBrand,
  VehicleClass,
  VehicleModel,
} from "./api/vehicle-catalog";
import type { IranPlateResult } from "./iran-plate";

export interface BookingVehicleSelection {
  sourceMode: "CATALOG" | "CUSTOM";
  vehicleClass: VehicleClass;
  brand: VehicleBrand | null;
  model: VehicleModel | null;
  customBrand: string;
  customModel: string;
  color: string;
  productionYear: string;
  nickname: string;
  plate: IranPlateResult;
}

export interface BookingServiceSelection {
  package: ServicePackageOption;
  addons: ServiceAddonOption[];
  totalAmountRial: number;
  totalDurationMinutes: number;
}

export interface BookingTimeSelection {
  date: string;
  startAt: string;
  endAt: string;
  localTime: string;
  timezone: string;
  remainingCapacity: number;
}
