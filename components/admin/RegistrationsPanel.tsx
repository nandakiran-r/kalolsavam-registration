"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  CaretDown,
  CaretLeft,
  CaretRight,
  CaretUpDown,
  FileCsv,
  FilePdf,
  Funnel,
  MagnifyingGlass,
  PencilSimple,
  SpinnerGap,
  Trash,
  Users,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import type {
  AdminMeta,
  GroupMode,
  RegistrationFilters,
  RegistrationResult,
  SortKey,
} from "@/lib/types";
import type { StudentProfile } from "@/lib/constants";
import { api, ApiError } from "@/lib/client";
import { useToast } from "@/components/ui/Toast";
import { HouseChip } from "@/components/ui/HouseChip";
import { Modal } from "@/components/ui/Modal";
import { RegistrationEditModal } from "./RegistrationEditModal";
import { AdminReport } from "./AdminReport";
import { exportElementsToPdf } from "@/lib/pdf";

const PAGE_SIZE = 25;

const SORT_LABELS: { key: SortKey; label: string }[] = [
  { key: "applicationId", label: "Application ID" },
  { key: "name", label: "Name" },
  { key: "rollNumber", label: "Roll No" },
  { key: "association", label: "Association" },
  { key: "house", label: "House" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "phone", label: "Phone" },
  { key: "email", label: "Email" },
  { key: "events", label: "Events" },
  { key: "createdAt", label: "Registered" },
  { key: "updatedAt", label: "Updated" },
];

function buildQuery(filters: RegistrationFilters) {
  const params = new URLSearchParams();
  if (filters.q.trim()) params.set("q", filters.q.trim());
  if (filters.house) params.set("house", filters.house);
  if (filters.associationId) params.set("associationId", filters.associationId);
  if (filters.eventIds.length) params.set("eventIds", filters.eventIds.join(","));
  params.set("sort", filters.sort);
  params.set("dir", filters.dir);
  return params.toString();
}

function shortDate(value: string) {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
  });
}

function SortHeader({
  item,
  filters,
  onSort,
}: {
  item: { key: SortKey; label: string };
  filters: RegistrationFilters;
  onSort: (key: SortKey) => void;
}) {
  const active = filters.sort === item.key;
  return (
    <th
      scope="col"
      aria-sort={
        active ? (filters.dir === "asc" ? "ascending" : "descending") : "none"
      }
      className="whitespace-nowrap px-3 py-2.5"
    >
      <button
        type="button"
        onClick={() => onSort(item.key)}
        className={`inline-flex items-center gap-1 font-bold uppercase tracking-[0.08em] transition hover:text-ink ${
          active ? "text-maroon" : "text-ink-soft"
        }`}
      >
        {item.label}
        <CaretUpDown
          size={12}
          weight="bold"
          className={active ? "text-maroon" : "text-ink-faint/70"}
        />
      </button>
    </th>
  );
}

function Table({
  students,
  selected,
  onToggle,
  onEdit,
  onDelete,
  filters,
  onSort,
}: {
  students: StudentProfile[];
  selected: Set<number>;
  onToggle: (id: number) => void;
  onEdit: (student: StudentProfile) => void;
  onDelete: (student: StudentProfile) => void;
  filters: RegistrationFilters;
  onSort: (key: SortKey) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1540px] border-collapse text-left text-[12px]">
        <thead className="table-head">
          <tr>
            <th scope="col" className="w-10 px-3 py-2.5">
              <span className="sr-only">Select</span>
            </th>
            {SORT_LABELS.map((item) => (
              <SortHeader key={item.key} item={item} filters={filters} onSort={onSort} />
            ))}
            <th scope="col" className="px-3 py-2.5 text-right">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {students.map((student) => (
            <tr
              key={student.id}
              className={`align-top transition hover:bg-paper/70 ${
                selected.has(student.id) ? "bg-maroon-soft/30" : "bg-white"
              }`}
            >
              <td className="px-3 py-3">
                <input
                  type="checkbox"
                  checked={selected.has(student.id)}
                  onChange={() => onToggle(student.id)}
                  className="h-4 w-4 accent-maroon"
                  aria-label={`Select ${student.name}`}
                />
              </td>
              <td className="whitespace-nowrap px-3 py-3 font-mono text-[11px] font-bold text-ink">
                {student.applicationId}
              </td>
              <td className="max-w-[170px] px-3 py-3 font-semibold text-ink">
                <span className="block truncate" title={student.name}>
                  {student.name}
                </span>
              </td>
              <td className="whitespace-nowrap px-3 py-3 font-mono text-[11px]">
                {student.rollNumber}
              </td>
              <td className="max-w-[220px] px-3 py-3">
                <span className="block truncate" title={student.associationName}>
                  {student.associationName}
                </span>
              </td>
              <td className="whitespace-nowrap px-3 py-3">
                <HouseChip house={student.house} size="sm" />
              </td>
              <td className="whitespace-nowrap px-3 py-3 font-mono text-[11px]">
                {student.whatsapp}
              </td>
              <td className="whitespace-nowrap px-3 py-3 font-mono text-[11px]">
                {student.phone}
              </td>
              <td className="max-w-[200px] px-3 py-3">
                <span className="block truncate text-[11px]" title={student.email}>
                  {student.email}
                </span>
              </td>
              <td className="max-w-[230px] px-3 py-3">
                <div className="space-y-0.5">
                  {student.events.slice(0, 2).map((event) => (
                    <p key={event.id} className="truncate text-[11px]" title={`${event.nameMl} / ${event.nameEn}`}>
                      {event.nameEn}
                    </p>
                  ))}
                  {student.events.length > 2 ? (
                    <p className="text-[10px] font-semibold text-ink-faint">
                      +{student.events.length - 2} more
                    </p>
                  ) : null}
                </div>
              </td>
              <td className="whitespace-nowrap px-3 py-3 text-[11px] text-ink-soft">
                {shortDate(student.createdAt)}
              </td>
              <td className="whitespace-nowrap px-3 py-3 text-[11px] text-ink-soft">
                {shortDate(student.updatedAt)}
              </td>
              <td className="whitespace-nowrap px-3 py-3 text-right">
                <div className="flex justify-end gap-1">
                  <button
                    type="button"
                    onClick={() => onEdit(student)}
                    className="rounded-md p-1.5 text-ink-soft transition hover:bg-paper-2 hover:text-ink"
                    aria-label={`Edit ${student.name}`}
                  >
                    <PencilSimple size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(student)}
                    className="rounded-md p-1.5 text-ink-soft transition hover:bg-danger-soft hover:text-danger"
                    aria-label={`Delete ${student.name}`}
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
  );
}

export function RegistrationsPanel({
  meta,
  refreshMeta,
}: {
  meta: AdminMeta | null;
  refreshMeta: () => void;
}) {
  const { toast } = useToast();
  const [searchInput, setSearchInput] = useState("");
  const [filters, setFilters] = useState<RegistrationFilters>({
    q: "",
    house: "",
    associationId: "",
    eventIds: [],
    sort: "createdAt",
    dir: "desc",
  });
  const [data, setData] = useState<RegistrationResult>({
    registrations: [],
    totalCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [page, setPage] = useState(1);
  const [groupBy, setGroupBy] = useState<GroupMode>("none");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [editTarget, setEditTarget] = useState<StudentProfile | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StudentProfile[] | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [eventsOpen, setEventsOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [report, setReport] = useState<{
    registrations: StudentProfile[];
    filtersLabel: string;
    groupBy: GroupMode;
    generatedAt: Date;
    filename: string;
  } | null>(null);
  const eventFilterRef = useRef<HTMLDivElement>(null);
  const reportRef = useRef<HTMLDivElement>(null);
  const requestId = useRef(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setFilters((current) =>
        current.q === searchInput ? current : { ...current, q: searchInput },
      );
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
    setSelected(new Set());
  }, [filters]);

  useEffect(() => {
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    api<RegistrationResult>(`/api/admin/registrations?${buildQuery(filters)}`)
      .then((result) => {
        if (requestId.current !== id) return;
        setData(result);
      })
      .catch((err) => {
        if (requestId.current !== id) return;
        setError(
          err instanceof ApiError ? err.message : "Could not load registrations.",
        );
      })
      .finally(() => {
        if (requestId.current === id) setLoading(false);
      });
  }, [filters, reloadKey]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (!eventFilterRef.current) return;
      if (!eventFilterRef.current.contains(event.target as Node)) {
        setEventsOpen(false);
      }
    }
    if (eventsOpen) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [eventsOpen]);

  useEffect(() => {
    if (!report) return;
    let cancelled = false;
    setExporting(true);
    (async () => {
      await new Promise((resolve) => setTimeout(resolve, 150));
      if (cancelled || !reportRef.current) return;
      const nodes = Array.from(
        reportRef.current.querySelectorAll<HTMLElement>("[data-report-page]"),
      );
      await exportElementsToPdf(nodes, report.filename, "landscape");
      if (!cancelled) toast("PDF report downloaded.", "success");
    })()
      .catch((err) => {
        console.error(err);
        if (!cancelled) toast("Could not build the PDF report.", "error");
      })
      .finally(() => {
        if (!cancelled) {
          setExporting(false);
          setReport(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [report, toast]);

  const pageCount = Math.max(1, Math.ceil(data.totalCount / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageRows = data.registrations.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  const groups = useMemo(() => {
    if (groupBy === "none") return null;
    if (groupBy === "house") {
      return (["A", "B", "C", "D"] as const)
        .map((house) => {
          const students = data.registrations.filter(
            (student) => student.house === house,
          );
          return {
            key: `house-${house}`,
            label: `House ${house}`,
            sub: `${students.length} registration${students.length === 1 ? "" : "s"}`,
            students,
          };
        })
        .filter((group) => group.students.length);
    }
    if (groupBy === "association") {
      const map = new Map<string, StudentProfile[]>();
      for (const student of data.registrations) {
        const list = map.get(student.associationName) ?? [];
        list.push(student);
        map.set(student.associationName, list);
      }
      return [...map.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([name, students]) => ({
          key: `assoc-${name}`,
          label: name,
          sub: `House ${students[0]!.house} · ${students.length}`,
          students,
        }));
    }
    return (meta?.events ?? [])
      .map((event) => {
        const students = data.registrations.filter((student) =>
          student.events.some((entry) => entry.id === event.id),
        );
        return {
          key: `event-${event.id}`,
          label: event.name_ml,
          sub: `${event.name_en} · ${students.length}`,
          students,
          malayalam: true,
        };
      })
      .filter((group) => group.students.length);
  }, [data.registrations, groupBy, meta]);

  const filtersLabel = useMemo(() => {
    const parts: string[] = [];
    if (filters.q.trim()) parts.push(`Search “${filters.q.trim()}”`);
    if (filters.house) parts.push(`House ${filters.house}`);
    if (filters.associationId) {
      const association = meta?.associations.find(
        (item) => item.id === Number(filters.associationId),
      );
      if (association) parts.push(association.name);
    }
    if (filters.eventIds.length) {
      const names = (meta?.events ?? [])
        .filter((event) => filters.eventIds.includes(event.id))
        .map((event) => event.name_en);
      parts.push(`Events: ${names.join(", ")}`);
    }
    if (groupBy !== "none") parts.push(`Grouped by ${groupBy}`);
    return parts.join(" · ") || "All registrations";
  }, [filters, groupBy, meta]);

  function setFilter<K extends keyof RegistrationFilters>(
    key: K,
    value: RegistrationFilters[K],
  ) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function clearFilters() {
    setSearchInput("");
    setFilters({
      q: "",
      house: "",
      associationId: "",
      eventIds: [],
      sort: "createdAt",
      dir: "desc",
    });
    setGroupBy("none");
  }

  function sortBy(key: SortKey) {
    setFilters((current) => ({
      ...current,
      sort: key,
      dir:
        current.sort === key && current.dir === "asc" ? "desc" : "asc",
    }));
  }

  function toggleSelected(id: number) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllOnPage() {
    const ids = pageRows.map((student) => student.id);
    const all = ids.length > 0 && ids.every((id) => selected.has(id));
    setSelected((current) => {
      const next = new Set(current);
      if (all) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
  }

  function refresh() {
    setReloadKey((value) => value + 1);
    refreshMeta();
  }

  async function confirmDelete() {
    if (!deleteTarget?.length) return;
    setDeleting(true);
    try {
      if (deleteTarget.length === 1) {
        await api(`/api/admin/registrations/${deleteTarget[0]!.id}`, {
          method: "DELETE",
        });
      } else {
        await api("/api/admin/registrations/bulk-delete", {
          method: "POST",
          body: JSON.stringify({ ids: deleteTarget.map((student) => student.id) }),
        });
      }
      toast(
        `${deleteTarget.length} registration${deleteTarget.length === 1 ? "" : "s"} removed. An audit entry was recorded.`,
        "success",
      );
      setDeleteTarget(null);
      setSelected(new Set());
      refresh();
    } catch (error) {
      toast(
        error instanceof ApiError ? error.message : "Could not delete the registration.",
        "error",
      );
    } finally {
      setDeleting(false);
    }
  }

  function startExport() {
    if (!data.registrations.length) {
      toast("There are no registrations to export with these filters.", "error");
      return;
    }
    const stamp = new Date().toISOString().slice(0, 10);
    setReport({
      registrations: data.registrations,
      filtersLabel,
      groupBy,
      generatedAt: new Date(),
      filename: `Kalolsavam_Registrations_${stamp}.pdf`,
    });
  }

  const allPageSelected =
    pageRows.length > 0 && pageRows.every((student) => selected.has(student.id));

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-maroon">
            Registrations
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-[-0.025em] text-ink">
            Student register
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            {data.totalCount} matching registration{data.totalCount === 1 ? "" : "s"}
            {data.totalCount !== meta?.totalRegistrations
              ? ` · ${meta?.totalRegistrations ?? 0} total`
              : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={`/api/admin/export/csv?${buildQuery(filters)}`}
            className="btn-secondary"
          >
            <FileCsv size={16} weight="bold" />
            Export CSV
          </a>
          <button
            type="button"
            onClick={startExport}
            disabled={exporting}
            className="btn-primary"
          >
            {exporting ? (
              <SpinnerGap size={16} weight="bold" className="animate-spin" />
            ) : (
              <FilePdf size={16} weight="bold" />
            )}
            {exporting ? "Building PDF…" : "Export PDF"}
          </button>
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-line bg-white p-4">
        <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-[1.5fr_0.55fr_1fr_0.85fr_auto]">
          <div className="relative">
            <label htmlFor="search" className="sr-only">Search registrations</label>
            <MagnifyingGlass
              size={17}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
            />
            <input
              id="search"
              className="input pl-9"
              placeholder="Search name, roll no, phone, email, event…"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
            />
          </div>

          <div>
            <label htmlFor="house-filter" className="sr-only">Filter by house</label>
            <select
              id="house-filter"
              className="input"
              value={filters.house}
              onChange={(event) => setFilter("house", event.target.value)}
            >
              <option value="">All houses</option>
              {["A", "B", "C", "D"].map((house) => (
                <option key={house} value={house}>House {house}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="association-filter" className="sr-only">
              Filter by association
            </label>
            <select
              id="association-filter"
              className="input"
              value={filters.associationId}
              onChange={(event) => setFilter("associationId", event.target.value)}
            >
              <option value="">All associations</option>
              {(meta?.associations ?? []).map((association) => (
                <option key={association.id} value={association.id}>
                  {association.name}
                </option>
              ))}
            </select>
          </div>

          <div className="relative" ref={eventFilterRef}>
            <button
              type="button"
              onClick={() => setEventsOpen((value) => !value)}
              className="input flex items-center justify-between gap-2 text-left"
              aria-expanded={eventsOpen}
              aria-haspopup="listbox"
            >
              <span className="flex min-w-0 items-center gap-1.5">
                <Funnel size={15} className="shrink-0 text-ink-faint" />
                <span className="truncate">
                  {filters.eventIds.length
                    ? `${filters.eventIds.length} event${filters.eventIds.length === 1 ? "" : "s"}`
                    : "All events"}
                </span>
              </span>
              <CaretDown size={14} className="shrink-0 text-ink-faint" />
            </button>

            {eventsOpen ? (
              <div className="absolute left-0 top-full z-50 mt-1 w-[320px] max-w-[calc(100vw-2rem)] rounded-xl border border-line bg-white shadow-xl">
                <div className="max-h-[280px] overflow-y-auto p-2">
                  {(meta?.events ?? []).map((event) => (
                    <label
                      key={event.id}
                      className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-paper-2"
                    >
                      <input
                        type="checkbox"
                        checked={filters.eventIds.includes(event.id)}
                        onChange={() =>
                          setFilter(
                            "eventIds",
                            filters.eventIds.includes(event.id)
                              ? filters.eventIds.filter((id) => id !== event.id)
                              : [...filters.eventIds, event.id],
                          )
                        }
                        className="mt-0.5 h-3.5 w-3.5 accent-maroon"
                      />
                      <span className="min-w-0">
                        <span className="block truncate font-malayalam font-semibold text-ink">
                          {event.name_ml}
                        </span>
                        <span className="block truncate text-[11px] text-ink-soft">
                          {event.name_en}
                          {!event.is_active ? " · closed" : ""}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
                <div className="flex items-center justify-between border-t border-line px-2 py-2">
                  <button
                    type="button"
                    onClick={() => setFilter("eventIds", [])}
                    className="text-[11px] font-bold text-ink-soft hover:text-ink"
                  >
                    Clear events
                  </button>
                  <button
                    type="button"
                    onClick={() => setEventsOpen(false)}
                    className="rounded-md bg-ink px-2.5 py-1 text-[11px] font-bold text-paper"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <button type="button" onClick={clearFilters} className="btn-ghost justify-center">
            <X size={15} />
            Clear
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
          <div className="flex items-center gap-2 text-xs text-ink-soft">
            <label htmlFor="group-by" className="font-semibold">Group by</label>
            <select
              id="group-by"
              className="rounded-md border border-line-strong bg-white px-2 py-1.5 text-xs font-semibold text-ink"
              value={groupBy}
              onChange={(event) => setGroupBy(event.target.value as GroupMode)}
            >
              <option value="none">None</option>
              <option value="house">House</option>
              <option value="association">Association</option>
              <option value="event">Event</option>
            </select>
            {selected.size ? (
              <span className="ml-2 rounded-full bg-maroon-soft px-2 py-0.5 text-[11px] font-bold text-maroon">
                {selected.size} selected
              </span>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {selected.size ? (
              <>
                <button
                  type="button"
                  onClick={() => setSelected(new Set())}
                  className="text-[11px] font-bold text-ink-soft hover:text-ink"
                >
                  Clear selection
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setDeleteTarget(
                      data.registrations.filter((student) =>
                        selected.has(student.id),
                      ),
                    )
                  }
                  className="btn-danger px-3 py-1.5 text-xs"
                >
                  <Trash size={14} />
                  Delete selected
                </button>
              </>
            ) : null}
            <span className="text-[11px] text-ink-faint">
              {loading ? "Loading…" : `${data.totalCount} filtered`}
            </span>
          </div>
        </div>
      </div>

      {error ? (
        <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-danger/25 bg-danger-soft px-4 py-3 text-sm text-danger">
          <WarningCircle size={18} weight="fill" className="mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold">{error}</p>
            <button
              type="button"
              onClick={refresh}
              className="mt-1 text-xs font-bold underline"
            >
              Try again
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-4">
        {loading && !data.registrations.length ? (
          <div className="overflow-hidden rounded-xl border border-line bg-white">
            <div className="border-b border-line bg-paper-2/60 px-4 py-3">
              <div className="skeleton h-3 w-48 rounded" />
            </div>
            <div className="space-y-3 p-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="skeleton h-9 rounded" />
              ))}
            </div>
          </div>
        ) : !data.registrations.length ? (
          <div className="rounded-xl border border-line bg-white py-16 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-paper-2 text-ink-soft">
              <Users size={22} weight="bold" />
            </span>
            <h2 className="mt-4 font-display text-xl font-semibold text-ink">
              No registrations match
            </h2>
            <p className="mx-auto mt-1 max-w-sm text-sm text-ink-soft">
              Try removing a filter or searching for a different name, roll number or
              event.
            </p>
            <button type="button" onClick={clearFilters} className="btn-secondary mt-4">
              Clear filters
            </button>
          </div>
        ) : groups ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border border-line bg-white px-4 py-2.5 text-xs text-ink-soft">
              <span>
                Grouped view · {groups.length} group{groups.length === 1 ? "" : "s"} ·{" "}
                {data.totalCount} matching
              </span>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={allPageSelected}
                  onChange={toggleAllOnPage}
                  className="h-3.5 w-3.5 accent-maroon"
                />
                Select page
              </label>
            </div>
            {groups.map((group) => {
              const isCollapsed = collapsed.has(group.key);
              return (
                <section
                  key={group.key}
                  className="overflow-hidden rounded-xl border border-line bg-white"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setCollapsed((current) => {
                        const next = new Set(current);
                        if (next.has(group.key)) next.delete(group.key);
                        else next.add(group.key);
                        return next;
                      })
                    }
                    className="flex w-full items-center justify-between gap-3 bg-paper-2/60 px-4 py-3 text-left transition hover:bg-paper-2"
                    aria-expanded={!isCollapsed}
                  >
                    <div className="min-w-0">
                      <p
                        className={`truncate text-sm font-bold text-ink ${"malayalam" in group ? "font-malayalam" : ""}`}
                      >
                        {group.label}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] text-ink-soft">
                        {group.sub}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="rounded-full border border-line-strong bg-white px-2 py-0.5 font-mono text-[11px] font-bold text-ink">
                        {group.students.length}
                      </span>
                      <CaretDown
                        size={16}
                        className={`text-ink-soft transition ${isCollapsed ? "-rotate-90" : ""}`}
                      />
                    </div>
                  </button>
                  {!isCollapsed ? (
                    <Table
                      students={group.students}
                      selected={selected}
                      onToggle={toggleSelected}
                      onEdit={setEditTarget}
                      onDelete={(student) => setDeleteTarget([student])}
                      filters={filters}
                      onSort={sortBy}
                    />
                  ) : null}
                </section>
              );
            })}
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-line bg-white">
            <Table
              students={pageRows}
              selected={selected}
              onToggle={toggleSelected}
              onEdit={setEditTarget}
              onDelete={(student) => setDeleteTarget([student])}
              filters={filters}
              onSort={sortBy}
            />
            <div className="flex flex-col items-center justify-between gap-3 border-t border-line px-4 py-3 sm:flex-row">
              <p className="text-[11px] text-ink-soft">
                Showing{" "}
                <span className="font-bold text-ink">
                  {(safePage - 1) * PAGE_SIZE + 1}–
                  {Math.min(safePage * PAGE_SIZE, data.totalCount)}
                </span>{" "}
                of <span className="font-bold text-ink">{data.totalCount}</span>
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                  disabled={safePage <= 1}
                  className="rounded-md border border-line-strong bg-white p-1.5 text-ink-soft disabled:opacity-40"
                  aria-label="Previous page"
                >
                  <CaretLeft size={15} />
                </button>
                <span className="min-w-[80px] text-center text-[11px] font-semibold text-ink-soft">
                  Page {safePage} of {pageCount}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
                  disabled={safePage >= pageCount}
                  className="rounded-md border border-line-strong bg-white p-1.5 text-ink-soft disabled:opacity-40"
                  aria-label="Next page"
                >
                  <CaretRight size={15} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <RegistrationEditModal
        key={editTarget?.id ?? "none"}
        student={editTarget}
        meta={meta}
        onClose={() => setEditTarget(null)}
        onSaved={() => {
          setEditTarget(null);
          refresh();
        }}
      />

      <Modal
        open={Boolean(deleteTarget?.length)}
        onClose={() => {
          if (!deleting) setDeleteTarget(null);
        }}
        title={
          deleteTarget && deleteTarget.length > 1
            ? `Delete ${deleteTarget.length} registrations?`
            : "Delete this registration?"
        }
        description="The record will be soft-deleted and removed from the active register. An audit entry is kept. The student's device will show a removed notice."
        size="sm"
      >
        <div className="space-y-4">
          {deleteTarget?.length ? (
            <div className="max-h-40 overflow-y-auto rounded-lg border border-line bg-paper/60 p-3 text-xs">
              {deleteTarget.slice(0, 8).map((student) => (
                <p key={student.id} className="flex justify-between gap-3 py-0.5">
                  <span className="truncate font-semibold">{student.name}</span>
                  <span className="shrink-0 font-mono text-ink-soft">
                    {student.applicationId}
                  </span>
                </p>
              ))}
              {deleteTarget.length > 8 ? (
                <p className="pt-1 text-ink-faint">+{deleteTarget.length - 8} more</p>
              ) : null}
            </div>
          ) : null}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setDeleteTarget(null)}
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
                <>
                  <Trash size={16} weight="bold" />
                  Delete
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {report ? (
        <AdminReport
          ref={reportRef}
          registrations={report.registrations}
          filtersLabel={report.filtersLabel}
          groupBy={report.groupBy}
          generatedAt={report.generatedAt}
        />
      ) : null}
    </div>
  );
}
