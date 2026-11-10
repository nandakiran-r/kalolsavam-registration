import { NextResponse } from "next/server";
import { noStore, routeError } from "@/lib/http";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const admin = await requireAdmin();
    return noStore(NextResponse.json({ admin }));
  } catch (error) {
    return routeError(error, "admin.me");
  }
}
