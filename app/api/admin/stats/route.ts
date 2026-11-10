import { NextResponse } from "next/server";
import { noStore, routeError } from "@/lib/http";
import { requireAdmin } from "@/lib/auth";
import { getStats } from "@/lib/students";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
    return noStore(NextResponse.json(await getStats()));
  } catch (error) {
    return routeError(error, "admin.stats");
  }
}
