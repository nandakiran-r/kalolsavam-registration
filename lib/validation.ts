import { z } from "zod";

/**
 * Configurable roll-number pattern. The default matches examples such as
 * 24USCS10 (2-digit year + 2–5 letters + 1–4 digits).
 */
export const ROLL_NUMBER_PATTERN =
  process.env.ROLL_NUMBER_PATTERN || "^\\d{2}[A-Z]{2,5}\\d{1,4}$";

export function normalizePhone(raw: string): string {
  let value = raw.trim().replace(/[\s\-().]/g, "");
  if (value.startsWith("+91")) value = value.slice(3);
  else if (value.startsWith("91") && value.length === 12) value = value.slice(2);
  else if (value.startsWith("0") && value.length === 11) value = value.slice(1);
  return value;
}

const phoneSchema = z
  .string()
  .max(24, "Phone number is too long")
  .transform(normalizePhone)
  .pipe(
    z
      .string()
      .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"),
  );

const nameSchema = z
  .string()
  .max(120, "Name is too long")
  .transform((value) => value.trim().replace(/\s+/g, " "))
  .pipe(
    z
      .string()
      .min(2, "Name must be at least 2 characters")
      .max(80, "Name must be at most 80 characters")
      .regex(
        /^[\p{L} .]+$/u,
        "Name may contain letters, spaces and dots only",
      ),
  );

const rollSchema = z
  .string()
  .max(30, "Roll number is too long")
  .transform((value) => value.trim().toUpperCase())
  .pipe(
    z
      .string()
      .regex(
        new RegExp(ROLL_NUMBER_PATTERN),
        "Enter a valid roll number (example: 24USCS10)",
      ),
  );

const emailSchema = z
  .string()
  .max(120, "Email is too long")
  .transform((value) => value.trim())
  .pipe(
    z
      .string()
      .regex(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, "Enter a valid email address"),
  );

const eventIdsSchema = z
  .array(z.number().int().positive())
  .min(1, "Select at least one event")
  .max(20, "You can select at most 20 events")
  .refine((ids) => new Set(ids).size === ids.length, "Duplicate events selected");

export const studentInputSchema = z
  .object({
    name: nameSchema,
    associationId: z.number().int().positive("Choose an association"),
    rollNumber: rollSchema,
    whatsapp: phoneSchema,
    phone: phoneSchema,
    email: emailSchema,
    eventIds: eventIdsSchema,
  })
  .strict();

export const registrationSchema = studentInputSchema
  .extend({
    website: z.string().max(0, "Invalid submission").optional().default(""),
  })
  .strict();

export const lookupSchema = z
  .object({
    applicationId: z.string().trim().min(4).max(32),
    token: z.string().trim().min(20).max(200),
  })
  .strict();

export const adminLoginSchema = z
  .object({
    email: z
      .string()
      .max(120)
      .transform((value) => value.trim().toLowerCase())
      .pipe(z.string().email("Enter a valid email address")),
    password: z.string().min(1, "Enter your password").max(200),
  })
  .strict();

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password").max(200),
    newPassword: z
      .string()
      .min(10, "Use at least 10 characters")
      .max(200)
      .regex(/[A-Za-z]/, "Include at least one letter")
      .regex(/\d/, "Include at least one number"),
  })
  .strict();

export const eventInputSchema = z
  .object({
    nameMl: z.string().trim().min(1, "Malayalam name is required").max(120),
    nameEn: z.string().trim().min(1, "English name is required").max(120),
    isActive: z.boolean(),
    sortOrder: z.number().int().min(0).max(9999),
  })
  .strict();

export const settingsSchema = z
  .object({
    registrationOpen: z.boolean(),
  })
  .strict();

export const bulkDeleteSchema = z
  .object({
    ids: z.array(z.number().int().positive()).min(1).max(500),
  })
  .strict();

export type StudentInput = z.infer<typeof studentInputSchema>;
export type RegistrationInput = z.infer<typeof registrationSchema>;
export type EventInput = z.infer<typeof eventInputSchema>;
