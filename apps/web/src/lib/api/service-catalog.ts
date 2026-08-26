import { getApiBaseUrl } from "./base-url";

export interface CatalogVehicleClass {
  id: string;
  code: string;
  nameFa: string;
  nameEn: string | null;
  vehicleType: "CAR" | "MOTORCYCLE";
}

export interface PackageService {
  id: string;
  code: string;
  nameFa: string;
  nameEn: string | null;
}

export interface ServicePackageOption {
  id: string;
  code: string;
  nameFa: string;
  nameEn: string | null;
  descriptionFa: string | null;
  badgeFa: string | null;
  durationMinutes: number;
  isFeatured: boolean;
  amountRial: number;
  services: PackageService[];
}

export interface ServiceAddonOption {
  id: string;
  code: string;
  nameFa: string;
  nameEn: string | null;
  descriptionFa: string | null;
  durationMinutes: number;
  isRecommended: boolean;
  amountRial: number;
}

export interface ServiceCatalog {
  vehicleClass: CatalogVehicleClass;
  packages: ServicePackageOption[];
  addons: ServiceAddonOption[];
}

interface ApiDataResponse<T> {
  data: T;
}

export async function getServiceCatalog(
  vehicleClassId: string,
  signal?: AbortSignal,
): Promise<ServiceCatalog> {
  const response = await fetch(
    `${getApiBaseUrl()}/service-catalog/vehicle-classes/${encodeURIComponent(
      vehicleClassId,
    )}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      signal,
    },
  );

  if (!response.ok) {
    throw new Error(
      `Service catalog request failed with status ${response.status}.`,
    );
  }

  const payload = (await response.json()) as ApiDataResponse<ServiceCatalog>;

  return payload.data;
}
