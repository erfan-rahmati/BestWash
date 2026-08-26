import { Check } from "lucide-react";

const steps = ["خودرو", "خدمات", "زمان", "تأیید", "ثبت"] as const;

interface BookingStepperProps {
  currentStep: number;
}

export function BookingStepper({ currentStep }: BookingStepperProps) {
  return (
    <div className="rounded-[24px] border border-[var(--bw-border)] bg-[var(--bw-surface)] p-4 shadow-[var(--bw-shadow-soft)]">
      <div className="relative flex items-start justify-between">
        <div className="absolute left-[10%] right-[10%] top-[15px] h-[2px] bg-[var(--bw-border)]" />

        <div
          className="absolute right-[10%] top-[15px] h-[2px] bg-[var(--bw-primary-500)] transition-all duration-300"
          style={{
            width: `${Math.max(0, Math.min(100, (currentStep - 1) * 25))}%`,
            maxWidth: "80%",
          }}
        />

        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const completed = stepNumber < currentStep;
          const active = stepNumber === currentStep;

          return (
            <div
              key={step}
              className="relative z-10 flex w-[20%] flex-col items-center"
            >
              <span
                className={`flex h-[31px] w-[31px] items-center justify-center rounded-full border-[3px] text-[9px] font-black transition ${
                  active
                    ? "border-[var(--bw-primary-100)] bg-[var(--bw-primary-600)] text-white shadow-[0_8px_20px_rgba(13,109,224,0.22)]"
                    : completed
                      ? "border-[var(--bw-primary-100)] bg-[var(--bw-primary-500)] text-white"
                      : "border-[var(--bw-surface)] bg-[var(--bw-bg-strong)] text-slate-400"
                }`}
              >
                {completed ? <Check size={13} /> : stepNumber}
              </span>

              <span
                className={`mt-2 text-[7px] font-bold ${
                  active || completed
                    ? "text-[var(--bw-primary-600)]"
                    : "text-slate-400"
                }`}
              >
                {step}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
