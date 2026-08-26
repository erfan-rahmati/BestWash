export type ToastKind = "success" | "error" | "info";

export function showToast(message: string, kind: ToastKind = "info") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("bestwash:toast", { detail: { message, kind } }),
  );
}
