export class AppError extends Error {
  status: number;
  code: string;
  field?: string;

  constructor(
    message: string,
    status = 400,
    options: { code?: string; field?: string } = {},
  ) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = options.code ?? "BAD_REQUEST";
    this.field = options.field;
  }
}

export function isUniqueViolation(error: unknown): error is {
  code: string;
  constraint?: string;
  detail?: string;
} {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "23505"
  );
}
