export type SmsPayload = Record<string, unknown>;

export type SmsIrMode = "disabled" | "sandbox" | "production";

type VerifyParameter = { name: string; value: string };

export type SmsIrRequest =
  | {
      kind: "verify";
      endpoint: "https://api.sms.ir/v1/send/verify";
      body: {
        mobile: string;
        templateId: number;
        parameters: VerifyParameter[];
      };
    }
  | {
      kind: "bulk";
      endpoint: "https://api.sms.ir/v1/send/bulk";
      body: {
        lineNumber: number;
        messageText: string;
        mobiles: string[];
      };
    };

export type SmsIrResponse = {
  status?: number;
  message?: string;
  data?: {
    messageId?: number;
    messageIds?: Array<number | null>;
    packId?: string;
    cost?: number;
  };
};

const VERIFY_PARAMETER_LIMIT = 25;
const SANDBOX_TEMPLATE_ID = 123456;

const otpTemplates = new Set(["AUTH_OTP", "ADMIN_LOGIN_OTP"]);
const bookingTemplates = new Set([
  "BOOKING_CONFIRMED",
  "BOOKING_REMINDER",
  "BOOKING_CANCELLED",
  "CAR_CHECKED_IN",
  "CAR_IN_PROGRESS",
  "BOOKING_COMPLETED",
  "PICKUP_REMINDER_OWNER",
]);
const pickupCodeTemplates = new Set([
  "PICKUP_CODE_OWNER",
  "PICKUP_CODE_DELEGATE",
  "PICKUP_DELEGATE_CHANGED",
]);

function requiredText(value: unknown, field: string): string {
  const text = String(value ?? "").trim();
  if (!text) throw new Error(`SMS payload field is missing (${field}).`);
  return text;
}

function verifyParameter(name: string, value: unknown): VerifyParameter {
  const text = requiredText(value, name);
  if (text.length > VERIFY_PARAMETER_LIMIT) {
    throw new Error(
      `SMS.ir Verify parameter is longer than ${VERIFY_PARAMETER_LIMIT} characters (${name}).`,
    );
  }
  return { name, value: text };
}

export function normalizeIranianMobile(value: unknown): string {
  const digits = String(value ?? "").replace(/\D/g, "");
  let normalized = digits;
  if (normalized.startsWith("0098")) normalized = `0${normalized.slice(4)}`;
  else if (normalized.startsWith("98")) normalized = `0${normalized.slice(2)}`;
  else if (normalized.startsWith("9") && normalized.length === 10)
    normalized = `0${normalized}`;
  if (!/^09\d{9}$/.test(normalized)) {
    throw new Error("SMS recipient mobile is invalid.");
  }
  return normalized;
}

export function smsIrMode(value: unknown): SmsIrMode {
  const mode = String(value ?? "disabled").trim().toLowerCase();
  if (mode === "disabled" || mode === "sandbox" || mode === "production")
    return mode;
  throw new Error("SMSIR_MODE must be disabled, sandbox, or production.");
}

export function isBulkSmsTemplate(templateCode: string): boolean {
  return templateCode === "ADMIN_BROADCAST" || templateCode === "PAYMENT_LINK";
}

export function buildVerifyParameters(
  payload: SmsPayload,
  decryptedCode?: string,
): VerifyParameter[] {
  const templateCode = requiredText(payload.templateCode, "templateCode");
  if (otpTemplates.has(templateCode)) {
    return [verifyParameter("Code", decryptedCode)];
  }
  if (templateCode === "WELCOME") {
    return [
      verifyParameter("Name", payload.customerName),
      verifyParameter("Coupon", payload.couponCode),
      verifyParameter("Discount", payload.discountPercent),
    ];
  }
  if (pickupCodeTemplates.has(templateCode)) {
    return [
      verifyParameter("Code", decryptedCode),
      verifyParameter("Booking", payload.bookingCode),
    ];
  }
  if (bookingTemplates.has(templateCode)) {
    return [verifyParameter("Booking", payload.bookingCode)];
  }
  throw new Error(`Unsupported SMS.ir Verify template (${templateCode}).`);
}

function paymentLinkMessage(value: unknown): string {
  const link = requiredText(value, "paymentLink");
  let url: URL;
  try {
    url = new URL(link);
  } catch {
    throw new Error("Payment link is invalid.");
  }
  if (url.protocol !== "https:" && url.hostname !== "localhost") {
    throw new Error("Payment link must use HTTPS.");
  }
  return `لینک پرداخت رزرو BestWash:\n${url.toString()}`;
}

function broadcastMessage(value: unknown): string {
  const body = requiredText(value, "body");
  if (body.length < 3 || body.length > 300) {
    throw new Error("Broadcast SMS text must contain 3 to 300 characters.");
  }
  return body;
}

export function buildSmsIrRequest(input: {
  mode: SmsIrMode;
  payload: SmsPayload;
  templateId?: number;
  lineNumber?: number;
  bulkEnabled?: boolean;
  decryptedCode?: string;
}): SmsIrRequest | { kind: "skip"; reason: string } {
  const templateCode = requiredText(input.payload.templateCode, "templateCode");
  const mobile = normalizeIranianMobile(input.payload.mobile);
  if (input.mode === "disabled") {
    return { kind: "skip", reason: "SMSIR_MODE is disabled." };
  }
  if (input.mode === "sandbox") {
    if (!otpTemplates.has(templateCode)) {
      return {
        kind: "skip",
        reason: "SMS.ir Sandbox supports only the default OTP Verify template.",
      };
    }
    return {
      kind: "verify",
      endpoint: "https://api.sms.ir/v1/send/verify",
      body: {
        mobile,
        templateId: SANDBOX_TEMPLATE_ID,
        parameters: buildVerifyParameters(input.payload, input.decryptedCode),
      },
    };
  }
  if (isBulkSmsTemplate(templateCode)) {
    if (!input.bulkEnabled) {
      return {
        kind: "skip",
        reason: "SMS.ir Bulk delivery is disabled.",
      };
    }
    if (!Number.isSafeInteger(input.lineNumber) || Number(input.lineNumber) <= 0)
      throw new Error("SMSIR_LINE_NUMBER is required for bulk SMS.");
    const messageText =
      templateCode === "PAYMENT_LINK"
        ? paymentLinkMessage(input.payload.paymentLink)
        : broadcastMessage(input.payload.body);
    return {
      kind: "bulk",
      endpoint: "https://api.sms.ir/v1/send/bulk",
      body: {
        lineNumber: Number(input.lineNumber),
        messageText,
        mobiles: [mobile],
      },
    };
  }
  if (!Number.isSafeInteger(input.templateId) || Number(input.templateId) <= 0)
    throw new Error(`SMS.ir template ID is missing (${templateCode}).`);
  return {
    kind: "verify",
    endpoint: "https://api.sms.ir/v1/send/verify",
    body: {
      mobile,
      templateId: Number(input.templateId),
      parameters: buildVerifyParameters(input.payload, input.decryptedCode),
    },
  };
}

export function providerMessageId(response: SmsIrResponse): string {
  const direct = response.data?.messageId;
  if (typeof direct === "number" && Number.isFinite(direct)) return String(direct);
  const bulk = response.data?.messageIds?.find(
    (value): value is number => typeof value === "number" && value > 0,
  );
  if (bulk) return String(bulk);
  if (response.data?.packId) return response.data.packId;
  return "";
}
