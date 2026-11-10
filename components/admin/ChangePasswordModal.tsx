"use client";

import { useState } from "react";
import { CircleNotch, LockKey, WarningCircle } from "@phosphor-icons/react";
import { Modal } from "@/components/ui/Modal";
import { api, ApiError } from "@/lib/client";
import { useToast } from "@/components/ui/Toast";

export function ChangePasswordModal({
  open,
  forced = false,
  onClose,
  onChanged,
}: {
  open: boolean;
  forced?: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { toast } = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setFieldError({});
    if (newPassword !== confirmPassword) {
      setFieldError({ confirmPassword: "Passwords do not match." });
      return;
    }
    setSubmitting(true);
    try {
      await api<{ ok: true }>("/api/admin/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      toast("Password updated.", "success");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      onChanged();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.field) setFieldError({ [err.field]: err.message });
        else setError(err.message);
      } else {
        setError("Could not change the password. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={forced ? () => undefined : onClose}
      title={forced ? "Set a new password" : "Change password"}
      description={
        forced
          ? "This is your first sign-in. Choose a strong password before continuing."
          : "Use at least 10 characters with a letter and a number."
      }
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {forced ? (
          <div className="flex items-start gap-2.5 rounded-lg border border-gold/35 bg-gold-soft/60 px-3.5 py-3 text-xs leading-relaxed text-[#6d4b0b]">
            <LockKey size={17} weight="bold" className="mt-0.5 shrink-0" />
            Your current password is required once, then the new password takes
            effect immediately.
          </div>
        ) : null}

        {error ? (
          <div role="alert" className="flex items-start gap-2 rounded-lg border border-danger/25 bg-danger-soft px-3.5 py-3 text-sm text-danger">
            <WarningCircle size={18} weight="fill" className="mt-0.5 shrink-0" />
            {error}
          </div>
        ) : null}

        <div>
          <label htmlFor="current-password" className="label">
            Current password
          </label>
          <input
            id="current-password"
            type="password"
            className={`input ${fieldError.currentPassword ? "input-invalid" : ""}`}
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
          {fieldError.currentPassword ? (
            <p className="error-text" role="alert">{fieldError.currentPassword}</p>
          ) : null}
        </div>

        <div>
          <label htmlFor="new-password" className="label">
            New password
          </label>
          <input
            id="new-password"
            type="password"
            className={`input ${fieldError.newPassword ? "input-invalid" : ""}`}
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            autoComplete="new-password"
            minLength={10}
            required
          />
          {fieldError.newPassword ? (
            <p className="error-text" role="alert">{fieldError.newPassword}</p>
          ) : (
            <p className="help">At least 10 characters, including a letter and a number.</p>
          )}
        </div>

        <div>
          <label htmlFor="confirm-password" className="label">
            Confirm new password
          </label>
          <input
            id="confirm-password"
            type="password"
            className={`input ${fieldError.confirmPassword ? "input-invalid" : ""}`}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            autoComplete="new-password"
            required
          />
          {fieldError.confirmPassword ? (
            <p className="error-text" role="alert">{fieldError.confirmPassword}</p>
          ) : null}
        </div>

        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
          {!forced ? (
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
          ) : null}
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? (
              <>
                <CircleNotch size={16} weight="bold" className="animate-spin" />
                Updating…
              </>
            ) : (
              "Update password"
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
