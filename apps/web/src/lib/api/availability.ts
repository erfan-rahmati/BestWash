import { getApiBaseUrl } from "./base-url";

export interface AvailabilityDay {
  date: string;
  isOpen: boolean;
  reason: string | null;
  availableSlots: number;
  firstAvailableTime: string | null;
}

export interface AvailabilityDays {
  timezone: string;
  durationMinutes: number;
  days: AvailabilityDay[];
}

export interface AvailabilitySlot {
  startAt: string;
  endAt: string;
  localDate: string;
  localTime: string;
  remainingCapacity: number;
  isAvailable: boolean;
  reason: string | null;
}

export interface AvailabilitySlots {
  timezone: string;
  date: string;
  isOpen: boolean;
  reason: string | null;
  durationMinutes: number;
  openMinute: number;
  closeMinute: number;
  slots: AvailabilitySlot[];
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
      `Availability request failed with status ${response.status}.`,
    );
  }

  const payload = (await response.json()) as ApiDataResponse<T>;

  return payload.data;
}

export function getAvailabilityDays(
  durationMinutes: number,
  signal?: AbortSignal,
): Promise<AvailabilityDays> {
  const query = new URLSearchParams({
    days: "14",
    durationMinutes: String(durationMinutes),
  });

  return apiGet<AvailabilityDays>(
    `/availability/days?${query.toString()}`,
    signal,
  );
}

export function getAvailabilitySlots(
  date: string,
  durationMinutes: number,
  signal?: AbortSignal,
): Promise<AvailabilitySlots> {
  const query = new URLSearchParams({
    date,
    durationMinutes: String(durationMinutes),
  });

  return apiGet<AvailabilitySlots>(
    `/availability/slots?${query.toString()}`,
    signal,
  );
}
