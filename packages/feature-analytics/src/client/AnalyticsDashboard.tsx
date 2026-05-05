"use client";

import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { Skeleton } from "@repo/ui/components/skeleton";
import { BarChart3, ChevronRight, LayoutGrid, LineChart, RefreshCw, TrendingUp } from "lucide-react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";

import { fetchAnalyticsApi } from "./analyticsFetch";

import type { AnalyticsOverviewResponse } from "../shared";

interface AnalyticsDashboardProps {
  apiBaseUrl: string;
  viewerEmail?: string | null;
  adminHref?: string;
}

export function AnalyticsDashboard({
  apiBaseUrl,
  viewerEmail,
  adminHref = "/admin",
}: AnalyticsDashboardProps) {
  const [data, setData] = useState<AnalyticsOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetchAnalyticsApi<AnalyticsOverviewResponse>(
      apiBaseUrl,
      "/api/analytics/overview",
    );
    setData(res);
  }, [apiBaseUrl]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        await load();
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Unable to load analytics");
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
  }, [load]);

  const refresh = async () => {
    setRefreshing(true);
    setError(null);
    try {
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to refresh");
    } finally {
      setRefreshing(false);
    }
  };

  const maxSignup = data ? Math.max(1, ...data.signupByDay.map((d) => d.count)) : 1;
  const line = buildLinePath((data?.signupByDay ?? []).map((d) => d.count));

  return (
    <div className="relative min-h-[calc(100svh-(--spacing(16)))] overflow-x-hidden bg-slate-50 bg-[radial-gradient(ellipse_100%_65%_at_10%_-5%,rgba(99,102,241,0.28),transparent_50%),radial-gradient(ellipse_85%_50%_at_100%_0%,rgba(245,158,11,0.22),transparent_48%),linear-gradient(180deg,rgba(255,255,255,0.95),rgba(248,250,252,0.98))] dark:bg-background">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-indigo-400/40 to-transparent dark:via-indigo-500/25" />
      <div className="container relative mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-[240px_1fr]">
        <aside className="sticky top-20 hidden h-fit md:block">
          <Card
            size="sm"
            className="border border-indigo-200/45 bg-white/85 shadow-2xl shadow-indigo-900/5 ring-1 ring-indigo-300/35 backdrop-blur-xl dark:border-border dark:bg-card/85 dark:shadow-none dark:ring-indigo-900/35"
          >
            <CardHeader className="border-b border-border/60">
              <CardTitle className="flex items-center gap-2">
                <LineChart className="size-4 text-indigo-700 dark:text-indigo-300" />
                Analytics
              </CardTitle>
              <CardDescription>Usage &amp; growth insights.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 pt-4">
              <Button type="button" variant="default" size="sm" className="w-full justify-between shadow-xs">
                <span className="flex items-center gap-2">
                  <BarChart3 className="size-4" />
                  Overview
                </span>
                <ChevronRight className="size-4 opacity-60" />
              </Button>
              <a href={adminHref} className="block">
                <Button type="button" variant="ghost" size="sm" className="w-full justify-between">
                  <span className="flex items-center gap-2">
                    <LayoutGrid className="size-4" />
                    Admin dashboard
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
                    void refresh();
                  }}
                  disabled={refreshing}
                >
                  <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
                  Refresh data
                </Button>
              </div>
            </CardContent>
          </Card>
        </aside>

        <main className="space-y-8">
          <div className="flex flex-wrap items-start justify-between gap-6 rounded-none border border-indigo-200/35 bg-white/70 p-6 shadow-lg shadow-indigo-900/5 ring-1 ring-indigo-200/25 backdrop-blur-md dark:border-border dark:bg-card/60 dark:shadow-none dark:ring-border">
            <div className="max-w-2xl space-y-2">
              <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-indigo-900/75 dark:text-indigo-200/75">
                Feature · Analytics
              </p>
              <h1 className="bg-linear-to-br from-slate-900 via-indigo-900 to-indigo-700 bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-4xl dark:from-slate-50 dark:via-indigo-100 dark:to-amber-100">
                Platform insights
              </h1>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Live metrics from the shared database. When Posts, Events, and Chat ship, add REST endpoints under{" "}
                <span className="font-mono text-xs text-foreground/90">/api/analytics/*</span> — features stay decoupled
                (no cross-imports).
              </p>
            </div>
            {viewerEmail ? (
              <Card
                size="sm"
                className="w-full min-w-[220px] border border-indigo-200/45 bg-indigo-50/40 sm:w-auto dark:border-border dark:bg-muted/40"
              >
                <CardContent className="py-3 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Viewer</span> — {viewerEmail}
                </CardContent>
              </Card>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2 md:hidden">
            <Button type="button" variant="default" size="sm" className="gap-2 shadow-xs">
              <BarChart3 className="size-4" />
              Overview
            </Button>
            <a href={adminHref}>
              <Button type="button" variant="ghost" size="sm" className="gap-2">
                <LayoutGrid className="size-4" />
                Admin
              </Button>
            </a>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => {
                void refresh();
              }}
              disabled={refreshing}
            >
              <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {error ? (
            <div
              className="rounded-none border border-destructive/30 bg-destructive/10 px-4 py-3 text-xs text-destructive"
              role="alert"
            >
              {error}
            </div>
          ) : null}

          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
            <InsightPlaceholder
              title="Posts & feed"
              subtitle="Coming when feature-posts ships"
              icon={<TrendingUp className="size-4" />}
            />
            <InsightPlaceholder
              title="Events & RSVPs"
              subtitle="Wire /api/analytics/events"
              icon={<BarChart3 className="size-4" />}
            />
            <InsightPlaceholder
              title="Chat volume"
              subtitle="Wire /api/analytics/chat"
              icon={<LineChart className="size-4" />}
            />
          </section>

          {loading ? (
            <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
              <Skeleton className="h-64 w-full rounded-none" />
              <Skeleton className="h-64 w-full rounded-none" />
            </div>
          ) : data ? (
            <>
              <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
                <Card className="border border-indigo-200/35 bg-white/80 shadow-md ring-1 ring-indigo-200/20 backdrop-blur-sm dark:border-border dark:bg-card/70 dark:ring-border">
                  <CardHeader className="border-b border-border/60 bg-linear-to-r from-indigo-50/70 to-transparent dark:from-muted/25">
                    <CardTitle>Growth trend</CardTitle>
                    <CardDescription>14-day new user signups (UTC buckets).</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6 pb-8">
                    <div className="grid gap-4 md:grid-cols-[1fr_220px]">
                      <div className="relative h-48 w-full overflow-hidden rounded-none border border-border/60 bg-background">
                        <svg viewBox="0 0 300 160" className="h-full w-full">
                          <path d="M0 128 H300" stroke="currentColor" className="text-border/70" strokeWidth="1" />
                          <path d="M0 80 H300" stroke="currentColor" className="text-border/50" strokeWidth="1" />
                          <path d="M0 32 H300" stroke="currentColor" className="text-border/40" strokeWidth="1" />
                          <path d={line.area} fill="currentColor" className="text-indigo-500/20" />
                          <path
                            d={line.path}
                            fill="none"
                            stroke="currentColor"
                            className="text-indigo-600 dark:text-indigo-400"
                            strokeWidth="2.5"
                            strokeLinejoin="round"
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-indigo-50/40 to-transparent dark:from-indigo-500/10" />
                      </div>
                      <div className="space-y-3">
                        <KpiRow
                          label="New users (rolling 7d)"
                          value={data.kpis.newUsersThisWeek}
                          hint={`Prior week: ${data.kpis.newUsersPriorWeek}`}
                          trend={data.kpis.percentChangeVsPriorWeek}
                        />
                        <KpiRow
                          label="Profile coverage"
                          value={`${data.kpis.profileCompletionRate}%`}
                          hint="Profiles / Users"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border border-amber-200/40 bg-white/80 shadow-md ring-1 ring-amber-200/25 backdrop-blur-sm dark:border-border dark:bg-card/70 dark:ring-border">
                  <CardHeader className="border-b border-border/60 bg-amber-50/25 dark:bg-muted/15">
                    <CardTitle>Signups · last 14 days</CardTitle>
                    <CardDescription>Bar view for quick scanning.</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6 pb-8">
                    <div className="flex h-48 items-end gap-1 md:gap-2">
                      {data.signupByDay.map((day) => (
                        <div key={day.date} className="flex flex-1 flex-col items-center gap-2">
                          <div
                            className="relative w-full max-w-[40px] bg-stone-200/80 dark:bg-muted"
                            role="presentation"
                          >
                            <div
                              className="rounded-none bg-amber-600 dark:bg-amber-500 shadow-sm transition-all"
                              style={{
                                height: `${Math.max((day.count / maxSignup) * 160, day.count === 0 ? 2 : 4)}px`,
                              }}
                            />
                          </div>
                          <span className="rotate-[-40deg] text-[10px] text-muted-foreground md:rotate-0 md:text-[11px]">
                            {formatShortDate(day.date)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : null}
        </main>
      </div>
    </div>
  );
}

function InsightPlaceholder({
  title,
  subtitle,
  icon,
}: {
  title: string;
  subtitle: string;
  icon: ReactNode;
}) {
  return (
    <Card
      size="sm"
      className="border border-slate-200/60 bg-linear-to-br from-white via-slate-50/80 to-indigo-50/30 shadow-sm ring-1 ring-indigo-100/40 dark:border-border dark:from-card dark:via-card dark:to-indigo-950/20 dark:ring-border"
    >
      <CardHeader className="border-b border-border/50">
        <CardTitle className="flex items-center gap-2 text-sm">
          <span className="rounded-none bg-indigo-100/80 p-1.5 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
            {icon}
          </span>
          {title}
        </CardTitle>
        <CardDescription>{subtitle}</CardDescription>
      </CardHeader>
      <CardContent className="pt-3 text-xs leading-relaxed text-muted-foreground">
        Placeholder for cross-platform activity once those features expose read APIs.
      </CardContent>
    </Card>
  );
}

function Pill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "danger";
}) {
  const cls =
    tone === "success"
      ? "border-green-200 bg-green-50 text-green-800 dark:border-green-900/60 dark:bg-green-950/40 dark:text-green-300"
      : tone === "danger"
        ? "border-destructive/30 bg-destructive/10 text-destructive"
        : "border-border/70 bg-muted/40 text-muted-foreground";

  return (
    <span className={`inline-flex items-center gap-1 rounded-none border px-2 py-1 text-[11px] ${cls}`}>
      {children}
    </span>
  );
}

function KpiRow({
  label,
  value,
  hint,
  trend,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  trend?: number | null;
}) {
  return (
    <div className="rounded-none border border-indigo-100/80 bg-white/90 p-3 shadow-sm dark:border-border dark:bg-background/80">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight text-indigo-950 dark:text-foreground">
            {value}
          </p>
        </div>
        {typeof trend === "number" ? (
          <Pill tone={trend >= 0 ? "success" : "danger"}>
            {trend >= 0 ? "+" : ""}
            {trend}%
          </Pill>
        ) : trend === null ? (
          <Pill tone="neutral">n/a</Pill>
        ) : null}
      </div>
      {hint ? <p className="mt-2 text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function formatShortDate(iso: string) {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function buildLinePath(values: number[]) {
  const w = 300;
  const h = 160;
  const padX = 14;
  const padY = 18;
  const innerW = w - padX * 2;
  const innerH = h - padY * 2;
  const max = Math.max(1, ...values);

  const pts = values.map((v, i) => {
    const x = padX + (i / Math.max(1, values.length - 1)) * innerW;
    const y = padY + innerH - (v / max) * innerH;
    return { x, y };
  });

  const path = pts
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");

  const area =
    `${path} L ${(padX + innerW).toFixed(1)} ${(padY + innerH).toFixed(1)} ` +
    `L ${padX.toFixed(1)} ${(padY + innerH).toFixed(1)} Z`;

  return { path, area };
}
