"use client";

import { AlertCircle, LoaderCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { BookingCheckoutData } from "../../lib/api/booking-checkouts";
import {
  BookingHoldApiError,
  getBookingHold,
  type BookingHoldData,
} from "../../lib/api/booking-holds";
import {
  clearBookingSessionDraft,
  loadBookingSessionDraft,
  saveBookingSessionDraft,
} from "../../lib/booking-session";
import type {
  BookingServiceSelection,
  BookingTimeSelection,
  BookingVehicleSelection,
} from "../../lib/booking-types";
import { PageHeading } from "../ui/page-heading";
import { BookingStepper } from "./booking-stepper";
import { CheckoutStep } from "./checkout-step";
import { ConfirmationStep } from "./confirmation-step";
import { ServiceStep } from "./service-step";
import { TimeStep } from "./time-step";
import { VehicleStep } from "./vehicle-step";

function scrollBookingToTop() {
  window.requestAnimationFrame(() => {
    document.getElementById("booking-flow-top")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  });
}

export function BookingFlow() {
  const [currentStep, setCurrentStep] = useState(1);

  const [vehicleSelection, setVehicleSelection] =
    useState<BookingVehicleSelection | null>(null);

  const [serviceSelection, setServiceSelection] =
    useState<BookingServiceSelection | null>(null);

  const [timeSelection, setTimeSelection] =
    useState<BookingTimeSelection | null>(null);

  const [holdSelection, setHoldSelection] = useState<BookingHoldData | null>(
    null,
  );

  const [checkoutToken, setCheckoutToken] = useState<string | null>(null);

  const [timeStepRevision, setTimeStepRevision] = useState(0);

  const [hydrated, setHydrated] = useState(false);

  const [restoreError, setRestoreError] = useState<string | null>(null);

  const [restoreRevision, setRestoreRevision] = useState(0);

  const resetBookingFlow = useCallback(() => {
    clearBookingSessionDraft();

    setVehicleSelection(null);
    setServiceSelection(null);
    setTimeSelection(null);
    setHoldSelection(null);
    setCheckoutToken(null);

    setRestoreError(null);

    setTimeStepRevision((revision) => revision + 1);

    setCurrentStep(1);

    scrollBookingToTop();
  }, []);

  const resetBookingFlowForHold = useCallback(
    (expectedHoldToken: string) => {
      const draft = loadBookingSessionDraft();

      /*
       * Ignore stale async callbacks from an older Hold/Checkout.
       * An old request must never reset a newer booking flow.
       */
      if (!draft || draft.hold.token !== expectedHoldToken) {
        return;
      }

      resetBookingFlow();
    },
    [resetBookingFlow],
  );

  const handleCurrentHoldReset = useCallback(() => {
    if (!holdSelection) {
      return;
    }

    resetBookingFlowForHold(holdSelection.token);
  }, [holdSelection, resetBookingFlowForHold]);
  useEffect(() => {
    let cancelled = false;

    const draft = loadBookingSessionDraft();

    if (!draft) {
      const frameId = window.requestAnimationFrame(() => {
        if (!cancelled) {
          setHydrated(true);
        }
      });

      return () => {
        cancelled = true;

        window.cancelAnimationFrame(frameId);
      };
    }

    getBookingHold(draft.hold.token)
      .then((freshHold) => {
        if (cancelled) {
          return;
        }

        if (freshHold.status !== "ACTIVE") {
          resetBookingFlow();

          return;
        }

        setVehicleSelection(draft.vehicleSelection);

        setServiceSelection(draft.serviceSelection);

        setTimeSelection(draft.timeSelection);

        setHoldSelection(freshHold);

        setCheckoutToken(draft.currentStep === 5 ? draft.checkoutToken : null);

        setCurrentStep(draft.currentStep);
      })
      .catch((requestError: unknown) => {
        if (cancelled) {
          return;
        }

        if (
          requestError instanceof BookingHoldApiError &&
          requestError.status === 404
        ) {
          resetBookingFlow();

          return;
        }

        setRestoreError(
          "بازیابی رزرو موقت با مشکل مواجه شد. اتصال اینترنت را بررسی و دوباره تلاش کنید.",
        );
      })
      .finally(() => {
        if (!cancelled) {
          setHydrated(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [resetBookingFlow, restoreRevision]);

  useEffect(() => {
    if (
      !hydrated ||
      (currentStep !== 4 && currentStep !== 5) ||
      !vehicleSelection ||
      !serviceSelection ||
      !timeSelection ||
      !holdSelection ||
      holdSelection.status !== "ACTIVE"
    ) {
      return;
    }

    saveBookingSessionDraft({
      version: 2,

      currentStep,

      vehicleSelection,

      serviceSelection,

      timeSelection,

      hold: holdSelection,

      checkoutToken: currentStep === 5 ? checkoutToken : null,
    });
  }, [
    checkoutToken,
    currentStep,
    holdSelection,
    hydrated,
    serviceSelection,
    timeSelection,
    vehicleSelection,
  ]);

  function completeVehicleStep(value: BookingVehicleSelection) {
    clearBookingSessionDraft();

    setVehicleSelection(value);

    setServiceSelection(null);
    setTimeSelection(null);
    setHoldSelection(null);
    setCheckoutToken(null);

    setCurrentStep(2);

    scrollBookingToTop();
  }

  function completeServiceStep(value: BookingServiceSelection) {
    setServiceSelection(value);

    setTimeSelection(null);
    setHoldSelection(null);
    setCheckoutToken(null);

    setCurrentStep(3);

    scrollBookingToTop();
  }

  function completeTimeStep(value: BookingTimeSelection) {
    setTimeSelection(value);

    setHoldSelection(null);
    setCheckoutToken(null);

    setCurrentStep(4);

    scrollBookingToTop();
  }

  const handleHoldReady = useCallback(
    (hold: BookingHoldData) => {
      setHoldSelection(hold);

      setCheckoutToken(null);

      if (!vehicleSelection || !serviceSelection || !timeSelection) {
        return;
      }

      saveBookingSessionDraft({
        version: 2,

        currentStep: 4,

        vehicleSelection,

        serviceSelection,

        timeSelection,

        hold,

        checkoutToken: null,
      });
    },
    [serviceSelection, timeSelection, vehicleSelection],
  );

  function completeConfirmation(hold: BookingHoldData) {
    setHoldSelection(hold);

    setCheckoutToken(null);

    if (vehicleSelection && serviceSelection && timeSelection) {
      saveBookingSessionDraft({
        version: 2,

        currentStep: 5,

        vehicleSelection,

        serviceSelection,

        timeSelection,

        hold,

        checkoutToken: null,
      });
    }

    setCurrentStep(5);

    scrollBookingToTop();
  }

  const handleCheckoutReady = useCallback(
    (checkout: BookingCheckoutData) => {
      setCheckoutToken(checkout.token);

      if (
        !vehicleSelection ||
        !serviceSelection ||
        !timeSelection ||
        !holdSelection
      ) {
        return;
      }

      saveBookingSessionDraft({
        version: 2,

        currentStep: 5,

        vehicleSelection,

        serviceSelection,

        timeSelection,

        hold: holdSelection,

        checkoutToken: checkout.token,
      });
    },
    [holdSelection, serviceSelection, timeSelection, vehicleSelection],
  );

  const serviceKey = serviceSelection
    ? [
        serviceSelection.package.id,

        ...serviceSelection.addons.map((addon) => addon.id).sort(),

        serviceSelection.totalDurationMinutes,
      ].join(":")
    : null;

  if (!hydrated) {
    return (
      <div id="booking-flow-top" className="px-5 pb-5 pt-6">
        <div className="flex min-h-[360px] flex-col items-center justify-center rounded-[26px] border border-[var(--bw-border)] bg-[var(--bw-surface)]">
          <LoaderCircle
            size={28}
            className="animate-spin text-[var(--bw-primary-600)]"
          />

          <p className="mt-4 text-[10px] font-black text-slate-600">
            در حال بررسی رزرو موقت...
          </p>

          <p className="mt-1 text-[8px] text-slate-400">
            وضعیت رزرو شما از سرور بازیابی می‌شود.
          </p>
        </div>
      </div>
    );
  }

  if (restoreError) {
    return (
      <div id="booking-flow-top" className="px-5 pb-5 pt-6">
        <div className="rounded-[24px] border border-amber-100 bg-amber-50 p-5">
          <span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-white text-amber-600 shadow-sm">
            <AlertCircle size={20} />
          </span>

          <h2 className="mt-4 text-[13px] font-black text-amber-800">
            بازیابی رزرو موقت انجام نشد
          </h2>

          <p className="mt-2 text-[8px] leading-5 text-amber-700">
            اطلاعات رزرو از مرورگر پاک نشده است. دوباره تلاش کنید تا همان رزرو و
            همان تایمر بازیابی شود.
          </p>

          <button
            type="button"
            onClick={() => {
              setRestoreError(null);

              setHydrated(false);

              setRestoreRevision((revision) => revision + 1);
            }}
            className="mt-4 min-h-[50px] w-full rounded-[15px] bg-white text-[9px] font-black text-amber-700 shadow-sm"
          >
            تلاش دوباره
          </button>
        </div>
      </div>
    );
  }

  return (
    <div id="booking-flow-top" className="px-5 pb-5 pt-6">
      <PageHeading
        eyebrow="رزرو آنلاین"
        title="رزرو کارواش"
        description="در چند مرحله کوتاه خودرو، خدمات و زمان مراجعه را انتخاب کنید."
      />

      <div className="mt-6">
        <BookingStepper currentStep={currentStep} />
      </div>

      <div className={currentStep === 1 ? "" : "hidden"}>
        <VehicleStep onComplete={completeVehicleStep} />
      </div>

      {vehicleSelection ? (
        <div className={currentStep === 2 ? "" : "hidden"}>
          <ServiceStep
            key={vehicleSelection.vehicleClass.id}
            vehicle={vehicleSelection}
            onBack={() => {
              setCurrentStep(1);

              scrollBookingToTop();
            }}
            onComplete={completeServiceStep}
          />
        </div>
      ) : null}

      {vehicleSelection && serviceSelection && serviceKey ? (
        <div className={currentStep === 3 ? "" : "hidden"}>
          <TimeStep
            key={`${serviceKey}:${timeStepRevision}`}
            service={serviceSelection}
            onBack={() => {
              setCurrentStep(2);

              scrollBookingToTop();
            }}
            onComplete={completeTimeStep}
          />
        </div>
      ) : null}

      {currentStep === 4 &&
      vehicleSelection &&
      serviceSelection &&
      timeSelection ? (
        <ConfirmationStep
          key={[
            timeSelection.startAt,

            serviceSelection.package.id,

            ...serviceSelection.addons.map((addon) => addon.id),
          ].join(":")}
          vehicle={vehicleSelection}
          service={serviceSelection}
          time={timeSelection}
          existingHold={holdSelection}
          onHoldReady={handleHoldReady}
          onBack={resetBookingFlow}
          onExpired={handleCurrentHoldReset}
          onComplete={completeConfirmation}
        />
      ) : null}

      {currentStep === 5 &&
      vehicleSelection &&
      serviceSelection &&
      timeSelection &&
      holdSelection ? (
        <CheckoutStep
          vehicle={vehicleSelection}
          hold={holdSelection}
          existingCheckoutToken={checkoutToken}
          onCheckoutReady={handleCheckoutReady}
          onCancelled={handleCurrentHoldReset}
          onExpired={handleCurrentHoldReset}
        />
      ) : null}
    </div>
  );
}
