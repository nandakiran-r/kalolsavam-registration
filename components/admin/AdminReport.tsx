import { forwardRef, useMemo } from "react";
import {
  COLLEGE_NAME,
  HOUSE_META,
  KALOLSAVAM_YEAR,
  type House,
  type StudentProfile,
} from "@/lib/constants";
import type { GroupMode } from "@/lib/types";

type ReportRow =
  | { kind: "student"; student: StudentProfile }
  | { kind: "group"; label: string; sublabel: string; count: number };

type Page = { rows: ReportRow[]; number: number };

const FIRST_PAGE_ROWS = 14;
const NEXT_PAGE_ROWS = 20;

function buildPages(
  students: StudentProfile[],
  groupBy: GroupMode,
): Page[] {
  const rows: ReportRow[] = [];

  if (groupBy === "none") {
    for (const student of students) rows.push({ kind: "student", student });
  } else if (groupBy === "house") {
    for (const house of ["A", "B", "C", "D"] as House[]) {
      const group = students.filter((student) => student.house === house);
      if (!group.length) continue;
      rows.push({
        kind: "group",
        label: `House ${house}`,
        sublabel: `${group.length} registration${group.length === 1 ? "" : "s"}`,
        count: group.length,
      });
      for (const student of group) rows.push({ kind: "student", student });
    }
  } else if (groupBy === "association") {
    const map = new Map<string, StudentProfile[]>();
    for (const student of students) {
      const list = map.get(student.associationName) ?? [];
      list.push(student);
      map.set(student.associationName, list);
    }
    for (const [name, group] of [...map.entries()].sort((a, b) =>
      a[0].localeCompare(b[0]),
    )) {
      rows.push({
        kind: "group",
        label: name,
        sublabel: `House ${group[0]!.house} · ${group.length} registration${group.length === 1 ? "" : "s"}`,
        count: group.length,
      });
      for (const student of group) rows.push({ kind: "student", student });
    }
  } else {
    const map = new Map<
      number,
      { label: string; sublabel: string; students: StudentProfile[] }
    >();
    for (const student of students) {
      for (const event of student.events) {
        const entry = map.get(event.id) ?? {
          label: event.nameMl,
          sublabel: event.nameEn,
          students: [],
        };
        entry.students.push(student);
        map.set(event.id, entry);
      }
    }
    for (const entry of map.values()) {
      rows.push({
        kind: "group",
        label: entry.label,
        sublabel: `${entry.sublabel} · ${entry.students.length} registration${entry.students.length === 1 ? "" : "s"}`,
        count: entry.students.length,
      });
      for (const student of entry.students)
        rows.push({ kind: "student", student });
    }
  }

  const pages: Page[] = [];
  let current: ReportRow[] = [];
  let capacity = FIRST_PAGE_ROWS;

  for (const row of rows) {
    if (
      current.length >= capacity ||
      (row.kind === "group" && current.length >= capacity - 1)
    ) {
      pages.push({ rows: current, number: pages.length + 1 });
      current = [];
      capacity = NEXT_PAGE_ROWS;
    }
    current.push(row);
  }
  if (current.length) pages.push({ rows: current, number: pages.length + 1 });
  if (!pages.length) pages.push({ rows: [], number: 1 });
  return pages;
}

function ReportPage({
  page,
  totalPages,
  students,
  filtersLabel,
  groupBy,
  generatedAt,
}: {
  page: Page;
  totalPages: number;
  students: StudentProfile[];
  filtersLabel: string;
  groupBy: GroupMode;
  generatedAt: Date;
}) {
  const houseCounts = (["A", "B", "C", "D"] as House[]).map((house) => ({
    house,
    count: students.filter((student) => student.house === house).length,
  }));
  const eventCounts = useMemo(() => {
    const map = new Map<number, { nameMl: string; nameEn: string; count: number }>();
    for (const student of students) {
      for (const event of student.events) {
        const entry =
          map.get(event.id) ??
          ({ nameMl: event.nameMl, nameEn: event.nameEn, count: 0 } as const);
        map.set(event.id, { ...entry, count: entry.count + 1 });
      }
    }
    return [...map.values()].sort((a, b) => b.count - a.count).slice(0, 5);
  }, [students]);

  return (
    <div
      data-report-page
      className="flex h-[794px] w-[1123px] flex-col overflow-hidden bg-white px-[34px] py-[26px] text-[#111]"
      style={{ fontFamily: "var(--font-manrope), Arial, sans-serif" }}
    >
      <header className="flex items-start justify-between gap-8 border-b-[2.5px] border-black pb-3">
        <div>
          <p className="text-[8.5px] font-bold uppercase tracking-[0.2em]">
            {COLLEGE_NAME}
          </p>
          <h1 className="mt-1 text-[24px] font-extrabold leading-none tracking-[-0.02em]">
            Kalolsavam {KALOLSAVAM_YEAR} · Registration Report
          </h1>
          <p className="mt-1 text-[9px] text-[#555]">
            <span className="font-malayalam">കലോത്സവം {KALOLSAVAM_YEAR}</span>
            {" · "}
            {filtersLabel}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-[#555]">
            Exported
          </p>
          <p className="mt-0.5 text-[10px] font-semibold">
            {generatedAt.toLocaleString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              timeZone: "Asia/Kolkata",
            })}
          </p>
          <p className="mt-1 text-[8px] text-[#666]">
            Page {page.number} of {totalPages}
          </p>
        </div>
      </header>

      {page.number === 1 ? (
        <div className="mt-3 grid grid-cols-[1.1fr_1fr_1.6fr] gap-3">
          <div className="border border-[#bbb] px-3 py-2">
            <p className="text-[7.5px] font-bold uppercase tracking-[0.14em] text-[#666]">
              Total registrations
            </p>
            <p className="mt-0.5 text-[22px] font-extrabold leading-none">
              {students.length}
            </p>
          </div>
          <div className="border border-[#bbb] px-3 py-2">
            <p className="text-[7.5px] font-bold uppercase tracking-[0.14em] text-[#666]">
              By house
            </p>
            <div className="mt-1 flex flex-wrap gap-1">
              {houseCounts.map(({ house, count }) => (
                <span
                  key={house}
                  className="border px-1.5 py-0.5 text-[8px] font-bold"
                  style={{
                    borderColor: HOUSE_META[house].hex,
                    color: HOUSE_META[house].text,
                    backgroundColor: HOUSE_META[house].tint,
                  }}
                >
                  {house}: {count}
                </span>
              ))}
            </div>
          </div>
          <div className="border border-[#bbb] px-3 py-2">
            <p className="text-[7.5px] font-bold uppercase tracking-[0.14em] text-[#666]">
              By event
            </p>
            <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5">
              {eventCounts.map((event) => (
                <p key={event.nameEn} className="truncate text-[8px]">
                  <span className="font-semibold">{event.nameEn}</span>
                  <span className="text-[#555]"> · {event.count}</span>
                </p>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <div className="mt-3 min-h-0 flex-1">
        <table className="w-full table-fixed border-collapse text-[9px] leading-tight">
          <colgroup>
            <col style={{ width: "4%" }} />
            <col style={{ width: "9%" }} />
            <col style={{ width: "14%" }} />
            <col style={{ width: "7%" }} />
            <col style={{ width: "17%" }} />
            <col style={{ width: "4.5%" }} />
            <col style={{ width: "8%" }} />
            <col style={{ width: "15%" }} />
            <col style={{ width: "21.5%" }} />
          </colgroup>
          <thead>
            <tr className="bg-[#eee] text-left text-[7.5px] font-bold uppercase tracking-[0.06em]">
              <th className="border border-[#999] px-1 py-1.5">#</th>
              <th className="border border-[#999] px-1 py-1.5">App ID</th>
              <th className="border border-[#999] px-1 py-1.5">Name</th>
              <th className="border border-[#999] px-1 py-1.5">Roll No</th>
              <th className="border border-[#999] px-1 py-1.5">Association</th>
              <th className="border border-[#999] px-1 py-1.5">House</th>
              <th className="border border-[#999] px-1 py-1.5">WhatsApp</th>
              <th className="border border-[#999] px-1 py-1.5">Email</th>
              <th className="border border-[#999] px-1 py-1.5">Events</th>
            </tr>
          </thead>
          <tbody>
            {page.rows.map((row, index) => {
              if (row.kind === "group") {
                return (
                  <tr key={`g-${index}`} className="bg-[#f4f4f4]">
                    <td
                      colSpan={9}
                      className="border border-[#999] px-2 py-1 text-[9px] font-extrabold"
                    >
                      <span className="font-malayalam">{row.label}</span>
                      <span className="ml-2 font-normal text-[#555]">
                        {row.sublabel}
                      </span>
                    </td>
                  </tr>
                );
              }
              const student = row.student;
              return (
                <tr key={student.id} className={index % 2 ? "bg-[#fafafa]" : ""}>
                  <td className="truncate border border-[#aaa] px-1 py-1 text-[#666]">
                    {index + 1}
                  </td>
                  <td className="truncate border border-[#aaa] px-1 py-1 font-mono text-[8px] font-semibold">
                    {student.applicationId}
                  </td>
                  <td className="truncate border border-[#aaa] px-1 py-1 font-semibold">
                    {student.name}
                  </td>
                  <td className="truncate border border-[#aaa] px-1 py-1 font-mono text-[8px]">
                    {student.rollNumber}
                  </td>
                  <td className="truncate border border-[#aaa] px-1 py-1">
                    {student.associationName}
                  </td>
                  <td className="truncate border border-[#aaa] px-1 py-1 text-center font-bold">
                    {student.house}
                  </td>
                  <td className="truncate border border-[#aaa] px-1 py-1 font-mono text-[8px]">
                    {student.whatsapp}
                  </td>
                  <td className="truncate border border-[#aaa] px-1 py-1 text-[8px]">
                    {student.email}
                  </td>
                  <td className="border border-[#aaa] px-1 py-1">
                    <p className="truncate font-malayalam">
                      {student.events.map((event) => event.nameMl).join(" · ")}
                    </p>
                    <p className="truncate text-[7.5px] text-[#555]">
                      {student.events.map((event) => event.nameEn).join(" · ")}
                    </p>
                  </td>
                </tr>
              );
            })}
            {!page.rows.length ? (
              <tr>
                <td
                  colSpan={9}
                  className="border border-[#aaa] px-2 py-8 text-center text-[10px] text-[#666]"
                >
                  No registrations match the current filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <footer className="mt-2 flex items-center justify-between border-t border-[#999] pt-1.5 text-[7.5px] text-[#666]">
        <span>
          {groupBy === "none"
            ? "All registrations"
            : `Grouped by ${groupBy}`}{" "}
          · Generated from the Kalolsavam administration panel
        </span>
        <span>
          Page {page.number} · {students.length} total
        </span>
      </footer>
    </div>
  );
}

export const AdminReport = forwardRef<
  HTMLDivElement,
  {
    registrations: StudentProfile[];
    filtersLabel: string;
    groupBy: GroupMode;
    generatedAt: Date;
  }
>(function AdminReport(
  { registrations, filtersLabel, groupBy, generatedAt },
  ref,
) {
  const pages = useMemo(
    () => buildPages(registrations, groupBy),
    [registrations, groupBy],
  );

  return (
    <div ref={ref} className="pdf-stage">
      <div className="flex flex-col gap-4">
        {pages.map((page) => (
          <ReportPage
            key={page.number}
            page={page}
            totalPages={pages.length}
            students={registrations}
            filtersLabel={filtersLabel}
            groupBy={groupBy}
            generatedAt={generatedAt}
          />
        ))}
      </div>
    </div>
  );
});

export type { GroupMode };
