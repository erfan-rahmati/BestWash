import type { BookingHoldData } from "./api/booking-holds";
import type {
  BookingServiceSelection,
  BookingTimeSelection,
  BookingVehicleSelection,
} from "./booking-types";

const BOOKING_SESSION_KEY = "bestwash.booking-flow.v1";

export interface BookingSessionDraft {
  version: 2;

  currentStep: 4 | 5;

  vehicleSelection: BookingVehicleSelection;

  serviceSelection: BookingServiceSelection;

  timeSelection: BookingTimeSelection;

  hold: BookingHoldData;

  checkoutToken: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseBookingSessionDraft(value: unknown): BookingSessionDraft | null {
  if (!isRecord(value)) {
    return null;
  }

  if (value.version !== 1 && value.version !== 2) {
    return null;
  }

  if (value.currentStep !== 4 && value.currentStep !== 5) {
    return null;
  }

  if (
    !isRecord(value.vehicleSelection) ||
    !isRecord(value.serviceSelection) ||
    !isRecord(value.timeSelection) ||
    !isRecord(value.hold)
  ) {
    return null;
  }

  if (
    typeof value.hold.token !== "string" ||
    typeof value.hold.expiresAt !== "string" ||
    typeof value.timeSelection.startAt !== "string"
  ) {
    return null;
  }

  let checkoutToken: string | null = null;

  if (value.version === 2) {
    if (
      value.checkoutToken !== null &&
      typeof value.checkoutToken !== "string"
    ) {
      return null;
    }

    if (typeof value.checkoutToken === "string") {
      const normalizedToken = value.checkoutToken.trim();

      checkoutToken = normalizedToken || null;
    }
  }

  if (value.currentStep === 4) {
    checkoutToken = null;
  }

  return {
    version: 2,

    currentStep: value.currentStep,

    vehicleSelection:
      value.vehicleSelection as unknown as BookingVehicleSelection,

    serviceSelection:
      value.serviceSelection as unknown as BookingServiceSelection,

    timeSelection: value.timeSelection as unknown as BookingTimeSelection,

    hold: value.hold as unknown as BookingHoldData,

    checkoutToken,
  };
}

export function loadBookingSessionDraft(): BookingSessionDraft | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(BOOKING_SESSION_KEY);

    if (!raw) {
      return null;
    }

    const parsed: unknown = JSON.parse(raw);

    const draft = parseBookingSessionDraft(parsed);

    if (!draft) {
      clearBookingSessionDraft();

      return null;
    }

    /*
     * Existing version 1 drafts are transparently migrated
     * to version 2 without losing an ACTIVE hold.
     */
    if (isRecord(parsed) && parsed.version === 1) {
      saveBookingSessionDraft(draft);
    }

    return draft;
  } catch {
    clearBookingSessionDraft();

    return null;
  }
}

export function saveBookingSessionDraft(draft: BookingSessionDraft): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(BOOKING_SESSION_KEY, JSON.stringify(draft));
  } catch {
    // sessionStorage may be unavailable in restricted browser modes.
  }
}

export function clearBookingSessionDraft(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.removeItem(BOOKING_SESSION_KEY);
  } catch {
    // Ignore unavailable sessionStorage.
  }
}
