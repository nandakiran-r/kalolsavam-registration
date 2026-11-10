export class ApiError extends Error {
  status: number;
  field?: string;
  code?: string;

  constructor(
    message: string,
    options: { status?: number; field?: string; code?: string } = {},
  ) {
    super(message);
    this.name = "ApiError";
    this.status = options.status ?? 0;
    this.field = options.field;
    this.code = options.code;
  }
}

export async function api<T>(
  url: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers,
      credentials: "same-origin",
      cache: "no-store",
    });
  } catch {
    throw new ApiError(
      "Could not reach the server. Check your connection and try again.",
      { code: "NETWORK" },
    );
  }

  const isJson = response.headers
    .get("content-type")
    ?.includes("application/json");
  const data = isJson ? await response.json().catch(() => null) : null;

  if (!response.ok) {
    throw new ApiError(
      (data && typeof data.error === "string" && data.error) ||
        "Something went wrong. Please try again.",
      {
        status: response.status,
        field: data?.field,
        code: data?.code,
      },
    );
  }

  return data as T;
}
