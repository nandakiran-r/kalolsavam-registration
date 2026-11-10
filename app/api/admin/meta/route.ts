import { NextResponse } from "next/server";
import { noStore, routeError } from "@/lib/http";
import { requireAdmin } from "@/lib/auth";
import { getAdminRegistrationsMeta } from "@/lib/students";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
    const meta = await getAdminRegistrationsMeta();
    return noStore(NextResponse.json(meta));
  } catch (error) {
    return routeError(error, "admin.meta");
  }
}
