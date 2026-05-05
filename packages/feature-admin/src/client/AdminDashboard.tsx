"use client";

import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { Input } from "@repo/ui/components/input";
import { Skeleton } from "@repo/ui/components/skeleton";
import {
  Activity,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  LayoutDashboard,
  RefreshCw,
  Search,
  Settings2,
  Shield,
} from "lucide-react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { fetchAdminApi } from "./adminFetch";

import type { AdminSummaryResponse, ModerationQueueItem } from "../shared";

type TabKey = "overview" | "moderation";

interface AdminDashboardProps {
  apiBaseUrl: string;
  viewerEmail?: string | null;
  /** Web route for the separate Analytics feature (default `/analytics`). */
  analyticsHref?: string;
}

interface ModerationPayload {
  queue: ModerationQueueItem[];
}

const tabs: { key: TabKey; label: string; icon: ReactNode }[] = [
  { key: "overview", label: "Overview", icon: <LayoutDashboard className="size-4" /> },
  { key: "moderation", label: "Moderation", icon: <Shield className="size-4" /> },
];

export function AdminDashboard({
  apiBaseUrl,
  viewerEmail,
  analyticsHref = "/analytics",
}: AdminDashboardProps) {
  const [tab, setTab] = useState<TabKey>("overview");
  const [summary, setSummary] = useState<AdminSummaryResponse | null>(null);
  const [moderation, setModeration] = useState<ModerationQueueItem[]>([]);
  const [moderationRequested, setModerationRequested] = useState(false);
  const [moderationBusy, setModerationBusy] = useState(false);
  const [overviewRefreshing, setOverviewRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [systemHealth, setSystemHealth] = useState<"unknown" | "ok" | "down">("unknown");
  const [userQuery, setUserQuery] = useState("");

  const loadOverview = useCallback(async () => {
    const data = await fetchAdminApi<AdminSummaryResponse>(apiBaseUrl, "/api/admin/summary");
    setSummary(data);
  }, [apiBaseUrl]);

  const loadModeration = useCallback(async () => {
    const data = await fetchAdminApi<ModerationPayload>(apiBaseUrl, "/api/admin/moderation");
    setModeration(data.queue ?? []);
  }, [apiBaseUrl]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError(null);
      try {
        await loadOverview();
        if (cancelled) {
          return;
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Unable to load admin data");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [loadOverview]);

  useEffect(() => {
    let cancelled = false;

    async function checkHealth() {
      const base = apiBaseUrl.replace(/\/$/, "");
      try {
        const res = await fetch(`${base}/`, { credentials: "include" });
        if (!cancelled) {
          setSystemHealth(res.ok ? "ok" : "down");
        }
      } catch {
        if (!cancelled) {
          setSystemHealth("down");
        }
      }
    }

    void checkHealth();

    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl]);

  useEffect(() => {
    let cancelled = false;

    async function hydrateTab() {
      if (loading) return;
      try {
        if (tab === "moderation" && !moderationRequested) {
          setModerationRequested(true);
          setModerationBusy(true);
          try {
            await loadModeration();
          } finally {
            if (!cancelled) {
              setModerationBusy(false);
            }
          }
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Unable to load tab data");
        }
      }
    }

    void hydrateTab();

    return () => {
      cancelled = true;
    };
  }, [loadModeration, loading, moderationRequested, tab]);

  const filteredRecentUsers = useMemo(() => {
    if (!summary) return [];
    const q = userQuery.trim().toLowerCase();
    if (!q) return summary.recentUsers;
    return summary.recentUsers.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.id.toLowerCase().includes(q),
    );
  }, [summary, userQuery]);

  const refreshOverview = async () => {
    setOverviewRefreshing(true);
    setError(null);
    try {
      await loadOverview();
      setSystemHealth("unknown");
      const base = apiBaseUrl.replace(/\/$/, "");
      const res = await fetch(`${base}/`, { credentials: "include" });
      setSystemHealth(res.ok ? "ok" : "down");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to refresh overview");
    } finally {
      setOverviewRefreshing(false);
    }
  };

  const resolveModerationItem = async (id: string) => {
    setModerationBusy(true);
    try {
      await fetchAdminApi<{ ok: boolean }>(apiBaseUrl, `/api/admin/moderation/${encodeURIComponent(id)}/resolve`, {
        method: "POST",
      });
      await loadModeration();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to resolve report");
    } finally {
      setModerationBusy(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100svh-(--spacing(16)))] overflow-x-hidden bg-stone-100 bg-[radial-gradient(ellipse_110%_70%_at_15%_-10%,rgba(251,191,36,0.45),transparent_55%),radial-gradient(ellipse_90%_55%_at_95%_5%,rgba(253,186,116,0.35),transparent_50%),linear-gradient(180deg,rgba(255,255,255,0.92),rgba(250,250,249,0.98))] dark:bg-background">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-amber-400/50 to-transparent dark:via-amber-500/30" />
      <div className="container relative mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-[260px_1fr]">
        <aside className="sticky top-20 hidden h-fit md:block">
          <Card
            size="sm"
            className="border border-amber-200/50 bg-white/85 shadow-2xl shadow-amber-900/5 ring-1 ring-amber-300/40 backdrop-blur-xl dark:border-border dark:bg-card/85 dark:shadow-none dark:ring-amber-900/40"
          >
            <CardHeader className="border-b border-border/60">
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="size-4 text-amber-700 dark:text-amber-300" />
                Admin dashboard
              </CardTitle>
              <CardDescription>Users, moderation, system control.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 pt-4">
              {tabs.map(({ key, label, icon }) => (
                <Button
                  key={key}
                  type="button"
                  variant={tab === key ? "default" : "ghost"}
                  size="sm"
                  className={`w-full justify-between ${tab === key ? "shadow-xs" : ""}`}
                  onClick={() => {
                    setTab(key);
                  }}
                  aria-pressed={tab === key}
                >
                  <span className="flex items-center gap-2">
                    {icon}
                    {label}
                  </span>
                  <ChevronRight className="size-4 opacity-60" />
                </Button>
              ))}
              <a href={analyticsHref} className="block pt-1">
                <Button type="button" variant="outline" size="sm" className="w-full justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <BarChart3 className="size-4" />
                    Open analytics
                  </span>
                  <ChevronRight className="size-4 opacity-60" />
                </Button>
              </a>
              <div className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full gap-2"
                  onClick={() => {
                    void refreshOverview();
                  }}
                  disabled={overviewRefreshing}
                >
                  <RefreshCw className={`size-4 ${overviewRefreshing ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </div>
            </CardContent>
          </Card>
        </aside>

        <main className="space-y-8">
          <div className="flex flex-wrap items-start justify-between gap-6 rounded-none border border-amber-200/40 bg-white/70 p-6 shadow-lg shadow-amber-900/5 ring-1 ring-amber-200/30 backdrop-blur-md dark:border-border dark:bg-card/60 dark:shadow-none dark:ring-border">
            <div className="max-w-2xl space-y-2">
              <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-amber-800/80 dark:text-amber-200/80">
                Feature · Admin dashboard
              </p>
              <h1 className="bg-linear-to-br from-amber-950 via-amber-800 to-orange-900 bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-4xl dark:from-amber-50 dark:via-amber-200 dark:to-orange-100">
                Operations console
              </h1>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Manage users, moderation, and runtime checks. Platform analytics live in{" "}
                <span className="font-medium text-foreground">@repo/feature-analytics</span> — open{" "}
                <span className="font-medium text-foreground">Analytics</span> from the sidebar or header.
              </p>
            </div>

            <div className="flex flex-col items-stretch gap-3 sm:items-end">
              <div className="flex flex-wrap items-center justify-end gap-2">
                <HealthPill status={systemHealth} />
                {maintenanceMode ? <Pill tone="warning">Maintenance: ON</Pill> : <Pill tone="neutral">Maintenance: OFF</Pill>}
              </div>
              {viewerEmail ? (
                <Card
                  size="sm"
                  className="w-full min-w-[220px] border border-amber-200/50 bg-amber-50/50 sm:w-auto dark:border-border dark:bg-muted/40"
                >
                  <CardContent className="py-3 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Signed in</span> — {viewerEmail}
                  </CardContent>
                </Card>
              ) : null}
            </div>
          </div>

          {error ? (
            <div
              className="rounded-none border border-destructive/30 bg-destructive/10 px-4 py-3 text-xs text-destructive"
              role="alert"
            >
              {error}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2 md:hidden">
            {tabs.map(({ key, label, icon }) => (
              <Button
                key={key}
                type="button"
                variant={tab === key ? "default" : "ghost"}
                size="sm"
                className={`gap-1.5 ${tab === key ? "shadow-xs" : ""}`}
                onClick={() => {
                  setTab(key);
                }}
                aria-pressed={tab === key}
              >
                {icon}
                {label}
              </Button>
            ))}
            <a href={analyticsHref}>
              <Button type="button" variant="outline" size="sm" className="gap-2">
                <BarChart3 className="size-4" />
                Analytics
              </Button>
            </a>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => {
                void refreshOverview();
              }}
              disabled={overviewRefreshing}
            >
              <RefreshCw className={`size-4 ${overviewRefreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {tab === "overview" ? (
            <section className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
                {loading
                  ? [...Array.from({ length: 4 })].map((_, i) => (
                      <Skeleton key={`sk-${String(i)}`} className="h-28 w-full rounded-none" />
                    ))
                  : summary
                    ? (
                        <>
                          <StatTile
                            label="Registered accounts"
                            value={summary.totals.users}
                            caption="Across the single shared User table."
                          />
                          <StatTile
                            label="Profiles"
                            value={summary.totals.profiles}
                            caption="Synced with the User Profiles feature."
                          />
                          <StatTile
                            label="Verified emails"
                            value={summary.totals.verifiedEmails}
                            caption="From Better Auth signup state."
                          />
                          <StatTile
                            label="Active sessions"
                            value={summary.totals.activeSessions}
                            caption="Non-expired session rows."
                          />
                        </>
                      )
                    : null}
              </div>

              <div className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
                <Card className="overflow-hidden border border-amber-200/35 bg-white/80 shadow-md ring-1 ring-amber-200/25 backdrop-blur-sm dark:border-border dark:bg-card/70 dark:ring-border">
                  <CardHeader className="border-b border-border/80 bg-amber-50/30 dark:bg-muted/20">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <CardTitle>User directory (recent)</CardTitle>
                        <CardDescription>Filter the latest registrations for quick admin checks.</CardDescription>
                      </div>
                      <div className="relative w-full min-w-[200px] max-w-xs">
                        <Search className="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          value={userQuery}
                          onChange={(e) => {
                            setUserQuery(e.target.value);
                          }}
                          placeholder="Search name, email, id…"
                          className="pl-8"
                          aria-label="Search recent users"
                        />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="overflow-x-auto p-0">
                    {loading ? (
                      <div className="space-y-2 p-4">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                      </div>
                    ) : summary ? (
                      <>
                        {filteredRecentUsers.length === 0 ? (
                          <p className="p-4 text-sm text-muted-foreground">No users match this search.</p>
                        ) : (
                          <table className="w-full border-collapse text-left text-xs">
                            <thead className="bg-muted/60 text-muted-foreground">
                              <tr>
                                <th className="px-4 py-3 font-medium">User</th>
                                <th className="px-4 py-3 font-medium">Email</th>
                                <th className="px-4 py-3 font-medium">Verified</th>
                                <th className="px-4 py-3 font-medium">Joined</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredRecentUsers.map((u) => (
                                <tr key={u.id} className="border-t border-border/60 hover:bg-muted/30">
                                  <td className="px-4 py-3 font-medium">{u.name}</td>
                                  <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                                  <td className="px-4 py-3">
                                    {u.emailVerified ? (
                                      <span className="inline-flex items-center gap-1 text-green-700 dark:text-green-400">
                                        <CheckCircle2 className="size-3.5" />
                                        Verified
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 text-amber-800 dark:text-amber-200">
                                        <CircleAlert className="size-3.5" />
                                        Pending
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-muted-foreground">
                                    {new Date(u.createdAt).toLocaleDateString(undefined, {
                                      weekday: "short",
                                      month: "short",
                                      day: "numeric",
                                    })}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </>
                    ) : null}
                  </CardContent>
                </Card>

                <div className="space-y-4">
                  <Card className="border border-amber-200/35 bg-white/80 shadow-md ring-1 ring-amber-200/25 backdrop-blur-sm dark:border-border dark:bg-card/70 dark:ring-border">
                    <CardHeader className="border-b border-border/60 bg-linear-to-r from-amber-50/80 to-transparent dark:from-muted/30">
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="size-4 text-amber-700 dark:text-amber-300" />
                        System control
                      </CardTitle>
                      <CardDescription>Prototype controls for runtime operations.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-foreground">Maintenance mode</p>
                          <p className="text-xs text-muted-foreground">
                            Local-only toggle (does not persist). Demonstrates admin system switches.
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant={maintenanceMode ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            setMaintenanceMode((v) => !v);
                          }}
                        >
                          {maintenanceMode ? "On" : "Off"}
                        </Button>
                      </div>

                      <div className="rounded-none border border-border/70 bg-muted/30 p-3">
                        <p className="text-xs font-medium text-foreground">Backend health</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Status:{" "}
                          <span className="font-medium text-foreground">
                            {systemHealth === "unknown" ? "Checking…" : systemHealth === "ok" ? "Healthy" : "Down"}
                          </span>
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            onClick={() => {
                              void refreshOverview();
                            }}
                            disabled={overviewRefreshing}
                          >
                            <RefreshCw className={`size-4 ${overviewRefreshing ? "animate-spin" : ""}`} />
                            Re-check
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="gap-2"
                            onClick={() => {
                              setError(null);
                            }}
                          >
                            Clear errors
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card size="sm" className="border border-dashed border-amber-300/50 bg-amber-50/20 dark:border-border dark:bg-muted/20">
                    <CardHeader className="border-b border-border/50">
                      <CardTitle className="text-sm">Audit log</CardTitle>
                      <CardDescription>Placeholder for immutable admin actions.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-3 text-xs text-muted-foreground">
                      When moderation and user edits persist server-side, append entries here via a dedicated
                      <span className="font-mono"> /api/admin/audit</span> route.
                    </CardContent>
                  </Card>
                </div>
              </div>
            </section>
          ) : null}

          {tab === "moderation" ? (
            <section className="grid gap-4 md:grid-cols-2">
              {moderationBusy ? (
                <>
                  <Skeleton className="h-44 w-full rounded-none" />
                  <Skeleton className="h-44 w-full rounded-none" />
                </>
              ) : null}
              {!moderationBusy && moderation.length === 0 ? (
                <p className="text-sm text-muted-foreground md:col-span-2">No flagged items queued.</p>
              ) : null}
              {!moderationBusy
                ? moderation.map((item) => (
                    <Card
                      key={item.id}
                      size="sm"
                      className="gap-3 border border-amber-200/35 bg-white/85 shadow-md ring-1 ring-amber-200/20 backdrop-blur-sm transition-shadow hover:shadow-lg dark:border-border dark:bg-card/80 dark:ring-border"
                    >
                      <CardHeader className="border-b border-border/70">
                        <div className="flex items-center justify-between gap-2">
                          <CardTitle className="flex items-center gap-2 capitalize">
                            {item.entityType}
                            <span
                              className={
                                item.status === "escalated"
                                  ? "text-[10px] uppercase tracking-wide text-destructive"
                                  : "text-[10px] uppercase tracking-wide text-amber-800 dark:text-amber-200"
                              }
                            >
                              {item.status}
                            </span>
                          </CardTitle>
                          <CardDescription suppressHydrationWarning>
                            {new Date(item.createdAt).toLocaleString()}
                          </CardDescription>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <p className="text-sm leading-relaxed text-foreground/90">{item.excerpt}</p>
                        <p className="text-xs text-muted-foreground">
                          Reporter:{" "}
                          <span className="font-medium text-foreground">{item.reporterPreview}</span>
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            void resolveModerationItem(item.id);
                          }}
                        >
                          Mark reviewed (prototype)
                        </Button>
                      </CardContent>
                    </Card>
                  ))
                : null}
            </section>
          ) : null}
        </main>
      </div>
    </div>
  );
}

function StatTile({ label, value, caption }: { label: string; value: number; caption: string }) {
  return (
    <Card
      size="sm"
      className="justify-between border border-amber-200/40 bg-linear-to-br from-white via-white to-amber-50/40 shadow-md shadow-amber-900/5 ring-1 ring-amber-200/30 backdrop-blur-sm dark:border-border dark:from-card dark:via-card dark:to-amber-950/20 dark:shadow-none dark:ring-border"
    >
      <CardHeader className="space-y-0">
        <CardDescription>{label}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold tabular-nums tracking-tight text-amber-950 dark:text-foreground">{value}</p>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{caption}</p>
      </CardContent>
    </Card>
  );
}

function Pill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "danger" | "warning";
}) {
  const cls =
    tone === "success"
      ? "border-green-200 bg-green-50 text-green-800 dark:border-green-900/60 dark:bg-green-950/40 dark:text-green-300"
      : tone === "danger"
        ? "border-destructive/30 bg-destructive/10 text-destructive"
        : tone === "warning"
          ? "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200"
          : "border-border/70 bg-muted/40 text-muted-foreground";

  return (
    <span className={`inline-flex items-center gap-1 rounded-none border px-2 py-1 text-[11px] ${cls}`}>
      {children}
    </span>
  );
}

function HealthPill({ status }: { status: "unknown" | "ok" | "down" }) {
  if (status === "unknown") {
    return <Pill tone="neutral">Health: checking…</Pill>;
  }
  if (status === "ok") {
    return (
      <Pill tone="success">
        <CheckCircle2 className="size-3.5" />
        Health: OK
      </Pill>
    );
  }
  return (
    <Pill tone="danger">
      <CircleAlert className="size-3.5" />
      Health: DOWN
    </Pill>
  );
}
