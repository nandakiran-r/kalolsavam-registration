"use client";

import { useState } from "react";
import {
  ArrowRight,
  CalendarCheck,
  ChartBar,
  CheckCircle,
  FileCsv,
  Funnel,
  House as HouseIcon,
  SpinnerGap,
  Users,
} from "@phosphor-icons/react";
import type { AdminMeta, AdminStats } from "@/lib/types";
import { HOUSE_META, type House, KALOLSAVAM_YEAR } from "@/lib/constants";
import { HouseChip } from "@/components/ui/HouseChip";
import { useToast } from "@/components/ui/Toast";
import { api, ApiError } from "@/lib/client";

function StatCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string | number;
  hint: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="border-l-2 border-line-strong bg-white px-4 py-4 first:border-l-0 sm:px-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-faint">
          {label}
        </p>
        <span className="text-ink-faint">{icon}</span>
      </div>
      <p className="mt-3 font-display text-[34px] font-bold leading-none tracking-[-0.03em] text-ink">
        {value}
      </p>
      <p className="mt-1.5 text-[11px] text-ink-soft">{hint}</p>
    </div>
  );
}

export function Overview({
  stats,
  meta,
  loading,
  onRefresh,
  onOpenRegistrations,
}: {
  stats: AdminStats | null;
  meta: AdminMeta | null;
  loading: boolean;
  onRefresh: () => void;
  onOpenRegistrations: () => void;
}) {
  const { toast } = useToast();
  const [toggling, setToggling] = useState(false);

  const maxHouse = Math.max(
    1,
    ...(stats?.byHouse.map((item) => item.count) ?? [1]),
  );
  const maxEvent = Math.max(1, ...(stats?.byEvent.map((item) => item.count) ?? [1]));

  async function toggleRegistration() {
    if (!meta || toggling) return;
    const next = !meta.registrationOpen;
    setToggling(true);
    try {
      await api<{ registrationOpen: boolean }>("/api/admin/settings", {
        method: "PATCH",
        body: JSON.stringify({ registrationOpen: next }),
      });
      toast(
        next
          ? "Registration desk is now open for students."
          : "Registration desk closed. Students cannot submit new entries.",
        "success",
      );
      onRefresh();
    } catch (error) {
      toast(
        error instanceof ApiError
          ? error.message
          : "Could not update the registration window.",
        "error",
      );
    } finally {
      setToggling(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-maroon">
            Kalolsavam {KALOLSAVAM_YEAR}
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-[-0.025em] text-ink">
            Festival overview
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            Live counts from the registration desk.
          </p>
        </div>
        <button type="button" onClick={onRefresh} className="btn-secondary" disabled={loading}>
          {loading ? (
            <SpinnerGap size={16} weight="bold" className="animate-spin" />
          ) : (
            <ChartBar size={16} weight="bold" />
          )}
          Refresh
        </button>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-line bg-white">
        <div className="grid grid-cols-1 divide-y divide-line sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4">
          <StatCard
            label="Total registrations"
            value={stats?.total ?? "—"}
            hint="Active student profiles"
            icon={<Users size={19} weight="bold" />}
          />
          <StatCard
            label="Last 24 hours"
            value={stats?.today ?? "—"}
            hint="New entries today"
            icon={<CalendarCheck size={19} weight="bold" />}
          />
          <StatCard
            label="Active events"
            value={meta?.events.filter((event) => event.is_active).length ?? "—"}
            hint="Open for selection"
            icon={<Funnel size={19} weight="bold" />}
          />
          <StatCard
            label="Registration desk"
            value={meta?.registrationOpen ? "Open" : "Closed"}
            hint={meta?.registrationOpen ? "Accepting new entries" : "New entries paused"}
            icon={
              meta?.registrationOpen ? (
                <CheckCircle size={19} weight="bold" className="text-green" />
              ) : (
                <CalendarCheck size={19} weight="bold" />
              )
            }
          />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-xl border border-line bg-white p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-semibold text-ink">
                House distribution
              </h2>
              <p className="mt-0.5 text-xs text-ink-soft">
                Registrations across the four houses.
              </p>
            </div>
            <HouseIcon size={20} weight="bold" className="text-ink-faint" />
          </div>

          <div className="mt-5 space-y-4">
            {(["A", "B", "C", "D"] as House[]).map((house) => {
              const count =
                stats?.byHouse.find((item) => item.house === house)?.count ?? 0;
              return (
                <div key={house}>
                  <div className="flex items-center justify-between gap-3">
                    <HouseChip house={house} size="sm" />
                    <span className="font-mono text-xs font-bold text-ink">
                      {count}
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-paper-2">
                    <div
                      className="h-full rounded-full transition-[width] duration-500"
                      style={{
                        width: `${Math.round((count / maxHouse) * 100)}%`,
                        backgroundColor: HOUSE_META[house].hex,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-5 flex items-center justify-between border-t border-line pt-3">
            <p className="text-[11px] text-ink-faint">
              {stats
                ? `${stats.byAssociation.filter((item) => item.count > 0).length} associations represented`
                : "Loading associations…"}
            </p>
            <button
              type="button"
              onClick={onOpenRegistrations}
              className="inline-flex items-center gap-1 text-xs font-bold text-maroon hover:underline"
            >
              View registrations <ArrowRight size={13} weight="bold" />
            </button>
          </div>
        </section>

        <section className="rounded-xl border border-line bg-white p-5 sm:p-6">
          <h2 className="font-display text-lg font-semibold text-ink">
            Event entries
          </h2>
          <p className="mt-0.5 text-xs text-ink-soft">
            Number of students registered per event.
          </p>

          <div className="mt-5 space-y-3.5">
            {(stats?.byEvent ?? []).map((event) => (
              <div key={event.id}>
                <div className="flex items-baseline justify-between gap-3">
                  <p className="min-w-0 truncate text-xs font-semibold text-ink">
                    {event.name_en}
                  </p>
                  <span className="shrink-0 font-mono text-[11px] font-bold text-ink-soft">
                    {event.count}
                  </span>
                </div>
                <p className="mt-0.5 truncate font-malayalam text-[10px] text-ink-faint">
                  {event.name_ml}
                </p>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-paper-2">
                  <div
                    className="h-full rounded-full bg-ink/70"
                    style={{
                      width: `${Math.round((event.count / maxEvent) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
            {!stats ? (
              <div className="space-y-3">
                <div className="skeleton h-8 rounded" />
                <div className="skeleton h-8 rounded" />
                <div className="skeleton h-8 rounded" />
              </div>
            ) : null}
          </div>
        </section>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="overflow-hidden rounded-xl border border-line bg-white">
          <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
            <h2 className="font-display text-lg font-semibold text-ink">
              Recent registrations
            </h2>
            <button
              type="button"
              onClick={onOpenRegistrations}
              className="text-xs font-bold text-maroon hover:underline"
            >
              See all
            </button>
          </div>
          <div className="divide-y divide-line">
            {(stats?.recent ?? []).map((student) => (
              <div
                key={student.id}
                className="flex items-center justify-between gap-3 px-5 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">
                    {student.name}
                  </p>
                  <p className="mt-0.5 font-mono text-[11px] text-ink-faint">
                    {student.application_id}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <HouseChip house={student.house} size="sm" />
                  <span className="hidden text-[11px] text-ink-faint sm:inline">
                    {new Date(student.created_at).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                    })}
                  </span>
                </div>
              </div>
            ))}
            {!stats?.recent.length ? (
              <p className="px-5 py-8 text-center text-sm text-ink-faint">
                No registrations yet.
              </p>
            ) : null}
          </div>
        </section>

        <section className="rounded-xl border border-line bg-white p-5 sm:p-6">
          <h2 className="font-display text-lg font-semibold text-ink">
            Registration window
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-ink-soft">
            Close the desk to stop new submissions instantly. Existing students can
            still view and edit their own profiles.
          </p>

          <div className="mt-4 flex items-center justify-between gap-4 rounded-lg border border-line bg-paper/60 px-3.5 py-3">
            <div>
              <p className="text-sm font-bold text-ink">
                {meta?.registrationOpen ? "Open for entries" : "Closed"}
              </p>
              <p className="mt-0.5 text-[11px] text-ink-soft">
                {meta?.registrationOpen
                  ? "Students can submit the form."
                  : "New submissions are blocked."}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={Boolean(meta?.registrationOpen)}
              aria-label="Toggle student registration"
              onClick={toggleRegistration}
              disabled={toggling || !meta}
              className={`relative h-7 w-12 shrink-0 rounded-full transition ${
                meta?.registrationOpen ? "bg-green" : "bg-line-strong"
              } disabled:opacity-60`}
            >
              <span
                className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${
                  meta?.registrationOpen ? "left-6" : "left-1"
                }`}
              />
            </button>
          </div>

          <div className="mt-4 border-t border-line pt-4">
            <a
              href="/api/admin/export/csv"
              className="btn-secondary w-full"
            >
              <FileCsv size={17} weight="bold" />
              Export all registrations (CSV)
            </a>
            <p className="mt-2 text-center text-[11px] text-ink-faint">
              UTF-8 with BOM for Excel · formula-injection safe
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
