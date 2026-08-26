import assert from "node:assert/strict";
import test from "node:test";
import {
  buildSmsIrRequest,
  buildVerifyParameters,
  normalizeIranianMobile,
  providerMessageId,
  smsIrMode,
} from "./smsir.js";

test("normalizes supported Iranian mobile forms", () => {
  assert.equal(normalizeIranianMobile("+98 912 123 4567"), "09121234567");
  assert.equal(normalizeIranianMobile("00989121234567"), "09121234567");
  assert.equal(normalizeIranianMobile("9121234567"), "09121234567");
  assert.throws(() => normalizeIranianMobile("02112345678"));
});

test("builds exact Verify parameters for every operational template family", () => {
  assert.deepEqual(
    buildVerifyParameters({ templateCode: "AUTH_OTP" }, "123456"),
    [{ name: "Code", value: "123456" }],
  );
  assert.deepEqual(
    buildVerifyParameters({ templateCode: "BOOKING_CONFIRMED", bookingCode: "BW-42" }),
    [{ name: "Booking", value: "BW-42" }],
  );
  assert.deepEqual(
    buildVerifyParameters(
      { templateCode: "PICKUP_CODE_OWNER", bookingCode: "BW-42" },
      "654321",
    ),
    [
      { name: "Code", value: "654321" },
      { name: "Booking", value: "BW-42" },
    ],
  );
  assert.deepEqual(
    buildVerifyParameters({
      templateCode: "WELCOME",
      customerName: "عرفان رحمتی",
      couponCode: "WELCOME",
      discountPercent: 15,
    }),
    [
      { name: "Name", value: "عرفان رحمتی" },
      { name: "Coupon", value: "WELCOME" },
      { name: "Discount", value: "15" },
    ],
  );
});

test("rejects Verify values over the SMS.ir 25 character limit", () => {
  assert.throws(() =>
    buildVerifyParameters({
      templateCode: "BOOKING_CONFIRMED",
      bookingCode: "x".repeat(26),
    }),
  );
});

test("uses the SMS.ir default Sandbox template only for OTP", () => {
  assert.deepEqual(
    buildSmsIrRequest({
      mode: "sandbox",
      payload: { templateCode: "AUTH_OTP", mobile: "09121234567" },
      decryptedCode: "123456",
    }),
    {
      kind: "verify",
      endpoint: "https://api.sms.ir/v1/send/verify",
      body: {
        mobile: "09121234567",
        templateId: 123456,
        parameters: [{ name: "Code", value: "123456" }],
      },
    },
  );
  assert.equal(
    buildSmsIrRequest({
      mode: "sandbox",
      payload: {
        templateCode: "BOOKING_CONFIRMED",
        mobile: "09121234567",
        bookingCode: "BW-42",
      },
    }).kind,
    "skip",
  );
});

test("routes payment links and broadcasts through bulk send", () => {
  const request = buildSmsIrRequest({
    mode: "production",
    bulkEnabled: true,
    lineNumber: 30001234567890,
    payload: {
      templateCode: "PAYMENT_LINK",
      mobile: "09121234567",
      paymentLink: "https://example.com/pay/token",
    },
  });
  assert.equal(request.kind, "bulk");
  if (request.kind === "bulk") {
    assert.equal(request.body.lineNumber, 30001234567890);
    assert.match(request.body.messageText, /^لینک پرداخت رزرو BestWash:/);
  }
});

test("skips bulk events cleanly when no sending line is available", () => {
  assert.deepEqual(
    buildSmsIrRequest({
      mode: "production",
      bulkEnabled: false,
      payload: {
        templateCode: "PAYMENT_LINK",
        mobile: "09121234567",
        paymentLink: "https://example.com/pay/token",
      },
    }),
    { kind: "skip", reason: "SMS.ir Bulk delivery is disabled." },
  );
});

test("validates mode and extracts provider message IDs", () => {
  assert.equal(smsIrMode("production"), "production");
  assert.throws(() => smsIrMode("test"));
  assert.equal(providerMessageId({ data: { messageId: 42 } }), "42");
  assert.equal(providerMessageId({ data: { messageIds: [null, 84] } }), "84");
});
