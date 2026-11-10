import type {
  AssociationRow,
  EventRow,
  StudentProfile,
} from "./constants";

export type Bootstrap = {
  associations: AssociationRow[];
  events: EventRow[];
  registrationOpen: boolean;
  year: number;
};

export type AdminEvent = EventRow & { registrationCount: number };

export type AdminMeta = {
  events: AdminEvent[];
  associations: AssociationRow[];
  totalRegistrations: number;
  registrationOpen: boolean;
};

export type AdminStats = {
  byHouse: { house: "A" | "B" | "C" | "D"; count: number }[];
  byAssociation: { name: string; house: "A" | "B" | "C" | "D"; count: number }[];
  byEvent: { id: number; name_en: string; name_ml: string; count: number }[];
  total: number;
  today: number;
  recent: {
    id: string;
    application_id: string;
    name: string;
    house: "A" | "B" | "C" | "D";
    created_at: string;
  }[];
};

export type AdminSession = {
  id: number;
  email: string;
  role: "admin" | "viewer";
  mustChangePassword: boolean;
};

export type SortKey =
  | "applicationId"
  | "name"
  | "rollNumber"
  | "association"
  | "house"
  | "whatsapp"
  | "phone"
  | "email"
  | "events"
  | "createdAt"
  | "updatedAt";

export type GroupMode = "none" | "house" | "association" | "event";

export type RegistrationFilters = {
  q: string;
  house: string;
  associationId: string;
  eventIds: number[];
  sort: SortKey;
  dir: "asc" | "desc";
};

export type RegistrationResult = {
  registrations: StudentProfile[];
  totalCount: number;
};
