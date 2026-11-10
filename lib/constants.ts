export const COLLEGE_NAME = "St. Joseph's College (Autonomous), Devagiri";
export const COLLEGE_SHORT = "SJC Devagiri";
export const KALOLSAVAM_YEAR = Number(process.env.NEXT_PUBLIC_YEAR || 2026);
export const APP_ID_PREFIX = `KAL${String(KALOLSAVAM_YEAR).slice(-2)}`;

export type House = "A" | "B" | "C" | "D";

export const HOUSES: House[] = ["A", "B", "C", "D"];

export const HOUSE_META: Record<
  House,
  { label: string; name: string; hex: string; tint: string; text: string }
> = {
  A: {
    label: "House A",
    name: "A",
    hex: "#a8432f",
    tint: "#f8e9e4",
    text: "#7d2e1e",
  },
  B: {
    label: "House B",
    name: "B",
    hex: "#276b63",
    tint: "#e3f1ee",
    text: "#194d47",
  },
  C: {
    label: "House C",
    name: "C",
    hex: "#3d4f96",
    tint: "#e8ebf8",
    text: "#2c3a73",
  },
  D: {
    label: "House D",
    name: "D",
    hex: "#946814",
    tint: "#f7eeda",
    text: "#6d4b0b",
  },
};

/** Single source of truth for the 28 associations and their houses. */
export const ASSOCIATIONS: { name: string; house: House }[] = [
  { name: "Botany Association", house: "C" },
  { name: "Chemistry Association", house: "D" },
  { name: "Commerce Association", house: "A" },
  { name: "Economics Association", house: "A" },
  { name: "Economics & Mathematics Association", house: "C" },
  { name: "English Association", house: "D" },
  { name: "Malayalam Association", house: "A" },
  { name: "Mathematics Association", house: "B" },
  { name: "Physics Association", house: "C" },
  { name: "Psychology Association", house: "A" },
  { name: "Zoology Association", house: "B" },
  { name: "Business Administration (SF) Association", house: "C" },
  {
    name: "Business Administration (International Business) (SF) Association",
    house: "D",
  },
  { name: "Sports Management (SF) Association", house: "A" },
  { name: "Commerce (Computer Application) (SF) Association", house: "A" },
  { name: "Commerce (Finance) (SF) Association", house: "B" },
  { name: "Computer Science (SF) Association", house: "C" },
  { name: "Computer Application (SF) Association", house: "B" },
  { name: "Functional English (SF) Association", house: "D" },
  { name: "English (SF) Association", house: "D" },
  { name: "Applied Mathematics (SF) Association", house: "B" },
  { name: "Computer Science & Mathematics (SF) Association", house: "C" },
  { name: "Animation & Graphic Design (SF) Association", house: "B" },
  { name: "Journalism & Mass Communication (SF) Association", house: "C" },
  { name: "Commerce (Professional) (SF) Association", house: "D" },
  { name: "Commerce (Applied Finance & Accounting) (SF) Association", house: "D" },
  { name: "Social work (SF) Association", house: "A" },
  { name: "Statistics (SF) Association", house: "B" },
];

export const INITIAL_EVENTS: {
  name_ml: string;
  name_en: string;
  sort_order: number;
}[] = [
  {
    name_ml: "പ്രബന്ധരചന ഇംഗ്ലീഷ്",
    name_en: "Essay Writing English",
    sort_order: 1,
  },
  {
    name_ml: "പ്രബന്ധരചന മലയാളം",
    name_en: "Essay Writing Malayalam",
    sort_order: 2,
  },
  {
    name_ml: "പ്രബന്ധരചന ഹിന്ദി",
    name_en: "Essay Writing Hindi",
    sort_order: 3,
  },
  {
    name_ml: "പ്രബന്ധരചന തമിഴ്",
    name_en: "Essay Writing Tamil",
    sort_order: 4,
  },
  {
    name_ml: "പ്രബന്ധരചന സംസ്കൃതം",
    name_en: "Essay Writing Sanskrit",
    sort_order: 5,
  },
];

export const CONTACT_STORAGE_KEY = "sjc.kalolsavam.profile.v1";
export const ADMIN_SESSION_COOKIE = "sjc_admin_session";

export type EventRow = {
  id: number;
  name_ml: string;
  name_en: string;
  is_active: boolean;
  sort_order: number;
};

export type AssociationRow = {
  id: number;
  name: string;
  house: House;
  sort_order: number;
};

export type StudentProfile = {
  id: number;
  applicationId: string;
  name: string;
  rollNumber: string;
  associationId: number;
  associationName: string;
  house: House;
  whatsapp: string;
  phone: string;
  email: string;
  events: { id: number; nameMl: string; nameEn: string; isActive: boolean }[];
  createdAt: string;
  updatedAt: string;
};
