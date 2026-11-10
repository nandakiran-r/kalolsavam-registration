"use client";

import { useState } from "react";
import {
  CircleNotch,
  PencilSimple,
  Plus,
  SpinnerGap,
  Trash,
  WarningCircle,
} from "@phosphor-icons/react";
import type { AdminEvent, AdminMeta } from "@/lib/types";
import { api, ApiError } from "@/lib/client";
import { useToast } from "@/components/ui/Toast";
import { Modal } from "@/components/ui/Modal";
import { eventInputSchema } from "@/lib/validation";

type Draft = {
  nameMl: string;
  nameEn: string;
  isActive: boolean;
  sortOrder: number;
};

const EMPTY_DRAFT: Draft = {
  nameMl: "",
  nameEn: "",
  isActive: true,
  sortOrder: 10,
};

export function EventsPanel({
  meta,
  refreshMeta,
}: {
  meta: AdminMeta | null;
  refreshMeta: () => void;
}) {
  const { toast } = useToast();
  const [editing, setEditing] = useState<AdminEvent | "new" | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingEvent, setDeletingEvent] = useState<AdminEvent | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  function openNew() {
    setDraft({
      ...EMPTY_DRAFT,
      sortOrder:
        (meta?.events.reduce((max, event) => Math.max(max, event.sort_order), 0) ?? 0) +
        1,
    });
    setErrors({});
    setFormError(null);
    setEditing("new");
  }

  function openEdit(event: AdminEvent) {
    setDraft({
      nameMl: event.name_ml,
      nameEn: event.name_en,
      isActive: event.is_active,
      sortOrder: event.sort_order,
    });
    setErrors({});
    setFormError(null);
    setEditing(event);
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    const parsed = eventInputSchema.safeParse(draft);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        next[issue.path[0]?.toString() ?? "form"] = issue.message;
      }
      setErrors(next);
      setFormError("Please check the event fields.");
      return;
    }

    setSaving(true);
    try {
      if (editing === "new") {
        await api("/api/admin/events", {
          method: "POST",
          body: JSON.stringify(parsed.data),
        });
        toast("Event added. It is live on the student form.", "success");
      } else if (editing) {
        await api(`/api/admin/events/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(parsed.data),
        });
        toast("Event updated.", "success");
      }
      setEditing(null);
      refreshMeta();
    } catch (error) {
      setFormError(
        error instanceof ApiError ? error.message : "Could not save the event.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(item: AdminEvent) {
    setTogglingId(item.id);
    try {
      await api(`/api/admin/events/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          nameMl: item.name_ml,
          nameEn: item.name_en,
          isActive: !item.is_active,
          sortOrder: item.sort_order,
        }),
      });
      toast(
        `${item.name_en} ${item.is_active ? "deactivated" : "reactivated"}.`,
        "success",
      );
      refreshMeta();
    } catch (error) {
      toast(
        error instanceof ApiError ? error.message : "Could not update the event.",
        "error",
      );
    } finally {
      setTogglingId(null);
    }
  }

  async function confirmDelete() {
    if (!deletingEvent) return;
    setDeleting(true);
    try {
      await api(`/api/admin/events/${deletingEvent.id}`, { method: "DELETE" });
      toast("Event deleted.", "success");
      setDeletingEvent(null);
      refreshMeta();
    } catch (error) {
      toast(
        error instanceof ApiError
          ? error.message
          : "Could not delete the event.",
        "error",
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-maroon">
            Event management
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-[-0.025em] text-ink">
            Events
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            Changes appear on the student form immediately, with no redeploy.
          </p>
        </div>
        <button type="button" onClick={openNew} className="btn-primary">
          <Plus size={17} weight="bold" />
          Add event
        </button>
      </div>

      <div className="mt-5 overflow-hidden rounded-xl border border-line bg-white">
        {!meta ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="skeleton h-12 rounded" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-left text-sm">
              <thead className="table-head">
                <tr>
                  <th className="px-4 py-2.5">Malayalam name</th>
                  <th className="px-4 py-2.5">English name</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Order</th>
                  <th className="px-4 py-2.5">Registrations</th>
                  <th className="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {meta.events.map((event) => (
                  <tr key={event.id} className="hover:bg-paper/60">
                    <td className="max-w-[280px] px-4 py-3">
                      <span className="block truncate font-malayalam text-[15px] font-semibold text-ink">
                        {event.name_ml}
                      </span>
                    </td>
                    <td className="max-w-[240px] px-4 py-3">
                      <span className="block truncate text-[13px] text-ink-2">
                        {event.name_en}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={event.is_active}
                        aria-label={`Toggle ${event.name_en}`}
                        onClick={() => toggleActive(event)}
                        disabled={togglingId === event.id}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-bold ${
                          event.is_active
                            ? "border-green/25 bg-green-soft text-green"
                            : "border-line-strong bg-paper-2 text-ink-soft"
                        }`}
                      >
                        {togglingId === event.id ? (
                          <SpinnerGap size={12} className="animate-spin" />
                        ) : (
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              event.is_active ? "bg-green" : "bg-ink-faint"
                            }`}
                          />
                        )}
                        {event.is_active ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-ink-soft">
                      {event.sort_order}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs font-bold text-ink">
                      {event.registrationCount}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(event)}
                          className="rounded-md p-1.5 text-ink-soft hover:bg-paper-2 hover:text-ink"
                          aria-label={`Edit ${event.name_en}`}
                        >
                          <PencilSimple size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingEvent(event)}
                          className="rounded-md p-1.5 text-ink-soft hover:bg-danger-soft hover:text-danger"
                          aria-label={`Delete ${event.name_en}`}
                        >
                          <Trash size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-ink-faint">
        Deactivating an event hides it from new registrations. Students who already
        selected it keep the event name on their profile and PDF. Deleting is blocked
        once an event has registrations.
      </p>

      <Modal
        open={editing !== null}
        onClose={() => {
          if (!saving) setEditing(null);
        }}
        title={editing === "new" ? "Add an event" : "Edit event"}
        description="Both names are shown on the student form as Malayalam / English."
        size="md"
      >
        <form onSubmit={save} className="space-y-4" noValidate>
          {formError ? (
            <div role="alert" className="flex items-start gap-2 rounded-lg border border-danger/25 bg-danger-soft px-3.5 py-3 text-sm text-danger">
              <WarningCircle size={18} weight="fill" className="mt-0.5 shrink-0" />
              {formError}
            </div>
          ) : null}

          <div>
            <label htmlFor="event-ml" className="label">Malayalam name</label>
            <input
              id="event-ml"
              className={`input font-malayalam ${errors.nameMl ? "input-invalid" : ""}`}
              value={draft.nameMl}
              onChange={(event) =>
                setDraft((current) => ({ ...current, nameMl: event.target.value }))
              }
              placeholder="പ്രബന്ധരചന ഇംഗ്ലീഷ്"
            />
            {errors.nameMl ? <p className="error-text" role="alert">{errors.nameMl}</p> : null}
          </div>

          <div>
            <label htmlFor="event-en" className="label">English name</label>
            <input
              id="event-en"
              className={`input ${errors.nameEn ? "input-invalid" : ""}`}
              value={draft.nameEn}
              onChange={(event) =>
                setDraft((current) => ({ ...current, nameEn: event.target.value }))
              }
              placeholder="Essay Writing English"
            />
            {errors.nameEn ? <p className="error-text" role="alert">{errors.nameEn}</p> : null}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="event-order" className="label">Display order</label>
              <input
                id="event-order"
                type="number"
                min={0}
                max={9999}
                className={`input ${errors.sortOrder ? "input-invalid" : ""}`}
                value={draft.sortOrder}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    sortOrder: Number(event.target.value),
                  }))
                }
              />
              {errors.sortOrder ? <p className="error-text" role="alert">{errors.sortOrder}</p> : null}
            </div>
            <div className="flex items-end">
              <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-line-strong bg-paper/50 px-3 py-2.5 text-sm font-semibold text-ink">
                <input
                  type="checkbox"
                  checked={draft.isActive}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      isActive: event.target.checked,
                    }))
                  }
                  className="h-4 w-4 accent-maroon"
                />
                Active on student form
              </label>
            </div>
          </div>

          <div className="rounded-lg border border-dashed border-line-strong bg-paper/40 p-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-faint">
              Student preview
            </p>
            <p className="mt-1.5 font-malayalam text-[15px] font-semibold text-ink">
              {draft.nameMl || "മലയാളം പേര്"}
            </p>
            <p className="mt-0.5 text-xs text-ink-soft">
              {draft.nameEn || "English name"} {draft.isActive ? "" : "· closed"}
            </p>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setEditing(null)}
              disabled={saving}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? (
                <>
                  <CircleNotch size={16} weight="bold" className="animate-spin" />
                  Saving…
                </>
              ) : editing === "new" ? (
                "Add event"
              ) : (
                "Save changes"
              )}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(deletingEvent)}
        onClose={() => {
          if (!deleting) setDeletingEvent(null);
        }}
        title="Delete this event?"
        description="Deletion is only possible when no active student has registered for it. Otherwise deactivate it instead."
        size="sm"
      >
        <div className="space-y-4">
          {deletingEvent ? (
            <div className="rounded-lg border border-line bg-paper/60 p-3">
              <p className="font-malayalam text-sm font-semibold text-ink">
                {deletingEvent.name_ml}
              </p>
              <p className="mt-0.5 text-xs text-ink-soft">{deletingEvent.name_en}</p>
              <p className="mt-2 text-[11px] font-semibold text-ink-soft">
                {deletingEvent.registrationCount} registration
                {deletingEvent.registrationCount === 1 ? "" : "s"}
              </p>
            </div>
          ) : null}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setDeletingEvent(null)}
              disabled={deleting}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmDelete}
              disabled={deleting}
              className="btn-danger"
            >
              {deleting ? (
                <>
                  <SpinnerGap size={16} weight="bold" className="animate-spin" />
                  Deleting…
                </>
              ) : (
                "Delete event"
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
