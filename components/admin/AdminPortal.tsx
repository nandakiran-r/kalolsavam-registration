"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowSquareOut,
  CalendarBlank,
  ChartBar,
  LockKey,
  SignOut,
  SpinnerGap,
  Users,
} from "@phosphor-icons/react";
import type { AdminMeta, AdminSession, AdminStats } from "@/lib/types";
import { api, ApiError } from "@/lib/client";
import { LoginScreen } from "./LoginScreen";
import { Overview } from "./Overview";
import { RegistrationsPanel } from "./RegistrationsPanel";
import { EventsPanel } from "./EventsPanel";
import { ChangePasswordModal } from "./ChangePasswordModal";
import { useToast } from "@/components/ui/Toast";
import { COLLEGE_NAME } from "@/lib/constants";

type View = "overview" | "registrations" | "events";

const NAV: { key: View; label: string; icon: React.ReactNode }[] = [
  { key: "overview", label: "Overview", icon: <ChartBar size={18} weight="bold" /> },
  { key: "registrations", label: "Registrations", icon: <Users size={18} weight="bold" /> },
  { key: "events", label: "Events", icon: <CalendarBlank size={18} weight="bold" /> },
];

export function AdminPortal() {
  const { toast } = useToast();
  const [session, setSession] = useState<AdminSession | null | undefined>(undefined);
  const [view, setView] = useState<View>("overview");
  const [meta, setMeta] = useState<AdminMeta | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [metaLoading, setMetaLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

  useEffect(() => {
    api<{ admin: AdminSession }>("/api/admin/me")
      .then((data) => setSession(data.admin))
      .catch(() => setSession(null));
  }, []);

  useEffect(() => {
    if (session?.mustChangePassword) setChangePasswordOpen(true);
  }, [session]);

  const handleAuthError = useCallback((error: unknown) => {
    if (error instanceof ApiError && error.status === 401) {
      setSession(null);
      return true;
    }
    return false;
  }, []);

  const refreshMeta = useCallback(() => {
    setMetaLoading(true);
    api<AdminMeta>("/api/admin/meta")
      .then((data) => setMeta(data))
      .catch((error) => {
        if (!handleAuthError(error)) {
          toast(
            error instanceof ApiError ? error.message : "Could not load admin data.",
            "error",
          );
        }
      })
      .finally(() => setMetaLoading(false));
  }, [handleAuthError, toast]);

  const refreshStats = useCallback(() => {
    setStatsLoading(true);
    api<AdminStats>("/api/admin/stats")
      .then((data) => setStats(data))
      .catch((error) => {
        if (!handleAuthError(error)) {
          toast(
            error instanceof ApiError ? error.message : "Could not load overview.",
            "error",
          );
        }
      })
      .finally(() => setStatsLoading(false));
  }, [handleAuthError, toast]);

  useEffect(() => {
    if (!session) return;
    refreshMeta();
    refreshStats();
  }, [session, refreshMeta, refreshStats]);

  function refreshAll() {
    refreshMeta();
    refreshStats();
  }

  async function logout() {
    try {
      await api("/api/admin/logout", { method: "POST" });
    } catch {
      // Clear the client state even if the network call fails.
    }
    setSession(null);
    setMeta(null);
    setStats(null);
    setView("overview");
  }

  if (session === undefined) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-paper">
        <div className="flex items-center gap-3 text-sm font-semibold text-ink-soft">
          <SpinnerGap size={20} weight="bold" className="animate-spin" />
          Opening the control room…
        </div>
      </div>
    );
  }

  if (session === null) {
    return (
      <LoginScreen
        onSuccess={(next) => {
          setSession(next);
          setView("overview");
        }}
      />
    );
  }

  return (
    <div className="min-h-[100dvh] bg-paper lg:grid lg:grid-cols-[248px_1fr]">
      <aside className="sticky top-0 hidden h-[100dvh] flex-col bg-ink px-4 py-5 text-paper lg:flex">
        <Link href="/admin" className="flex items-center gap-3 px-2">
          <span className="grid h-10 w-10 place-items-center rounded-lg border border-paper/20 bg-paper/10 text-[12px] font-extrabold tracking-[-0.04em]">
            SJC
          </span>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-bold leading-tight">
              Kalolsavam
            </p>
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-paper/45">
              Control room
            </p>
          </div>
        </Link>

        <nav className="mt-8 space-y-1" aria-label="Admin sections">
          {NAV.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setView(item.key)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition ${
                view === item.key
                  ? "bg-paper/10 text-white"
                  : "text-paper/60 hover:bg-paper/5 hover:text-paper"
              }`}
              aria-current={view === item.key ? "page" : undefined}
            >
              <span className={view === item.key ? "text-gold" : ""}>
                {item.icon}
              </span>
              <span className="flex-1">{item.label}</span>
              {item.key === "registrations" && meta ? (
                <span className="rounded-full bg-paper/10 px-1.5 py-0.5 font-mono text-[10px] text-paper/70">
                  {meta.totalRegistrations}
                </span>
              ) : null}
            </button>
          ))}
        </nav>

        <div className="mt-5 rounded-lg border border-paper/10 bg-paper/5 px-3 py-2.5">
          <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-paper/40">
            Registration desk
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                meta?.registrationOpen ? "bg-[#6fd2a9]" : "bg-paper/40"
              }`}
            />
            {meta?.registrationOpen ? "Open for entries" : "Closed"}
          </p>
        </div>

        <div className="mt-auto border-t border-paper/10 pt-4">
          <p className="truncate px-2 text-[11px] font-semibold text-paper/80">
            {session.email}
          </p>
          <p className="px-2 text-[10px] uppercase tracking-[0.1em] text-paper/40">
            {session.role === "admin" ? "Administrator" : "Viewer"}
          </p>
          <div className="mt-3 space-y-1">
            <button
              type="button"
              onClick={() => setChangePasswordOpen(true)}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs font-semibold text-paper/60 hover:bg-paper/5 hover:text-paper"
            >
              <LockKey size={14} /> Change password
            </button>
            <Link
              href="/"
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs font-semibold text-paper/60 hover:bg-paper/5 hover:text-paper"
            >
              <ArrowSquareOut size={14} /> Student site
            </Link>
            <button
              type="button"
              onClick={logout}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs font-semibold text-paper/60 hover:bg-paper/5 hover:text-paper"
            >
              <SignOut size={14} /> Sign out
            </button>
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur-md lg:hidden">
          <div className="flex h-14 items-center justify-between px-4">
            <Link href="/admin" className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-md bg-ink text-[10px] font-extrabold text-paper">
                SJC
              </span>
              <span className="text-xs font-bold text-ink">Kalolsavam Admin</span>
            </Link>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setChangePasswordOpen(true)}
                className="rounded-md p-2 text-ink-soft hover:bg-paper-2 hover:text-ink"
                aria-label="Change password"
              >
                <LockKey size={17} />
              </button>
              <button
                type="button"
                onClick={logout}
                className="rounded-md p-2 text-ink-soft hover:bg-paper-2 hover:text-ink"
                aria-label="Sign out"
              >
                <SignOut size={17} />
              </button>
            </div>
          </div>
          <nav className="flex gap-1 overflow-x-auto px-3 pb-2" aria-label="Admin sections">
            {NAV.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setView(item.key)}
                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  view === item.key
                    ? "bg-ink text-paper"
                    : "text-ink-soft hover:bg-paper-2"
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </nav>
        </header>

        <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {view === "overview" ? (
            <Overview
              stats={stats}
              meta={meta}
              loading={metaLoading || statsLoading}
              onRefresh={refreshAll}
              onOpenRegistrations={() => setView("registrations")}
            />
          ) : null}
          {view === "registrations" ? (
            <RegistrationsPanel meta={meta} refreshMeta={refreshMeta} />
          ) : null}
          {view === "events" ? (
            <EventsPanel meta={meta} refreshMeta={refreshMeta} />
          ) : null}

          <footer className="mt-10 flex flex-col items-start justify-between gap-2 border-t border-line pt-4 text-[11px] text-ink-faint sm:flex-row sm:items-center">
            <p>{COLLEGE_NAME} · Kalolsavam administration</p>
            <p>All administrative actions are recorded in the audit log.</p>
          </footer>
        </main>
      </div>

      <ChangePasswordModal
        open={changePasswordOpen}
        forced={Boolean(session.mustChangePassword)}
        onClose={() => setChangePasswordOpen(false)}
        onChanged={() => {
          setChangePasswordOpen(false);
          setSession((current) =>
            current ? { ...current, mustChangePassword: false } : current,
          );
        }}
      />
    </div>
  );
}
