"use client";

import { useState } from "react";
import {
  ArrowClockwise,
  BellRinging,
  Check,
  Copy,
  FilePdf,
  IdentificationCard,
  PencilSimple,
  Signature,
  WifiSlash,
} from "@phosphor-icons/react";
import type { StudentProfile } from "@/lib/constants";
import { HouseChip } from "@/components/ui/HouseChip";
import { useToast } from "@/components/ui/Toast";

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));
}

function Detail({
  label,
  children,
  wide = false,
}: {
  label: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-faint">
        {label}
      </dt>
      <dd className="mt-1 text-[15px] font-medium leading-snug text-ink">{children}</dd>
    </div>
  );
}

export function ProfileView({
  profile,
  offline,
  storageWarning,
  exporting,
  onEdit,
  onExport,
  onRefresh,
}: {
  profile: StudentProfile;
  offline: boolean;
  storageWarning: boolean;
  exporting: boolean;
  onEdit: () => void;
  onExport: () => void;
  onRefresh: () => void;
}) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  async function copyApplicationId() {
    try {
      await navigator.clipboard.writeText(profile.applicationId);
      setCopied(true);
      toast("Application ID copied.", "success");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast(`Your Application ID is ${profile.applicationId}`, "info");
    }
  }

  return (
    <div className="space-y-4">
      {offline ? (
        <div role="status" className="flex items-start gap-3 rounded-xl border border-gold/35 bg-gold-soft/60 px-4 py-3 text-sm text-[#6d4b0b]">
          <WifiSlash size={19} weight="bold" className="mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold">You are offline — showing your last saved copy.</p>
            <p className="mt-0.5 text-xs leading-relaxed">
              Information may be out of date. Your registration is safe; reconnect to
              sync the latest details.
            </p>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            className="shrink-0 rounded-md border border-gold/40 bg-white px-2.5 py-1 text-xs font-semibold text-[#6d4b0b] hover:bg-gold-soft"
          >
            Retry
          </button>
        </div>
      ) : null}

      {storageWarning ? (
        <div role="status" className="flex items-start gap-2.5 rounded-xl border border-line-strong bg-paper-2/60 px-4 py-3 text-xs leading-relaxed text-ink-soft">
          <BellRinging size={17} weight="bold" className="mt-0.5 shrink-0" />
          <p>
            This browser is blocking local storage, so your registration may not
            reopen on this device after you close the tab. Download your PDF slip
            and keep the Application ID safe.
          </p>
        </div>
      ) : null}

      <article className="card overflow-hidden" aria-label="Your registration">
        <div className="bg-ink px-5 py-5 text-paper sm:px-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-paper/60">
                Application ID
              </p>
              <div className="mt-1.5 flex items-center gap-2">
                <p className="font-mono text-2xl font-bold tracking-[0.04em] text-white sm:text-3xl">
                  {profile.applicationId}
                </p>
                <button
                  type="button"
                  onClick={copyApplicationId}
                  className="rounded-md p-1.5 text-paper/65 transition hover:bg-white/10 hover:text-white"
                  aria-label="Copy Application ID"
                >
                  {copied ? <Check size={17} weight="bold" /> : <Copy size={17} />}
                </button>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-green/30 bg-[#e2f0ea]/15 px-2.5 py-1 text-xs font-semibold text-[#bfe5d6]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#6fd2a9]" />
              Registered
            </span>
          </div>
        </div>

        <div className="px-5 py-6 sm:px-7">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl font-semibold leading-tight tracking-[-0.01em] text-ink">
                {profile.name}
              </h2>
              <p className="mt-1 text-sm text-ink-soft">
                <span className="font-mono font-semibold text-ink-2">{profile.rollNumber}</span>
                <span className="mx-2 text-line-strong">·</span>
                {profile.associationName}
              </p>
            </div>
            <HouseChip house={profile.house} />
          </div>

          <div className="my-6 border-t border-line" />

          <dl className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
            <Detail label="Roll number">
              <span className="font-mono">{profile.rollNumber}</span>
            </Detail>
            <Detail label="Association">{profile.associationName}</Detail>
            <Detail label="Group / house">
              <HouseChip house={profile.house} size="sm" />
            </Detail>
            <Detail label="Email">
              <a className="break-all hover:text-maroon hover:underline" href={`mailto:${profile.email}`}>
                {profile.email}
              </a>
            </Detail>
            <Detail label="WhatsApp">
              <a className="hover:text-maroon hover:underline" href={`tel:+91${profile.whatsapp}`}>
                +91 {profile.whatsapp}
              </a>
            </Detail>
            <Detail label="Phone">
              <a className="hover:text-maroon hover:underline" href={`tel:+91${profile.phone}`}>
                +91 {profile.phone}
              </a>
            </Detail>
            <Detail label="Individual events" wide>
              <ul className="mt-1 flex flex-wrap gap-2">
                {profile.events.map((event) => (
                  <li
                    key={event.id}
                    className="inline-flex max-w-full flex-col gap-0.5 rounded-full border border-line bg-paper/60 px-3 py-1.5"
                  >
                    <span className="font-malayalam text-[13px] font-semibold leading-snug text-ink">
                      {event.nameMl}
                    </span>
                    <span className="text-[11px] leading-snug text-ink-soft">
                      {event.nameEn}
                    </span>
                  </li>
                ))}
              </ul>
            </Detail>
          </dl>

          <div className="mt-6 flex flex-col gap-2 border-t border-line pt-4 text-[11px] text-ink-faint sm:flex-row sm:items-center sm:justify-between">
            <span>Registered {formatDateTime(profile.createdAt)}</span>
            <span>Last updated {formatDateTime(profile.updatedAt)}</span>
          </div>
        </div>
      </article>

      <div className="card p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-maroon-soft text-maroon">
            <Signature size={21} weight="bold" />
          </span>
          <div>
            <h3 className="font-display text-lg font-semibold text-ink">
              Print it. Sign it. Then participate.
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-ink-soft">
              Print this form, get it signed by your HOD and House Coordinator, then
              submit it to participate.
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <button type="button" onClick={onEdit} className="btn-secondary">
            <PencilSimple size={17} weight="bold" />
            Edit form
          </button>
          <button
            type="button"
            onClick={onExport}
            disabled={exporting}
            className="btn-primary"
          >
            {exporting ? (
              <>
                <ArrowClockwise size={17} weight="bold" className="animate-spin" />
                Preparing PDF…
              </>
            ) : (
              <>
                <FilePdf size={17} weight="bold" />
                Export form (PDF)
              </>
            )}
          </button>
        </div>

        <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[11px] text-ink-faint">
          <IdentificationCard size={14} />
          Your Application ID never changes, even after edits.
        </p>
      </div>
    </div>
  );
}
