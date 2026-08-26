import type { ReactNode } from "react";
import { AppFooter } from "./app-footer";
import { AppHeader } from "./app-header";
import { BottomNav } from "./bottom-nav";

interface CustomerAppShellProps {
  children: ReactNode;
}

export function CustomerAppShell({ children }: CustomerAppShellProps) {
  return (
    <div className="relative h-dvh overflow-hidden sm:px-6 sm:py-5">
      <div className="pointer-events-none fixed inset-0 hidden overflow-hidden sm:block">
        <div className="absolute left-[calc(50%-430px)] top-[8%] h-[340px] w-[340px] rounded-full bg-blue-300/15 blur-[90px]" />

        <div className="absolute bottom-[8%] right-[calc(50%-430px)] h-[300px] w-[300px] rounded-full bg-cyan-300/12 blur-[90px]" />

        <div className="absolute left-1/2 top-0 h-48 w-[620px] -translate-x-1/2 rounded-[50%] bg-white/45 blur-[80px]" />
      </div>

      <div className="relative mx-auto flex h-dvh w-full max-w-[440px] flex-col overflow-hidden bg-[var(--bw-bg)] sm:h-[calc(100dvh-2.5rem)] sm:rounded-[36px] sm:border sm:border-white/90 sm:shadow-[0_34px_90px_rgba(27,76,133,0.18)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-52 bg-[radial-gradient(circle_at_50%_0%,rgba(51,152,244,0.10),transparent_70%)]" />

        <AppHeader />

        <div className="relative z-10 min-h-0 flex-1 overflow-hidden">
          <div className="bw-scrollbar-hidden h-full overflow-y-auto overscroll-y-contain">
            <main>{children}</main>

            <AppFooter />
          </div>

          <div
            id="customer-overlay-root"
            className="pointer-events-none absolute inset-0 z-[100]"
          />
        </div>

        <BottomNav />
      </div>
    </div>
  );
}
