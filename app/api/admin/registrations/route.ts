import { NextResponse } from "next/server";
import { noStore, routeError } from "@/lib/http";
import { requireAdmin } from "@/lib/auth";
import { listRegistrations } from "@/lib/students";
import { parseAdminFilters } from "@/lib/filters";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const filters = parseAdminFilters(new URL(request.url));
    const data = await listRegistrations(filters);
    return noStore(NextResponse.json(data));
  } catch (error) {
    return routeError(error, "admin.registrations.list");
  }
}
