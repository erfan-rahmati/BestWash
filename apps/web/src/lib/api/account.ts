import { getApiBaseUrl } from "./base-url";

const CUSTOMER_SESSION_HINT = "bw_customer_session_hint";

export type CustomerAuthSession =
  { authenticated: false } | { authenticated: true; customer: CustomerProfile };

let authSessionCache: CustomerAuthSession | null = null;
let authSessionPromise: Promise<CustomerAuthSession> | null = null;

export function hasCustomerSessionHint(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(CUSTOMER_SESSION_HINT) === "1";
  } catch {
    return false;
  }
}

function setCustomerSessionHint(authenticated: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (authenticated) window.localStorage.setItem(CUSTOMER_SESSION_HINT, "1");
    else window.localStorage.removeItem(CUSTOMER_SESSION_HINT);
  } catch {
    // Storage can be unavailable in restricted browser modes. The HttpOnly
    // cookie remains the only source of authentication authority.
  }
}

function cacheAuthSession(session: CustomerAuthSession): void {
  authSessionCache = session;
  authSessionPromise = null;
  setCustomerSessionHint(session.authenticated);
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body != null && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    cache: "no-store",
    credentials: "include",
    headers,
  });
  const payload = (await response.json().catch(() => null)) as {
    data?: T;
    error?: { code?: string; message?: string };
  } | null;
  if (!response.ok) {
    if (response.status === 401) cacheAuthSession({ authenticated: false });
    const error = new ApiError(
      response.status,
      payload?.error?.code ?? `HTTP_${response.status}`,
      payload?.error?.message ?? "ارتباط با سرور ناموفق بود.",
    );
    // A guest probe is an expected application state. Protected views render
    // their own GuestGate, so turning every 401 into a global toast creates
    // duplicate warnings on page load and navigation.
    if (response.status !== 401 && typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("bestwash:toast", {
          detail: { message: error.message, kind: "error" },
        }),
      );
    }
    throw error;
  }
  return payload?.data as T;
}

export function getAuthSession(
  options: { refresh?: boolean } = {},
): Promise<CustomerAuthSession> {
  if (!options.refresh && authSessionCache) {
    return Promise.resolve(authSessionCache);
  }
  if (!options.refresh && authSessionPromise) return authSessionPromise;

  authSessionPromise = request<CustomerAuthSession>("/auth/session")
    .then((session) => {
      cacheAuthSession(session);
      return session;
    })
    .catch((error) => {
      authSessionPromise = null;
      throw error;
    });
  return authSessionPromise;
}

async function privateRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const session = await getAuthSession();
  if (!session.authenticated) {
    throw new ApiError(401, "AUTH_REQUIRED", "برای ادامه وارد حساب شوید.");
  }
  return request<T>(path, init);
}

export interface CustomerProfile {
  id: string;
  mobile: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  birthDate: string | null;
  marketingConsent: boolean;
  notificationPreferences: Record<string, boolean> | null;
  passwordConfigured: boolean;
  wallet: { balanceRial: number } | null;
  loyalty: {
    points: number;
    tier: { code: string; nameFa: string } | null;
  } | null;
}

export function requestOtp(mobile: string, purpose = "REGISTER_LOGIN") {
  return request<{ developmentCode?: string; expiresAt: string }>(
    "/auth/otp/request",
    {
      method: "POST",
      body: JSON.stringify({ mobile, purpose }),
    },
  );
}

export function verifyOtp(
  mobile: string,
  code: string,
  purpose = "REGISTER_LOGIN",
) {
  return request<{ customer: CustomerProfile }>("/auth/otp/verify", {
    method: "POST",
    body: JSON.stringify({ mobile, code, purpose }),
  }).then((result) => {
    cacheAuthSession({ authenticated: true, customer: result.customer });
    return result;
  });
}

export function passwordLogin(mobile: string, password: string) {
  return request<{ customer: CustomerProfile }>("/auth/password/login", {
    method: "POST",
    body: JSON.stringify({ mobile, password }),
  }).then((result) => {
    cacheAuthSession({ authenticated: true, customer: result.customer });
    return result;
  });
}

export async function getMe() {
  const session = await getAuthSession();
  if (!session.authenticated) {
    throw new ApiError(401, "AUTH_REQUIRED", "برای ادامه وارد حساب شوید.");
  }
  return session.customer;
}

export function logout() {
  return privateRequest<{ success: boolean }>("/auth/logout", {
    method: "POST",
  }).finally(() => cacheAuthSession({ authenticated: false }));
}

export function logoutAll() {
  return privateRequest<{ success: boolean }>("/auth/logout-all", {
    method: "POST",
  }).finally(() => cacheAuthSession({ authenticated: false }));
}

export function updateProfile(input: {
  firstName?: string;
  lastName?: string;
  email?: string;
  birthDate?: string;
  marketingConsent?: boolean;
  notificationPreferences?: Record<string, boolean>;
}) {
  return privateRequest<CustomerProfile>("/auth/me", {
    method: "PUT",
    body: JSON.stringify(input),
  }).then((profile) => {
    cacheAuthSession({ authenticated: true, customer: profile });
    return profile;
  });
}

export function setPassword(password: string) {
  return privateRequest<{ success: boolean }>("/auth/password", {
    method: "PUT",
    body: JSON.stringify({ password }),
  });
}

export interface CustomerVehicle {
  id: string;
  source: "CATALOG" | "CUSTOM";
  vehicleClassId: string;
  vehicleModelId: string | null;
  customBrandName: string | null;
  customModelName: string | null;
  color: string;
  plateType: "IRAN_CAR" | "IRAN_MOTORCYCLE";
  plateNormalized: string;
  nickname: string | null;
  productionYear: number | null;
  carPlateFirstTwo: string | null;
  carPlateLetter: string | null;
  carPlateMiddleThree: string | null;
  carPlateIranCode: string | null;
  motorcyclePlateTop: string | null;
  motorcyclePlateBottom: string | null;
  isDefault: boolean;
  vehicleClass: {
    id: string;
    nameFa: string;
    nameEn: string | null;
    code: string;
    vehicleType: "CAR" | "MOTORCYCLE";
  };
  vehicleModel: {
    id: string;
    nameFa: string;
    nameEn: string | null;
    slug: string;
    aliases: string[];
    brand: { id: string; nameFa: string; nameEn: string | null; slug: string };
  } | null;
}

export interface CustomerBooking {
  id: string;
  code: string;
  status: string;
  paymentStatus: string;
  startsAt: string;
  createdAt: string;
  packageNameFa: string;
  totalAmountRial: number;
  discountAmountRial: number;
  walletAmountRial: number;
  gatewayAmountRial: number;
  brandName: string | null;
  modelName: string;
  color: string;
  plateNormalized: string;
  vehicleClass: { nameFa: string; code: string };
  pickupMode: "OWNER" | "DELEGATE";
  pickupDelegates: Array<{ id: string; fullName: string; mobile: string }>;
  completionReward?: {
    points: number;
    coupon: {
      code: string;
      type: "PERCENTAGE" | "FIXED";
      value: number;
      endsAt: string | null;
    } | null;
  };
  [key: string]: unknown;
}

export function getMyBookings() {
  return privateRequest<CustomerBooking[]>("/customers/me/bookings");
}

export function getActiveBooking() {
  return privateRequest<CustomerBooking | null>(
    "/customers/me/bookings/active/next",
  );
}

export function getMyBooking(id: string) {
  return privateRequest<CustomerBooking>(`/customers/me/bookings/${id}`);
}

export interface CustomerInvoice {
  id: string;
  number: string;
  subtotalRial: number;
  discountRial: number;
  walletRial: number;
  gatewayRial: number;
  totalRial: number;
  issuedAt: string;
  payment?: {
    provider: string;
    status: string;
    providerReferenceNumber: string | null;
  };
}

export function getMyInvoices() {
  return privateRequest<CustomerInvoice[]>("/customers/me/invoices");
}

export function getMyInvoice(id: string) {
  return privateRequest<CustomerInvoice>(`/customers/me/invoices/${id}`);
}

export function cancelBooking(id: string, reason?: string) {
  return privateRequest<{
    success: boolean;
    refundAmountRial: number;
    refundMethod: string | null;
    refundDueAt: string | null;
  }>(`/customers/me/bookings/${id}/cancel`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export function getMyVehicles() {
  return privateRequest<CustomerVehicle[]>("/customers/me/vehicles");
}

export interface VehicleInput {
  source: "CATALOG" | "CUSTOM";
  vehicleClassId: string;
  vehicleModelId?: string;
  customBrandName?: string;
  customModelName?: string;
  color: string;
  plateType: "IRAN_CAR" | "IRAN_MOTORCYCLE";
  plateNormalized: string;
  nickname?: string;
  productionYear?: number;
  isDefault?: boolean;
}

export function createVehicle(input: VehicleInput) {
  return privateRequest<CustomerVehicle>("/customers/me/vehicles", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateVehicle(id: string, input: Partial<VehicleInput>) {
  return privateRequest<CustomerVehicle>(`/customers/me/vehicles/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function setDefaultVehicle(id: string) {
  return privateRequest<{ success: boolean }>(
    `/customers/me/vehicles/${id}/default`,
    {
      method: "PATCH",
    },
  );
}

export function deleteVehicle(id: string) {
  return privateRequest<{ success: boolean }>(`/customers/me/vehicles/${id}`, {
    method: "DELETE",
  });
}

export function getWallet() {
  return privateRequest<Record<string, unknown>>("/customers/me/wallet");
}

export function getLoyalty() {
  return privateRequest<Record<string, unknown>>("/customers/me/loyalty");
}

export interface InAppNotification {
  id: string;
  title: string | null;
  body: string | null;
  actionUrl: string | null;
  templateCode: string;
  readAt: string | null;
  createdAt: string;
}

export function getNotifications() {
  return privateRequest<{ items: InAppNotification[]; unreadCount: number }>(
    "/customers/me/notifications",
  );
}

export function readNotification(id: string) {
  return privateRequest<{ success: boolean }>(
    `/customers/me/notifications/${id}/read`,
    { method: "PATCH" },
  );
}

export function readAllNotifications() {
  return privateRequest<{ success: boolean; count: number }>(
    "/customers/me/notifications/read-all",
    { method: "PATCH" },
  );
}

export function subscribePush(subscription: PushSubscriptionJSON) {
  return privateRequest("/customers/me/push-subscriptions", {
    method: "POST",
    body: JSON.stringify({
      endpoint: subscription.endpoint,
      p256dh: subscription.keys?.p256dh,
      auth: subscription.keys?.auth,
    }),
  });
}

export interface SupportTicket {
  id: string;
  code: string;
  subject: string;
  category: string;
  status: string;
  updatedAt: string;
  messages: Array<{
    id: string;
    authorType: string;
    body: string;
    createdAt: string;
  }>;
}

export function getTickets() {
  return privateRequest<SupportTicket[]>("/customers/me/tickets");
}

export function getTicket(id: string) {
  return privateRequest<SupportTicket>(`/customers/me/tickets/${id}`);
}

export function createTicket(input: {
  subject: string;
  category: string;
  message: string;
}) {
  return privateRequest<SupportTicket>("/customers/me/tickets", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function replyTicket(id: string, message: string) {
  return privateRequest(`/customers/me/tickets/${id}/messages`, {
    method: "POST",
    body: JSON.stringify({ message }),
  });
}

export function getPublicContent() {
  return request<{
    content: Record<string, unknown>;
    settings: Record<string, unknown>;
  }>("/content/public");
}

export interface BlogPostSummary {
  slug: string;
  title: string;
  excerpt: string;
  category: string | null;
  readingMinutes: number;
  publishedAt: string;
  coverImageUrl: string | null;
  coverImageAlt: string | null;
}

export function getBlogPosts() {
  return request<BlogPostSummary[]>("/content/blog");
}

export function getBlogPost(slug: string) {
  return request<
    BlogPostSummary & { content: string; seoTitle: string | null }
  >(`/content/blog/${slug}`);
}

export function getPickupCode(bookingId: string) {
  return privateRequest<{ code: string | null }>(`/pickup/${bookingId}/code`);
}

export function updatePickupDelegate(
  bookingId: string,
  input: {
    pickupMode: "OWNER" | "DELEGATE";
    fullName?: string;
    mobile?: string;
  },
) {
  return privateRequest<{ success: boolean }>(`/pickup/${bookingId}/delegate`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function initiatePayment(
  checkoutToken: string,
  options: {
    useWallet: boolean;
    pickupMode: "OWNER" | "DELEGATE";
    delegateName?: string;
    delegateMobile?: string;
    couponCode?: string;
  },
) {
  return privateRequest<{
    id: string;
    status: string;
    redirectUrl?: string;
    bookingId?: string | null;
  }>("/payments/initiate", {
    method: "POST",
    headers: { "idempotency-key": crypto.randomUUID() },
    body: JSON.stringify({ checkoutToken, ...options }),
  });
}

export function getPaymentQuote(
  checkoutToken: string,
  options: { useWallet: boolean; couponCode?: string },
) {
  return privateRequest<{
    subtotalRial: number;
    discountAmountRial: number;
    walletAmountRial: number;
    gatewayAmountRial: number;
    totalAmountRial: number;
    couponCode: string | null;
  }>("/payments/quote", {
    method: "POST",
    body: JSON.stringify({ checkoutToken, ...options }),
  });
}

export function completeTestPayment(paymentId: string) {
  return request<{ bookingId: string }>(
    `/payments/test/${paymentId}/complete`,
    {
      method: "POST",
    },
  );
}
