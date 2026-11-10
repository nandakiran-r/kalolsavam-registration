"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle,
  Info,
  Printer,
  ShieldCheck,
  Student,
  WarningCircle,
} from "@phosphor-icons/react";
import { StudentHeader } from "./StudentHeader";
import { RegistrationForm } from "./RegistrationForm";
import { ProfileView } from "./ProfileView";
import { RegistrationSlip } from "@/components/pdf/RegistrationSlip";
import { HouseLegend } from "@/components/ui/HouseChip";
import { useToast } from "@/components/ui/Toast";
import { api, ApiError } from "@/lib/client";
import type { StudentProfile } from "@/lib/constants";
import type { Bootstrap } from "@/lib/types";
import {
  clearStoredRegistration,
  loadStoredRegistration,
  saveStoredRegistration,
  type StoredRegistration,
} from "@/lib/storage";
import { exportElementToPdf } from "@/lib/pdf";

type Phase = "loading" | "form" | "profile" | "removed" | "fatal";

const steps = [
  {
    title: "Register your events",
    body: "One profile per device, with your association and chosen individual events.",
  },
  {
    title: "Download your slip",
    body: "A print-ready A4 form with your Application ID and event list.",
  },
  {
    title: "Collect two signatures",
    body: "Get it signed by your HOD and House Coordinator before you participate.",
  },
];

function Aside() {
  return (
    <aside className="lg:sticky lg:top-24">
      <p className="eyebrow">Registration desk · 2026 edition</p>
      <h1 className="mt-3 max-w-[11ch] font-display text-[42px] font-bold leading-[0.98] tracking-[-0.035em] text-ink sm:text-5xl">
        Kalolsavam <span className="text-maroon">2026</span>
      </h1>
      <p className="mt-4 max-w-[38ch] text-[15px] leading-relaxed text-ink-soft">
        The official individual-events registration desk for St. Joseph&apos;s
        College, Devagiri. Register once, then carry your signed slip to the
        stage.
      </p>

      <div className="mt-7 border-y border-line py-5">
        <ol className="space-y-4">
          {steps.map((step, index) => (
            <li key={step.title} className="flex gap-3.5">
              <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border border-line-strong bg-white font-mono text-[11px] font-bold text-maroon">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div>
                <p className="text-sm font-bold text-ink">{step.title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">
                  {step.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-faint">
          House colours
        </p>
        <div className="mt-2">
          <HouseLegend />
        </div>
      </div>

      <p className="mt-6 flex items-start gap-2 text-[11px] leading-relaxed text-ink-faint">
        <ShieldCheck size={15} weight="bold" className="mt-0.5 shrink-0" />
        Your phone number and email are visible only to Kalolsavam
        administrators. This site uses a private edit key stored on this device.
      </p>
    </aside>
  );
}

function LoadingState() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[0.82fr_1.18fr]">
      <div className="space-y-4">
        <div className="skeleton h-3 w-32 rounded" />
        <div className="skeleton h-14 w-3/4 rounded-lg" />
        <div className="skeleton h-4 w-full rounded" />
        <div className="skeleton h-4 w-5/6 rounded" />
        <div className="skeleton h-40 w-full rounded-xl" />
      </div>
      <div className="card p-6">
        <div className="skeleton h-5 w-40 rounded" />
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="space-y-2">
              <div className="skeleton h-3 w-24 rounded" />
              <div className="skeleton h-11 w-full rounded-lg" />
            </div>
          ))}
        </div>
        <div className="skeleton mt-6 h-32 w-full rounded-xl" />
      </div>
    </div>
  );
}

export function StudentApp() {
  const { toast } = useToast();
  const [phase, setPhase] = useState<Phase>("loading");
  const [bootstrap, setBootstrap] = useState<Bootstrap | null>(null);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [record, setRecord] = useState<StoredRegistration | null>(null);
  const [editing, setEditing] = useState(false);
  const [offline, setOffline] = useState(false);
  const [storageWarning, setStorageWarning] = useState(false);
  const [removedMessage, setRemovedMessage] = useState<string | null>(null);
  const [fatalMessage, setFatalMessage] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const slipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;

    async function loadBootstrap() {
      return api<Bootstrap>("/api/public/bootstrap");
    }

    async function init() {
      const stored = loadStoredRegistration();
      if (stored.error === "unavailable") setStorageWarning(true);
      if (stored.error === "corrupt") {
        clearStoredRegistration();
        toast("Saved profile on this device was unreadable. Please register again.", "error");
      }

      if (stored.record) {
        setRecord(stored.record);
        setProfile(stored.record.profileSnapshot);
        setPhase("profile");

        const bootPromise = loadBootstrap();
        try {
          const [boot, data] = await Promise.all([
            bootPromise,
            api<{ profile: StudentProfile }>("/api/students/me", {
              method: "POST",
              body: JSON.stringify({
                applicationId: stored.record.applicationId,
                token: stored.record.editToken,
              }),
            }),
          ]);
          if (!alive) return;
          setBootstrap(boot);
          setProfile(data.profile);
          setOffline(false);
          const nextRecord: StoredRegistration = {
            ...stored.record,
            profileSnapshot: data.profile,
            savedAt: new Date().toISOString(),
          };
          setRecord(nextRecord);
          if (!saveStoredRegistration(nextRecord)) setStorageWarning(true);
        } catch (error) {
          if (!alive) return;
          if (
            error instanceof ApiError &&
            (error.code === "REMOVED" || error.code === "NOT_FOUND")
          ) {
            clearStoredRegistration();
            setRecord(null);
            setProfile(null);
            setRemovedMessage(error.message);
            setPhase("removed");
            try {
              const boot = await bootPromise;
              if (alive) setBootstrap(boot);
            } catch {
              // The retry button can fetch this later.
            }
          } else {
            setOffline(true);
            try {
              const boot = await bootPromise;
              if (alive) setBootstrap(boot);
            } catch {
              // Keep the cached profile visible.
            }
          }
        }
        return;
      }

      try {
        const boot = await loadBootstrap();
        if (!alive) return;
        setBootstrap(boot);
        setPhase("form");
      } catch (error) {
        if (!alive) return;
        setFatalMessage(
          error instanceof ApiError
            ? error.message
            : "We could not load the registration desk.",
        );
        setPhase("fatal");
      }
    }

    init();
    return () => {
      alive = false;
    };
  }, [toast]);

  const handleCreated = useCallback(
    (created: StudentProfile, editToken: string) => {
      const nextRecord: StoredRegistration = {
        applicationId: created.applicationId,
        editToken,
        profileSnapshot: created,
        savedAt: new Date().toISOString(),
      };
      setRecord(nextRecord);
      setProfile(created);
      setEditing(false);
      setOffline(false);
      setPhase("profile");
      if (!saveStoredRegistration(nextRecord)) setStorageWarning(true);
      toast(
        `Registration complete. Your Application ID is ${created.applicationId}.`,
        "success",
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [toast],
  );

  const handleUpdated = useCallback(
    (updated: StudentProfile) => {
      setProfile(updated);
      setEditing(false);
      setRecord((current) => {
        if (!current) return current;
        const nextRecord = {
          ...current,
          profileSnapshot: updated,
          savedAt: new Date().toISOString(),
        };
        if (!saveStoredRegistration(nextRecord)) setStorageWarning(true);
        return nextRecord;
      });
      toast("Your registration has been updated.", "success");
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [toast],
  );

  const refresh = useCallback(async () => {
    if (!record) return;
    try {
      const data = await api<{ profile: StudentProfile }>("/api/students/me", {
        method: "POST",
        body: JSON.stringify({
          applicationId: record.applicationId,
          token: record.editToken,
        }),
      });
      setProfile(data.profile);
      setOffline(false);
      const nextRecord = {
        ...record,
        profileSnapshot: data.profile,
        savedAt: new Date().toISOString(),
      };
      setRecord(nextRecord);
      saveStoredRegistration(nextRecord);
      toast("Latest details loaded.", "success");
    } catch (error) {
      if (
        error instanceof ApiError &&
        (error.code === "REMOVED" || error.code === "NOT_FOUND")
      ) {
        clearStoredRegistration();
        setRecord(null);
        setProfile(null);
        setRemovedMessage(error.message);
        setPhase("removed");
      } else {
        setOffline(true);
        toast("Still offline. Your saved copy is shown.", "error");
      }
    }
  }, [record, toast]);

  const handleEdit = useCallback(() => {
    if (!bootstrap) {
      toast("Reconnect to the internet to edit your registration.", "error");
      refresh();
      return;
    }
    setEditing(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [bootstrap, refresh, toast]);

  const exportPdf = useCallback(async () => {
    if (!profile || !slipRef.current) return;
    setExporting(true);
    try {
      await exportElementToPdf(
        slipRef.current,
        `Kalolsavam_${profile.applicationId}_${profile.rollNumber}.pdf`,
        "portrait",
      );
      toast("PDF downloaded. Print it for signatures.", "success");
    } catch (error) {
      console.error(error);
      toast("Could not prepare the PDF. Please try again.", "error");
    } finally {
      setExporting(false);
    }
  }, [profile, toast]);

  const startOver = useCallback(async () => {
    clearStoredRegistration();
    setRecord(null);
    setProfile(null);
    setRemovedMessage(null);
    setEditing(false);
    if (bootstrap) {
      setPhase("form");
      return;
    }
    try {
      const boot = await api<Bootstrap>("/api/public/bootstrap");
      setBootstrap(boot);
      setPhase("form");
    } catch (error) {
      setFatalMessage(
        error instanceof ApiError ? error.message : "Could not load the form.",
      );
      setPhase("fatal");
    }
  }, [bootstrap]);

  function retryLoad() {
    setPhase("loading");
    setFatalMessage(null);
    window.location.reload();
  }

  return (
    <>
      <StudentHeader />
      <main className="wrap py-8 sm:py-10 lg:py-14">
        {phase === "loading" ? (
          <LoadingState />
        ) : (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:gap-12">
            <Aside />
            <div className="min-w-0">
              {phase === "form" ? (
                bootstrap ? (
                  bootstrap.registrationOpen ? (
                    <RegistrationForm
                      mode="create"
                      bootstrap={bootstrap}
                      onCreated={handleCreated}
                      onUpdated={handleUpdated}
                    />
                  ) : (
                    <div className="card p-7 text-center sm:p-10">
                      <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-gold-soft text-[#6d4b0b]">
                        <Info size={24} weight="bold" />
                      </span>
                      <h2 className="mt-4 font-display text-2xl font-semibold text-ink">
                        Registration is closed
                      </h2>
                      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-soft">
                        The Kalolsavam registration desk is not accepting new
                        entries right now. Please contact the Kalolsavam office
                        or your association representative.
                      </p>
                    </div>
                  )
                ) : (
                  <FatalCard
                    message="The registration form could not load."
                    onRetry={retryLoad}
                  />
                )
              ) : null}

              {phase === "profile" && profile ? (
                editing && bootstrap ? (
                  <RegistrationForm
                    mode="edit"
                    bootstrap={bootstrap}
                    profile={profile}
                    editToken={record?.editToken}
                    onCreated={handleCreated}
                    onUpdated={handleUpdated}
                    onCancel={() => setEditing(false)}
                  />
                ) : (
                  <ProfileView
                    profile={profile}
                    offline={offline}
                    storageWarning={storageWarning}
                    exporting={exporting}
                    onEdit={handleEdit}
                    onExport={exportPdf}
                    onRefresh={refresh}
                  />
                )
              ) : null}

              {phase === "removed" ? (
                <div className="card p-7 text-center sm:p-10">
                  <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-danger-soft text-danger">
                    <WarningCircle size={24} weight="bold" />
                  </span>
                  <h2 className="mt-4 font-display text-2xl font-semibold text-ink">
                    Registration removed
                  </h2>
                  <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-soft">
                    {removedMessage ??
                      "Your registration was removed by the admin. Please register again."}
                  </p>
                  <button type="button" onClick={startOver} className="btn-primary mt-5">
                    Register again
                    <ArrowRight size={17} weight="bold" />
                  </button>
                </div>
              ) : null}

              {phase === "fatal" ? (
                <FatalCard
                  message={fatalMessage ?? "Could not load the registration desk."}
                  onRetry={retryLoad}
                />
              ) : null}
            </div>
          </div>
        )}

        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-line pt-5 text-xs text-ink-faint sm:flex-row sm:items-center">
          <p>
            © {new Date().getFullYear()} St. Joseph&apos;s College (Autonomous),
            Devagiri. Kalolsavam registration desk.
          </p>
          <p className="flex items-center gap-1.5">
            <Student size={14} weight="bold" /> One device, one registration.
          </p>
        </div>
      </main>

      {profile ? (
        <div className="pdf-stage" aria-hidden="true">
          <RegistrationSlip ref={slipRef} profile={profile} />
        </div>
      ) : null}
    </>
  );
}

function FatalCard({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="card p-7 text-center sm:p-10">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-danger-soft text-danger">
        <WarningCircle size={24} weight="bold" />
      </span>
      <h2 className="mt-4 font-display text-2xl font-semibold text-ink">
        We hit a snag
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-soft">
        {message} Check your connection and try again.
      </p>
      <button type="button" onClick={onRetry} className="btn-primary mt-5">
        Try again
        <ArrowRight size={17} weight="bold" />
      </button>
    </div>
  );
}
