import { getApiBaseUrl } from "./base-url";

export interface VehicleBrand {
  id: string;
  nameFa: string;
  nameEn: string | null;
  slug: string;
}

export interface VehicleClass {
  id: string;
  code: string;
  nameFa: string;
  nameEn: string | null;
  vehicleType: "CAR" | "MOTORCYCLE";
}

export interface VehicleModel {
  id: string;
  nameFa: string;
  nameEn: string | null;
  slug: string;
  aliases: string[];
  vehicleClass: VehicleClass;
}

interface ApiDataResponse<T> {
  data: T;
}

async function apiGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    signal,
  });

  if (!response.ok) {
    throw new Error(
      `BestWash API request failed with status ${response.status}.`,
    );
  }

  const payload = (await response.json()) as ApiDataResponse<T>;

  return payload.data;
}

export function getVehicleClasses(
  signal?: AbortSignal,
): Promise<VehicleClass[]> {
  return apiGet<VehicleClass[]>("/vehicle-classes", signal);
}

export function getVehicleBrands(
  signal?: AbortSignal,
): Promise<VehicleBrand[]> {
  return apiGet<VehicleBrand[]>("/vehicle-brands", signal);
}

export function getVehicleModels(
  brandId: string,
  signal?: AbortSignal,
): Promise<VehicleModel[]> {
  return apiGet<VehicleModel[]>(
    `/vehicle-brands/${encodeURIComponent(brandId)}/models`,
    signal,
  );
}
