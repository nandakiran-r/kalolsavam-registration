"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle,
  CircleNotch,
  ArrowRight,
  WarningCircle,
} from "@phosphor-icons/react";
import {
  type AssociationRow,
  type EventRow,
  type House,
  type StudentProfile,
  HOUSE_META,
} from "@/lib/constants";
import type { Bootstrap } from "@/lib/types";
import { studentInputSchema } from "@/lib/validation";
import { api, ApiError } from "@/lib/client";
import { HouseChip } from "@/components/ui/HouseChip";
import { useToast } from "@/components/ui/Toast";

type FormValues = {
  name: string;
  associationId: number;
  rollNumber: string;
  whatsapp: string;
  phone: string;
  email: string;
};

function Field({
  label,
  htmlFor,
  error,
  hint,
  required = true,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="label">
        {label}
        {required ? (
          <span aria-hidden="true" className="ml-0.5 text-maroon">
            *
          </span>
        ) : null}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="error-text" role="alert">
          <WarningCircle size={13} weight="fill" className="mt-px shrink-0" />
          {error}
        </p>
      ) : hint ? (
        <p id={`${htmlFor}-hint`} className="help">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function RegistrationForm({
  mode,
  bootstrap,
  profile,
  editToken,
  onCreated,
  onUpdated,
  onCancel,
}: {
  mode: "create" | "edit";
  bootstrap: Bootstrap;
  profile?: StudentProfile;
  editToken?: string;
  onCreated: (profile: StudentProfile, editToken: string) => void;
  onUpdated: (profile: StudentProfile) => void;
  onCancel?: () => void;
}) {
  const { toast } = useToast();
  const [values, setValues] = useState<FormValues>({
    name: profile?.name ?? "",
    associationId: profile?.associationId ?? 0,
    rollNumber: profile?.rollNumber ?? "",
    whatsapp: profile?.whatsapp ?? "",
    phone: profile?.phone ?? "",
    email: profile?.email ?? "",
  });
  const [selectedEvents, setSelectedEvents] = useState<number[]>(
    profile?.events.map((event) => event.id) ?? [],
  );
  const [website, setWebsite] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const byHouse = useMemo(() => {
    const groups: Record<House, AssociationRow[]> = { A: [], B: [], C: [], D: [] };
    for (const association of bootstrap.associations) {
      groups[association.house].push(association);
    }
    return groups;
  }, [bootstrap.associations]);

  const eventOptions = useMemo(() => {
    const active = bootstrap.events;
    if (!profile) return active;
    const activeIds = new Set(active.map((event) => event.id));
    const closed = profile.events
      .filter((event) => !activeIds.has(event.id))
      .map<EventRow>((event) => ({
        id: event.id,
        name_ml: event.nameMl,
        name_en: event.nameEn,
        is_active: false,
        sort_order: 9999,
      }));
    return [...active, ...closed];
  }, [bootstrap.events, profile]);

  const selectedAssociation = bootstrap.associations.find(
    (association) => association.id === values.associationId,
  );
  const selectedHouse = selectedAssociation?.house;

  function update<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  function toggleEvent(id: number) {
    setSelectedEvents((current) =>
      current.includes(id)
        ? current.filter((eventId) => eventId !== id)
        : [...current, id],
    );
    setErrors((current) => {
      if (!current.eventIds) return current;
      const next = { ...current };
      delete next.eventIds;
      return next;
    });
  }

  function validate() {
    const payload = {
      ...values,
      rollNumber: values.rollNumber.trim().toUpperCase(),
      eventIds: selectedEvents,
    };
    const result = studentInputSchema.safeParse(payload);
    if (!result.success) {
      const next: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0]?.toString() ?? "form";
        if (!next[field]) next[field] = issue.message;
      }
      setErrors(next);
      setFormError("Please fix the highlighted fields and try again.");
      return null;
    }
    return result.data;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;
    setFormError(null);
    const payload = validate();
    if (!payload) return;

    setSubmitting(true);
    try {
      if (mode === "create") {
        const data = await api<{ profile: StudentProfile; editToken: string }>(
          "/api/students",
          {
            method: "POST",
            body: JSON.stringify({ ...payload, website }),
          },
        );
        onCreated(data.profile, data.editToken);
      } else {
        if (!profile || !editToken) {
          throw new ApiError("This device does not hold the edit key for this registration.");
        }
        const data = await api<{ profile: StudentProfile }>("/api/students/me", {
          method: "PATCH",
          body: JSON.stringify({
            applicationId: profile.applicationId,
            token: editToken,
            student: payload,
          }),
        });
        onUpdated(data.profile);
      }
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.field) {
          setErrors((current) => ({ ...current, [error.field!]: error.message }));
          setFormError("Please fix the highlighted field and try again.");
        } else {
          setFormError(error.message);
        }
        if (error.status === 429) {
          toast(error.message, "error");
        }
      } else {
        setFormError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="card overflow-hidden"
      aria-label={mode === "create" ? "Student registration form" : "Edit registration form"}
    >
      <div className="border-b border-line bg-paper-2/45 px-5 py-5 sm:px-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="eyebrow">
              {mode === "create" ? "Registration form" : "Editing registration"}
            </p>
            <h2 className="mt-1.5 font-display text-2xl font-semibold tracking-[-0.01em] text-ink">
              {mode === "create" ? "Tell us about you" : "Update your details"}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-ink-soft">
              {mode === "create"
                ? "Fields marked with an asterisk are required. Your house is assigned automatically from your association."
                : "Saving keeps your Application ID unchanged. Your house is recalculated from your association."}
            </p>
          </div>
          {mode === "edit" && profile ? (
            <span className="rounded-lg border border-line-strong bg-white px-3 py-1.5 font-mono text-xs font-bold text-ink">
              {profile.applicationId}
            </span>
          ) : null}
        </div>
      </div>

      <div className="px-5 py-6 sm:px-7">
        {formError ? (
          <div
            role="alert"
            className="mb-5 flex items-start gap-2.5 rounded-lg border border-danger/25 bg-danger-soft px-3.5 py-3 text-sm text-danger"
          >
            <WarningCircle size={18} weight="fill" className="mt-0.5 shrink-0" />
            <span>{formError}</span>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Full name" htmlFor="name" error={errors.name} hint="As it should appear on your certificate.">
              <input
                id="name"
                name="name"
                className={`input ${errors.name ? "input-invalid" : ""}`}
                value={values.name}
                onChange={(event) => update("name", event.target.value)}
                autoComplete="name"
                maxLength={80}
                aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? "name-error" : "name-hint"}
                required
              />
            </Field>
          </div>

          <Field
            label="Roll number"
            htmlFor="rollNumber"
            error={errors.rollNumber}
            hint="Example: 24USCS10. Capital letters are applied automatically."
          >
            <input
              id="rollNumber"
              name="rollNumber"
              className={`input font-mono uppercase tracking-[0.03em] ${errors.rollNumber ? "input-invalid" : ""}`}
              value={values.rollNumber}
              onChange={(event) => update("rollNumber", event.target.value.toUpperCase())}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              maxLength={20}
              placeholder="24USCS10"
              aria-invalid={Boolean(errors.rollNumber)}
              aria-describedby={errors.rollNumber ? "rollNumber-error" : "rollNumber-hint"}
              required
            />
          </Field>

          <Field
            label="Email address"
            htmlFor="email"
            error={errors.email}
            hint="Used only for Kalolsavam communication."
          >
            <input
              id="email"
              name="email"
              type="email"
              className={`input ${errors.email ? "input-invalid" : ""}`}
              value={values.email}
              onChange={(event) => update("email", event.target.value)}
              autoComplete="email"
              inputMode="email"
              maxLength={120}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "email-error" : "email-hint"}
              required
            />
          </Field>

          <div className="sm:col-span-2">
            <Field
              label="Association"
              htmlFor="associationId"
              error={errors.associationId}
              hint="Your house is assigned automatically from this association and cannot be edited."
            >
              <select
                id="associationId"
                name="associationId"
                className={`input ${errors.associationId ? "input-invalid" : ""}`}
                value={values.associationId || ""}
                onChange={(event) => update("associationId", Number(event.target.value))}
                aria-invalid={Boolean(errors.associationId)}
                aria-describedby={errors.associationId ? "associationId-error" : "associationId-hint"}
                required
              >
                <option value="" disabled>
                  Select your association
                </option>
                {(["A", "B", "C", "D"] as House[]).map((house) => (
                  <optgroup key={house} label={`House ${house}`}>
                    {byHouse[house].map((association) => (
                      <option key={association.id} value={association.id}>
                        {association.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </Field>

            <div className="mt-3 flex min-h-[34px] items-center gap-2 rounded-lg border border-dashed border-line-strong bg-paper-2/30 px-3 py-1.5">
              <span className="text-xs font-semibold text-ink-soft">Group name</span>
              {selectedHouse ? (
                <>
                  <HouseChip house={selectedHouse} size="sm" />
                  <span className="text-[11px] text-ink-soft">
                    Auto-assigned · read only
                  </span>
                </>
              ) : (
                <span className="text-[11px] text-ink-faint">
                  Choose an association to see your house
                </span>
              )}
            </div>
          </div>

          <Field
            label="WhatsApp number"
            htmlFor="whatsapp"
            error={errors.whatsapp}
            hint="10-digit Indian mobile number. +91 is optional."
          >
            <input
              id="whatsapp"
              name="whatsapp"
              type="tel"
              className={`input ${errors.whatsapp ? "input-invalid" : ""}`}
              value={values.whatsapp}
              onChange={(event) => update("whatsapp", event.target.value)}
              autoComplete="tel"
              inputMode="tel"
              maxLength={16}
              placeholder="9876543210"
              aria-invalid={Boolean(errors.whatsapp)}
              aria-describedby={errors.whatsapp ? "whatsapp-error" : "whatsapp-hint"}
              required
            />
          </Field>

          <Field
            label="Phone number"
            htmlFor="phone"
            error={errors.phone}
            hint="Can be the same as your WhatsApp number."
          >
            <input
              id="phone"
              name="phone"
              type="tel"
              className={`input ${errors.phone ? "input-invalid" : ""}`}
              value={values.phone}
              onChange={(event) => update("phone", event.target.value)}
              autoComplete="tel-national"
              inputMode="tel"
              maxLength={16}
              placeholder="9876543210"
              aria-invalid={Boolean(errors.phone)}
              aria-describedby={errors.phone ? "phone-error" : "phone-hint"}
              required
            />
          </Field>
        </div>

        <div className="my-7 border-t border-line" />

        <fieldset>
          <legend className="label">
            Individual events
            <span aria-hidden="true" className="ml-0.5 text-maroon">
              *
            </span>
          </legend>
          <p className="mb-3 text-xs leading-relaxed text-ink-soft">
            Choose every event you are entering. You can change this later from
            this device.
          </p>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2" role="group" aria-label="Individual events">
            {eventOptions.map((event) => {
              const checked = selectedEvents.includes(event.id);
              return (
                <label
                  key={event.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition ${
                    checked
                      ? "border-maroon/45 bg-maroon-soft/45 shadow-[inset_0_0_0_1px_rgba(123,37,50,0.06)]"
                      : "border-line-strong bg-white hover:border-ink/25 hover:bg-paper-2/25"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleEvent(event.id)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-maroon"
                  />
                  <span className="min-w-0">
                    <span className="block font-malayalam text-[15px] font-semibold leading-snug text-ink">
                      {event.name_ml}
                    </span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-ink-soft">
                      {event.name_en}
                      {!event.is_active ? (
                        <span className="rounded-full bg-paper-3 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink-soft">
                          Closed
                        </span>
                      ) : null}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
          {errors.eventIds ? (
            <p className="error-text" role="alert">
              <WarningCircle size={13} weight="fill" className="mt-px shrink-0" />
              {errors.eventIds}
            </p>
          ) : null}
          <p className="help">
            {selectedEvents.length === 0
              ? "No events selected yet."
              : `${selectedEvents.length} event${selectedEvents.length === 1 ? "" : "s"} selected.`}
          </p>
        </fieldset>

        <div className="absolute left-[-10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
          <label htmlFor="website">Website</label>
          <input
            id="website"
            name="website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(event) => setWebsite(event.target.value)}
          />
        </div>

        <div className="mt-7 flex flex-col-reverse gap-2.5 border-t border-line pt-5 sm:flex-row sm:justify-end">
          {mode === "edit" && onCancel ? (
            <button type="button" onClick={onCancel} className="btn-secondary">
              Cancel
            </button>
          ) : null}
          <button type="submit" disabled={submitting} className="btn-primary min-w-[190px]">
            {submitting ? (
              <>
                <CircleNotch size={17} weight="bold" className="animate-spin" />
                {mode === "create" ? "Registering…" : "Saving…"}
              </>
            ) : (
              <>
                {mode === "create" ? "Complete registration" : "Save changes"}
                {mode === "create" ? (
                  <ArrowRight size={17} weight="bold" />
                ) : (
                  <CheckCircle size={17} weight="bold" />
                )}
              </>
            )}
          </button>
        </div>

        {mode === "create" ? (
          <p className="mt-3 text-center text-[11px] leading-relaxed text-ink-faint">
            By registering you confirm that the details above are yours. Your
            contact details are visible only to Kalolsavam administrators.
          </p>
        ) : null}
      </div>
    </form>
  );
}
