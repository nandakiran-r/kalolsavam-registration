import { NextResponse } from "next/server";
import {
  assertSameOrigin,
  noStore,
  parseWith,
  readJson,
  routeError,
} from "@/lib/http";
import { requireAdmin } from "@/lib/auth";
import { softDeleteRegistrations } from "@/lib/students";
import { bulkDeleteSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const admin = await requireAdmin({ mutate: true });
    const { ids } = parseWith(bulkDeleteSchema, await readJson(request));
    const deleted = await softDeleteRegistrations(ids, `admin:${admin.email}`);
    return noStore(NextResponse.json({ deleted }));
  } catch (error) {
    return routeError(error, "admin.registrations.bulk-delete");
  }
}
