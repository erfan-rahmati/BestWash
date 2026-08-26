import { getApiBaseUrl } from "./base-url";

export type BookingHoldStatus =
  "ACTIVE" | "CONVERTED" | "CANCELLED" | "EXPIRED";

export interface BookingHoldData {
  token: string;
  status: BookingHoldStatus;
  expiresAt: string;
  startsAt: string;
  endsAt: string;
  durationMinutes: number;
  totalAmountRial: number;
  vehicleClass: {
    id: string;
    code: string;
    nameFa: string;
    vehicleType: "CAR" | "MOTORCYCLE";
  };
  package: {
    id: string;
    code: string;
    nameFa: string;
  };
  addons: {
    id: string;
    code: string;
    nameFa: string;
  }[];
}

export interface CreateBookingHoldInput {
  vehicleClassId: string;
  packageId: string;
  addonIds: string[];
  startAt: string;
}

interface ApiDataResponse<T> {
  data: T;
}

export class BookingHoldApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "BookingHoldApiError";
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

export async function createBookingHold(
  input: CreateBookingHoldInput,
  signal?: AbortSignal,
): Promise<BookingHoldData> {
  const response = await fetch(`${getApiBaseUrl()}/booking-holds`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
    signal,
  });

  if (!response.ok) {
    throw new BookingHoldApiError(
      response.status,
      await parseErrorMessage(response),
    );
  }

  const payload = (await response.json()) as ApiDataResponse<BookingHoldData>;

  return payload.data;
}

export async function getBookingHold(
  token: string,
  signal?: AbortSignal,
): Promise<BookingHoldData> {
  const response = await fetch(
    `${getApiBaseUrl()}/booking-holds/${encodeURIComponent(token)}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      signal,
    },
  );

  if (!response.ok) {
    throw new BookingHoldApiError(
      response.status,
      await parseErrorMessage(response),
    );
  }

  const payload = (await response.json()) as ApiDataResponse<BookingHoldData>;

  return payload.data;
}

export async function cancelBookingHold(token: string): Promise<{
  status: BookingHoldStatus;
}> {
  const response = await fetch(
    `${getApiBaseUrl()}/booking-holds/${encodeURIComponent(token)}`,
    {
      method: "DELETE",
      headers: {
        Accept: "application/json",
      },
    },
  );

  if (!response.ok) {
    throw new BookingHoldApiError(
      response.status,
      await parseErrorMessage(response),
    );
  }

  const payload = (await response.json()) as ApiDataResponse<{
    status: BookingHoldStatus;
  }>;

  return payload.data;
}
