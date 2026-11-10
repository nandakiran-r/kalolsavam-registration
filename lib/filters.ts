import type { AdminFilters } from "./students";

export function parseAdminFilters(url: URL): AdminFilters {
  const associationRaw = Number(url.searchParams.get("associationId"));
  const eventIds = (url.searchParams.get("eventIds") ?? "")
    .split(",")
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value > 0);
  const house = url.searchParams.get("house") ?? undefined;
  const dir = url.searchParams.get("dir") === "asc" ? "asc" : "desc";
  return {
    house: house && ["A", "B", "C", "D"].includes(house) ? house : undefined,
    associationId:
      Number.isInteger(associationRaw) && associationRaw > 0
        ? associationRaw
        : undefined,
    eventIds: eventIds.length ? eventIds : undefined,
    q: url.searchParams.get("q") ?? undefined,
    sort: url.searchParams.get("sort") ?? "createdAt",
    dir,
  };
}

export function escapeCsvCell(value: string | number | null | undefined) {
  let text = value === null || value === undefined ? "" : String(value);
  // Neutralise spreadsheet formula injection before quoting.
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}
