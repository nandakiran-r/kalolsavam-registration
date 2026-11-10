import type { StudentProfile } from "./constants";

export type StoredRegistration = {
  applicationId: string;
  editToken: string;
  profileSnapshot: StudentProfile;
  savedAt: string;
};

const KEY = "sjc.kalolsavam.profile.v1";

export function loadStoredRegistration(): {
  record: StoredRegistration | null;
  error: "unavailable" | "corrupt" | null;
} {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { record: null, error: null };
    const parsed = JSON.parse(raw) as StoredRegistration;
    if (
      !parsed ||
      typeof parsed.applicationId !== "string" ||
      typeof parsed.editToken !== "string" ||
      !parsed.profileSnapshot
    ) {
      return { record: null, error: "corrupt" };
    }
    return { record: parsed, error: null };
  } catch {
    return { record: null, error: "unavailable" };
  }
}

export function saveStoredRegistration(record: StoredRegistration): boolean {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(record));
    return true;
  } catch {
    return false;
  }
}

export function clearStoredRegistration(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // Storage may be blocked; there is nothing else we can do.
  }
}
