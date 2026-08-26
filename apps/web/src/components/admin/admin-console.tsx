"use client";

import { useCallback, useEffect, useState } from "react";
import { BookingsView, ManualBookingView } from "./admin-bookings";
import {
  ArticleEditorView,
  ArticlesListView,
  ContentEditorView,
  ContentListView,
  MediaEditorView,
  MediaListView,
} from "./admin-content";
import {
  adminRequest,
  type AdminSection,
  type JsonRecord,
  navigation,
} from "./admin-core";
import { AdminDashboard } from "./admin-dashboard";
import {
  CatalogView,
  LogsView,
  MarketingView,
  MessagesView,
  SettingsView,
  SupportView,
} from "./admin-management";
import { CustomersView, PaymentsView } from "./admin-people-finance";
import { AdminLogin, AdminShell } from "./admin-shell";

type DataState = Record<string, unknown>;

export function AdminConsole({ initialRoute }: { initialRoute: string }) {
  const [route, setRoute] = useState(normalizeRoute(initialRoute));
  const section = sectionFromRoute(route);
  const token = "";
  const [authenticated, setAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  const [data, setData] = useState<DataState>({});
  const [logRange, setLogRange] = useState("24h");

  useEffect(() => {
    adminRequest("/admin/profile", "")
      .then(() => setAuthenticated(true))
      .catch(() => setAuthenticated(false))
      .finally(() => setAuthChecked(true));
  }, []);

  const load = useCallback(async () => {
    if (!authenticated) return;
    setLoading(true);
    setError("");
    try {
      setData(await loadSection(section, route, token, logRange));
      setAuthenticated(true);
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : "خطای ناشناخته در دریافت اطلاعات";
      setError(message);
      if (/ورود|توکن|نشست|unauthor|forbidden/i.test(message)) {
        setAuthenticated(false);
      }
    } finally {
      setLoading(false);
    }
  }, [authenticated, logRange, route, section, token]);

  useEffect(() => {
    if (!authenticated) return;
    const timeout = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeout);
  }, [authenticated, load, version]);

  function navigate(nextPath: string) {
    const next = normalizeRoute(nextPath);
    window.history.pushState(null, "", `/admin${next ? `/${next}` : ""}`);
    setData({});
    setRoute(next);
  }

  useEffect(() => {
    const pop = () =>
      setRoute(
        normalizeRoute(window.location.pathname.replace(/^\/admin\/?/, "")),
      );
    window.addEventListener("popstate", pop);
    return () => window.removeEventListener("popstate", pop);
  }, []);

  const refresh = () => setVersion((value) => value + 1);
  const logout = () => {
    void adminRequest("/admin/auth/logout", "", { method: "POST" }).finally(
      () => {
        setAuthenticated(false);
        setData({});
      },
    );
  };

  if (!authChecked) return <AdminLoading />;

  if (!authenticated) {
    return (
      <AdminLogin
        onSuccess={() => {
          setAuthenticated(true);
        }}
      />
    );
  }

  return (
    <AdminShell
      section={section}
      route={route}
      token={token}
      loading={loading}
      onNavigate={navigate}
      onRefresh={refresh}
      onLogout={logout}
    >
      {error ? (
        <div className="mb-5 flex flex-wrap items-center gap-3 rounded-[22px] border border-rose-200 bg-rose-50 p-4 text-xs font-bold leading-6 text-rose-700">
          <span>{error}</span>
          <button
            onClick={() => void load()}
            className="mr-auto rounded-xl bg-white px-3 py-2 text-[10px] font-black"
          >
            تلاش دوباره
          </button>
        </div>
      ) : null}
      {loading && !Object.keys(data).length ? (
        <AdminLoading />
      ) : (
        <SectionContent
          section={section}
          route={route}
          token={token}
          data={data}
          navigate={navigate}
          refresh={refresh}
          logRange={logRange}
          setLogRange={setLogRange}
        />
      )}
    </AdminShell>
  );
}

function SectionContent({
  section,
  route,
  token,
  data,
  navigate,
  refresh,
  logRange,
  setLogRange,
}: {
  section: AdminSection;
  route: string;
  token: string;
  data: DataState;
  navigate: (path: string) => void;
  refresh: () => void;
  logRange: string;
  setLogRange: (range: string) => void;
}) {
  switch (section) {
    case "dashboard":
      return (
        <AdminDashboard
          data={asRecord(data.main)}
          token={token}
          refresh={refresh}
          navigate={navigate}
        />
      );
    case "bookings":
      return (
        <BookingsView
          rows={asRows(data.main)}
          token={token}
          refresh={refresh}
        />
      );
    case "manual":
      return <ManualBookingView token={token} navigate={navigate} />;
    case "customers":
      return (
        <CustomersView
          rows={asRows(data.main)}
          token={token}
          refresh={refresh}
        />
      );
    case "payments":
      return <PaymentsView rows={asRows(data.main)} />;
    case "content":
      return route.split("/").length > 1 ? (
        <ContentEditorView
          route={route}
          data={asRecord(data.main)}
          media={asRows(data.media)}
          token={token}
          navigate={navigate}
          refresh={refresh}
        />
      ) : (
        <ContentListView
          data={asRecord(data.main)}
          token={token}
          navigate={navigate}
          refresh={refresh}
        />
      );
    case "articles":
      return route.split("/").length > 1 ? (
        <ArticleEditorView
          route={route}
          rows={asRows(data.main)}
          media={asRows(data.media)}
          token={token}
          navigate={navigate}
          refresh={refresh}
        />
      ) : (
        <ArticlesListView
          rows={asRows(data.main)}
          token={token}
          navigate={navigate}
          refresh={refresh}
        />
      );
    case "media":
      return route.split("/").length > 1 ? (
        <MediaEditorView
          route={route}
          rows={asRows(data.main)}
          token={token}
          navigate={navigate}
          refresh={refresh}
        />
      ) : (
        <MediaListView
          rows={asRows(data.main)}
          token={token}
          navigate={navigate}
          refresh={refresh}
        />
      );
    case "catalog":
      return (
        <CatalogView
          route={route}
          datasets={asDatasets(data.catalog)}
          token={token}
          navigate={navigate}
          refresh={refresh}
        />
      );
    case "marketing":
      return (
        <MarketingView
          route={route}
          rows={asRows(data.main)}
          tiers={asRows(data.tiers)}
          token={token}
          navigate={navigate}
          refresh={refresh}
        />
      );
    case "support":
      return (
        <SupportView rows={asRows(data.main)} token={token} refresh={refresh} />
      );
    case "messages":
      return (
        <MessagesView
          messages={asRows(data.main)}
          templates={asRows(data.templates)}
          tiers={asRows(data.tiers)}
          token={token}
          navigate={navigate}
          refresh={refresh}
        />
      );
    case "settings":
      return (
        <SettingsView
          schedule={asRecord(data.schedule)}
          settings={asRows(data.main)}
          token={token}
          refresh={refresh}
        />
      );
    case "logs":
      return (
        <LogsView
          data={asRecord(data.main)}
          range={logRange}
          onRange={setLogRange}
          refresh={refresh}
        />
      );
  }
}

async function loadSection(
  section: AdminSection,
  route: string,
  token: string,
  range: string,
): Promise<DataState> {
  if (section === "manual") return {};
  const single: Partial<Record<AdminSection, string>> = {
    dashboard: "/admin/dashboard",
    bookings: "/admin/bookings",
    customers: "/admin/customers",
    payments: "/admin/payments",
    support: "/admin/catalog/support-tickets",
  };
  if (single[section])
    return { main: await adminRequest(single[section]!, token) };
  if (section === "content") {
    const [main, media] = await Promise.all([
      adminRequest("/admin/content", token),
      adminRequest("/admin/catalog/media-assets", token),
    ]);
    return { main, media };
  }
  if (section === "articles") {
    const [main, media] = await Promise.all([
      adminRequest("/admin/catalog/blog-posts", token),
      adminRequest("/admin/catalog/media-assets", token),
    ]);
    return { main, media };
  }
  if (section === "media")
    return { main: await adminRequest("/admin/catalog/media-assets", token) };
  if (section === "marketing") {
    const [main, tiers] = await Promise.all([
      adminRequest("/admin/catalog/coupons", token),
      adminRequest("/admin/catalog/loyalty-tiers", token),
    ]);
    return { main, tiers };
  }
  if (section === "messages") {
    const [main, templates, tiers] = await Promise.all([
      adminRequest("/admin/catalog/messages", token),
      adminRequest("/admin/catalog/sms-templates", token),
      adminRequest("/admin/catalog/loyalty-tiers", token),
    ]);
    return { main, templates, tiers };
  }
  if (section === "settings") {
    const [main, schedule] = await Promise.all([
      adminRequest("/admin/catalog/business-settings", token),
      adminRequest("/admin/schedule", token),
    ]);
    return { main, schedule };
  }
  if (section === "logs")
    return { main: await adminRequest(`/admin/logs?range=${range}`, token) };
  if (section === "catalog") {
    const requested = route.split("/")[1] || "vehicle-classes";
    const essentials = new Set([
      "vehicle-classes",
      "vehicle-brands",
      "vehicle-models",
      "sms-templates",
      requested,
    ]);
    if (requested === "packages") essentials.add("services");
    const entries = await Promise.all(
      [...essentials].map(
        async (entity) =>
          [
            entity,
            await adminRequest(`/admin/catalog/${entity}`, token),
          ] as const,
      ),
    );
    return { catalog: Object.fromEntries(entries) };
  }
  return {};
}

function normalizeRoute(value: string) {
  return value.replace(/^\/+|\/+$/g, "");
}
function sectionFromRoute(route: string): AdminSection {
  const root = route.split("/")[0] || "dashboard";
  return navigation.some((item) => item.id === root)
    ? (root as AdminSection)
    : "dashboard";
}
function asRows(value: unknown): JsonRecord[] {
  return Array.isArray(value) ? (value as JsonRecord[]) : [];
}
function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}
function asDatasets(value: unknown): Record<string, JsonRecord[]> {
  const source = asRecord(value);
  return Object.fromEntries(
    Object.entries(source).map(([key, rows]) => [key, asRows(rows)]),
  );
}
function AdminLoading() {
  return (
    <div className="grid min-h-[55dvh] place-items-center">
      <div className="text-center">
        <span className="mx-auto block size-10 animate-spin rounded-full border-4 border-violet-100 border-t-violet-600" />
        <p className="mt-4 text-xs font-bold text-slate-400">
          در حال آماده‌سازی اطلاعات مدیریت...
        </p>
      </div>
    </div>
  );
}
