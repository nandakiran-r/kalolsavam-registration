import { NextResponse } from "next/server";
import { assertSameOrigin, noStore, routeError } from "@/lib/http";
import { clearSessionCookie } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await clearSessionCookie();
    return noStore(NextResponse.json({ ok: true }));
  } catch (error) {
    return routeError(error, "admin.logout");
  }
}
