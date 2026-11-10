"use client";

import { useMemo, useState } from "react";
import {
  CircleNotch,
  WarningCircle,
} from "@phosphor-icons/react";
import { Modal } from "@/components/ui/Modal";
import { HouseChip } from "@/components/ui/HouseChip";
import { useToast } from "@/components/ui/Toast";
import { api, ApiError } from "@/lib/client";
import { studentInputSchema } from "@/lib/validation";
import type { AdminMeta } from "@/lib/types";
import type { StudentProfile } from "@/lib/constants";

export function RegistrationEditModal({
  student,
  meta,
  onClose,
  onSaved,
}: {
  student: StudentProfile | null;
  meta: AdminMeta | null;
  onClose: () => void;
  onSaved: (profile: StudentProfile) => void;
}) {
  const { toast } = useToast();
  const [name, setName] = useState(student?.name ?? "");
  const [rollNumber, setRollNumber] = useState(student?.rollNumber ?? "");
  const [associationId, setAssociationId] = useState(student?.associationId ?? 0);
  const [whatsapp, setWhatsapp] = useState(student?.whatsapp ?? "");
  const [phone, setPhone] = useState(student?.phone ?? "");
  const [email, setEmail] = useState(student?.email ?? "");
  const [eventIds, setEventIds] = useState<number[]>(
    student?.events.map((event) => event.id) ?? [],
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const events = useMemo(() => {
    if (!meta) return [];
    const known = new Set(meta.events.map((event) => event.id));
    const extras = (student?.events ?? [])
      .filter((event) => !known.has(event.id))
      .map((event) => ({
        id: event.id,
        name_ml: event.nameMl,
        name_en: event.nameEn,
        is_active: event.isActive,
        sort_order: 9999,
        registrationCount: 0,
      }));
    return [...meta.events, ...extras];
  }, [meta, student]);

  const association = meta?.associations.find((item) => item.id === associationId);

  function toggleEvent(id: number) {
    setEventIds((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
    setErrors((current) => {
      if (!current.eventIds) return current;
      const next = { ...current };
      delete next.eventIds;
      return next;
    });
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!student) return;
    setFormError(null);
    const parsed = studentInputSchema.safeParse({
      name,
      rollNumber,
      associationId,
      whatsapp,
      phone,
      email,
      eventIds,
    });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0]?.toString() ?? "form";
        if (!next[field]) next[field] = issue.message;
      }
      setErrors(next);
      setFormError("Please fix the highlighted fields.");
      return;
    }

    setSubmitting(true);
    try {
      const data = await api<{ profile: StudentProfile }>(
        `/api/admin/registrations/${student.id}`,
        { method: "PATCH", body: JSON.stringify(parsed.data) },
      );
      toast(`Updated ${data.profile.applicationId}.`, "success");
      onSaved(data.profile);
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.field) setErrors({ [error.field]: error.message });
        else setFormError(error.message);
      } else {
        setFormError("Could not save the changes.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={Boolean(student && meta)}
      onClose={onClose}
      title={student ? `Edit ${student.applicationId}` : "Edit registration"}
      description="Application ID is permanent. Changing the association recalculates the house automatically."
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {formError ? (
          <div role="alert" className="flex items-start gap-2 rounded-lg border border-danger/25 bg-danger-soft px-3.5 py-3 text-sm text-danger">
            <WarningCircle size={18} weight="fill" className="mt-0.5 shrink-0" />
            {formError}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="edit-name" className="label">Full name</label>
            <input
              id="edit-name"
              className={`input ${errors.name ? "input-invalid" : ""}`}
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={80}
            />
            {errors.name ? <p className="error-text" role="alert">{errors.name}</p> : null}
          </div>

          <div>
            <label htmlFor="edit-roll" className="label">Roll number</label>
            <input
              id="edit-roll"
              className={`input font-mono uppercase ${errors.rollNumber ? "input-invalid" : ""}`}
              value={rollNumber}
              onChange={(event) => setRollNumber(event.target.value.toUpperCase())}
              maxLength={20}
            />
            {errors.rollNumber ? <p className="error-text" role="alert">{errors.rollNumber}</p> : null}
          </div>

          <div>
            <label htmlFor="edit-email" className="label">Email</label>
            <input
              id="edit-email"
              type="email"
              className={`input ${errors.email ? "input-invalid" : ""}`}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              maxLength={120}
            />
            {errors.email ? <p className="error-text" role="alert">{errors.email}</p> : null}
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="edit-association" className="label">Association</label>
            <select
              id="edit-association"
              className={`input ${errors.associationId ? "input-invalid" : ""}`}
              value={associationId || ""}
              onChange={(event) => setAssociationId(Number(event.target.value))}
            >
              <option value="" disabled>Select association</option>
              {(["A", "B", "C", "D"] as const).map((house) => (
                <optgroup key={house} label={`House ${house}`}>
                  {(meta?.associations ?? [])
                    .filter((item) => item.house === house)
                    .map((item) => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                </optgroup>
              ))}
            </select>
            <div className="mt-2 flex items-center gap-2 text-xs text-ink-soft">
              House:
              {association ? <HouseChip house={association.house} size="sm" /> : <span className="text-ink-faint">—</span>}
            </div>
            {errors.associationId ? <p className="error-text" role="alert">{errors.associationId}</p> : null}
          </div>

          <div>
            <label htmlFor="edit-whatsapp" className="label">WhatsApp number</label>
            <input
              id="edit-whatsapp"
              type="tel"
              className={`input ${errors.whatsapp ? "input-invalid" : ""}`}
              value={whatsapp}
              onChange={(event) => setWhatsapp(event.target.value)}
              maxLength={16}
            />
            {errors.whatsapp ? <p className="error-text" role="alert">{errors.whatsapp}</p> : null}
          </div>

          <div>
            <label htmlFor="edit-phone" className="label">Phone number</label>
            <input
              id="edit-phone"
              type="tel"
              className={`input ${errors.phone ? "input-invalid" : ""}`}
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              maxLength={16}
            />
            {errors.phone ? <p className="error-text" role="alert">{errors.phone}</p> : null}
          </div>
        </div>

        <div>
          <p className="label">Individual events</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {events.map((event) => {
              const checked = eventIds.includes(event.id);
              return (
                <label
                  key={event.id}
                  className={`flex cursor-pointer items-start gap-2.5 rounded-lg border p-2.5 text-sm ${
                    checked ? "border-maroon/40 bg-maroon-soft/40" : "border-line-strong bg-white"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleEvent(event.id)}
                    className="mt-0.5 h-4 w-4 accent-maroon"
                  />
                  <span className="min-w-0">
                    <span className="block truncate font-malayalam text-[13px] font-semibold text-ink">
                      {event.name_ml}
                    </span>
                    <span className="block truncate text-[11px] text-ink-soft">
                      {event.name_en}
                      {!event.is_active ? " · closed" : ""}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
          {errors.eventIds ? <p className="error-text" role="alert">{errors.eventIds}</p> : null}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11px] text-ink-faint">
            {student ? `Registered ${new Date(student.createdAt).toLocaleString("en-IN")}` : ""}
          </p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? (
                <>
                  <CircleNotch size={16} weight="bold" className="animate-spin" />
                  Saving…
                </>
              ) : (
                "Save changes"
              )}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
