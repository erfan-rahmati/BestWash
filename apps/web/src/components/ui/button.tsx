import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";

type ButtonSize = "default" | "compact";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

export function buttonStyles(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "default",
): string {
  const base =
    "inline-flex items-center justify-center gap-2 whitespace-nowrap font-extrabold transition duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200/70 active:scale-[0.985] disabled:pointer-events-none disabled:opacity-50";

  const sizes = {
    default: "min-h-[52px] rounded-[16px] px-5 text-[13px]",
    compact: "min-h-[44px] rounded-[14px] px-4 text-[12px]",
  };

  const variants = {
    primary:
      "bg-[var(--bw-gradient-primary)] text-white shadow-[var(--bw-shadow-blue)] hover:brightness-[1.02]",
    secondary:
      "border border-[var(--bw-border)] bg-white text-[var(--bw-primary-700)] shadow-[var(--bw-shadow-soft)] hover:border-[var(--bw-primary-200)]",
    ghost:
      "bg-transparent text-[var(--bw-primary-600)] hover:bg-[var(--bw-primary-50)]",
  };

  return `${base} ${sizes[size]} ${variants[variant]}`;
}

export function Button({
  children,
  variant = "primary",
  size = "default",
  loading = false,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`${buttonStyles(variant, size)} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <>
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          در حال پردازش
        </>
      ) : (
        children
      )}
    </button>
  );
}
