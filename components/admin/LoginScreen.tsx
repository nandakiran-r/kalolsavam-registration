"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CircleNotch,
  Eye,
  EyeSlash,
  LockKey,
  ShieldCheck,
  WarningCircle,
} from "@phosphor-icons/react";
import { api, ApiError } from "@/lib/client";
import type { AdminSession } from "@/lib/types";
import { COLLEGE_NAME, KALOLSAVAM_YEAR } from "@/lib/constants";

export function LoginScreen({
  onSuccess,
}: {
  onSuccess: (session: AdminSession) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const data = await api<{ admin: AdminSession }>("/api/admin/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      onSuccess(data.admin);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not sign in. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-[100dvh] bg-paper lg:grid lg:grid-cols-[1.02fr_0.98fr]">
      <section className="relative hidden overflow-hidden bg-ink px-12 py-12 text-paper lg:flex lg:flex-col lg:justify-between">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.16]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(246,243,236,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(246,243,236,0.35) 1px, transparent 1px)",
            backgroundSize: "72px 72px",
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-32 bottom-[-180px] h-[520px] w-[520px] rounded-full border border-paper/20"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-10 bottom-[-80px] h-[320px] w-[320px] rounded-full border border-gold/40"
        />

        <div className="relative">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-lg border border-paper/25 bg-paper/10 text-sm font-extrabold tracking-[-0.04em]">
              SJC
            </span>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-paper/60">
                Devagiri
              </p>
              <p className="text-sm font-semibold">Kalolsavam Control Room</p>
            </div>
          </div>

          <div className="mt-20">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-gold">
              Administration · {KALOLSAVAM_YEAR}
            </p>
            <h1 className="mt-4 max-w-[13ch] font-display text-[54px] font-bold leading-[0.96] tracking-[-0.04em]">
              Every entry, one clear desk.
            </h1>
            <p className="mt-5 max-w-[40ch] text-[15px] leading-relaxed text-paper/65">
              Review registrations, manage events, balance houses, and export the
              paperwork the festival office actually needs.
            </p>
          </div>
        </div>

        <div className="relative grid grid-cols-3 gap-4 border-t border-paper/15 pt-5">
          {[
            ["01", "Registrations"],
            ["02", "Events & houses"],
            ["03", "CSV & PDF"],
          ].map(([number, label]) => (
            <div key={number}>
              <p className="font-mono text-xs text-gold">{number}</p>
              <p className="mt-1 text-xs text-paper/60">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="flex min-h-[100dvh] flex-col justify-center px-5 py-10 sm:px-10 lg:px-16">
        <div className="mx-auto w-full max-w-md">
          <div className="flex items-center justify-between lg:hidden">
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-ink text-[11px] font-extrabold text-paper">
                SJC
              </span>
              <span className="text-xs font-bold text-ink">Kalolsavam Admin</span>
            </div>
            <Link
              href="/"
              className="inline-flex items-center gap-1 text-xs font-semibold text-ink-soft hover:text-ink"
            >
              <ArrowLeft size={14} /> Student site
            </Link>
          </div>

          <div className="mt-10 lg:mt-0">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-white px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.1em] text-ink-soft">
              <ShieldCheck size={14} weight="bold" className="text-maroon" />
              Restricted access
            </span>
            <h2 className="mt-4 font-display text-3xl font-semibold tracking-[-0.025em] text-ink">
              Sign in to the control room
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              Use the administrator account issued for Kalolsavam. Every action is
              logged.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4" noValidate>
            {error ? (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-lg border border-danger/25 bg-danger-soft px-3.5 py-3 text-sm text-danger"
              >
                <WarningCircle size={18} weight="fill" className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            ) : null}

            <div>
              <label htmlFor="admin-email" className="label">
                Email address
              </label>
              <input
                id="admin-email"
                type="email"
                className="input"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="username"
                inputMode="email"
                placeholder="admin@devagiri.ac.in"
                required
              />
            </div>

            <div>
              <label htmlFor="admin-password" className="label">
                Password
              </label>
              <div className="relative">
                <input
                  id="admin-password"
                  type={showPassword ? "text" : "password"}
                  className="input pr-11"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md p-2 text-ink-faint hover:bg-paper-2 hover:text-ink"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={submitting} className="btn-primary w-full">
              {submitting ? (
                <>
                  <CircleNotch size={17} weight="bold" className="animate-spin" />
                  Signing in…
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight size={17} weight="bold" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 flex items-start gap-2 border-t border-line pt-5 text-[11px] leading-relaxed text-ink-faint">
            <LockKey size={14} className="mt-0.5 shrink-0" />
            <p>
              Sessions expire after 8 hours. Repeated failed attempts are rate
              limited. Contact the Kalolsavam office if you need your credentials
              reset.
            </p>
          </div>

          <p className="mt-6 text-center text-[11px] text-ink-faint">
            {COLLEGE_NAME}
          </p>
        </div>
      </section>
    </main>
  );
}
