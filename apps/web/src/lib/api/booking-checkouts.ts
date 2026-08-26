import type { BookingVehicleSelection } from "../booking-types";
import type { BookingHoldStatus } from "./booking-holds";
import { getApiBaseUrl } from "./base-url";

export type BookingCheckoutStatus =
  "PENDING" | "PAID" | "FAILED" | "CANCELLED" | "EXPIRED" | "CONSUMED";

export interface BookingCheckoutData {
  id: string;
  token: string;

  holdId: string;
  customerId: string | null;

  status: BookingCheckoutStatus;

  amountRial: number;

  vehicleSnapshot: unknown;

  expiresAt: string;

  paidAt: string | null;
  consumedAt: string | null;

  createdAt: string;
  updatedAt: string;

  hold?: {
    token: string;
    status: BookingHoldStatus;

    startsAt: string;
    endsAt: string;

    durationMinutes: number;
    totalAmountRial: number;

    expiresAt: string;

    package: {
      id: string;
      code: string;
      nameFa: string;
    };
  };
}

interface ApiDataResponse<T> {
  data: T;
}

type BookingCheckoutPlatePayload =
  | {
      type: "IRAN_CAR";
      firstTwo: string;
      letter: string;
      middleThree: string;
      iranCode: string;
    }
  | {
      type: "IRAN_MOTORCYCLE";
      motorcycleTop: string;
      motorcycleBottom: string;
    };

interface BookingCheckoutVehiclePayload {
  sourceMode: BookingVehicleSelection["sourceMode"];

  modelId?: string;

  customBrand?: string;
  customModel?: string;

  color: string;

  productionYear: string | null;

  nickname: string | null;

  plate: BookingCheckoutPlatePayload;
}

interface CreateBookingCheckoutPayload {
  holdToken: string;
  vehicle: BookingCheckoutVehiclePayload;
}

export class BookingCheckoutApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);

    this.name = "BookingCheckoutApiError";
    this.status = status;
  }
}

async function parseErrorMessage(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as {
      message?: string | string[];
    };

    if (Array.isArray(payload.message)) {
      return payload.message.join(" ");
    }

    if (typeof payload.message === "string") {
      return payload.message;
    }
  } catch {
    // Ignore malformed error bodies.
  }

  return `Request failed with status ${response.status}.`;
}

function buildPlatePayload(
  plate: BookingVehicleSelection["plate"],
): BookingCheckoutPlatePayload {
  const value = plate.value;

  if (value.plateType === "IRAN_CAR") {
    return {
      type: "IRAN_CAR",

      firstTwo: value.firstTwo,
      letter: value.letter,
      middleThree: value.middleThree,
      iranCode: value.iranCode,
    };
  }

  return {
    type: "IRAN_MOTORCYCLE",

    motorcycleTop: value.topThree,
    motorcycleBottom: value.bottomFive,
  };
}

function buildVehiclePayload(
  vehicle: BookingVehicleSelection,
): BookingCheckoutVehiclePayload {
  const productionYear = vehicle.productionYear.trim();

  const nickname = vehicle.nickname.trim();

  const plate = buildPlatePayload(vehicle.plate);

  if (vehicle.sourceMode === "CATALOG") {
    return {
      sourceMode: "CATALOG",

      modelId: vehicle.model?.id,

      color: vehicle.color,

      productionYear: productionYear || null,

      nickname: nickname || null,

      plate,
    };
  }

  return {
    sourceMode: "CUSTOM",

    customBrand: vehicle.customBrand,
    customModel: vehicle.customModel,

    color: vehicle.color,

    productionYear: productionYear || null,

    nickname: nickname || null,

    plate,
  };
}

export async function createBookingCheckout(
  holdToken: string,
  vehicle: BookingVehicleSelection,
  signal?: AbortSignal,
): Promise<BookingCheckoutData> {
  const payload: CreateBookingCheckoutPayload = {
    holdToken,
    vehicle: buildVehiclePayload(vehicle),
  };

  const response = await fetch(`${getApiBaseUrl()}/booking-checkouts`, {
    method: "POST",

    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },

    body: JSON.stringify(payload),

    signal,
  });

  if (!response.ok) {
    throw new BookingCheckoutApiError(
      response.status,
      await parseErrorMessage(response),
    );
  }

  const result =
    (await response.json()) as ApiDataResponse<BookingCheckoutData>;

  return result.data;
}

export async function getBookingCheckout(
  token: string,
  signal?: AbortSignal,
): Promise<BookingCheckoutData> {
  const response = await fetch(
    `${getApiBaseUrl()}/booking-checkouts/${encodeURIComponent(token)}`,
    {
      method: "GET",

      headers: {
        Accept: "application/json",
      },

      signal,
    },
  );

  if (!response.ok) {
    throw new BookingCheckoutApiError(
      response.status,
      await parseErrorMessage(response),
    );
  }

  const result =
    (await response.json()) as ApiDataResponse<BookingCheckoutData>;

  return result.data;
}

export async function cancelBookingCheckout(token: string): Promise<{
  token: string;
  status: BookingCheckoutStatus;
}> {
  const response = await fetch(
    `${getApiBaseUrl()}/booking-checkouts/${encodeURIComponent(token)}`,
    {
      method: "DELETE",

      headers: {
        Accept: "application/json",
      },
    },
  );

  if (!response.ok) {
    throw new BookingCheckoutApiError(
      response.status,
      await parseErrorMessage(response),
    );
  }

  const result = (await response.json()) as ApiDataResponse<{
    token: string;
    status: BookingCheckoutStatus;
  }>;

  return result.data;
}
