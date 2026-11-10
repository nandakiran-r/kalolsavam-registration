import { requireAdmin } from "@/lib/auth";
import { listRegistrations } from "@/lib/students";
import { parseAdminFilters, escapeCsvCell } from "@/lib/filters";
import { routeError } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const filters = parseAdminFilters(new URL(request.url));
    const { registrations } = await listRegistrations(filters);

    const header = [
      "Application ID",
      "Full Name",
      "Roll Number",
      "Association",
      "House",
      "WhatsApp Number",
      "Phone Number",
      "Email",
      "Events",
      "Registered On",
      "Last Updated",
    ];
    const lines = [header.map(escapeCsvCell).join(",")];

    for (const student of registrations) {
      const events = student.events
        .map((event) => `${event.nameMl} / ${event.nameEn}`)
        .join(" | ");
      lines.push(
        [
          student.applicationId,
          student.name,
          student.rollNumber,
          student.associationName,
          `House ${student.house}`,
          student.whatsapp,
          student.phone,
          student.email,
          events,
          new Date(student.createdAt).toLocaleString("en-IN", {
            timeZone: "Asia/Kolkata",
          }),
          new Date(student.updatedAt).toLocaleString("en-IN", {
            timeZone: "Asia/Kolkata",
          }),
        ]
          .map(escapeCsvCell)
          .join(","),
      );
    }

    const csv = `\uFEFF${lines.join("\r\n")}\r\n`;
    const stamp = new Date().toISOString().slice(0, 10);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="Kalolsavam_Registrations_${stamp}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return routeError(error, "admin.export.csv");
  }
}
