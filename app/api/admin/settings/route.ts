import { NextResponse } from "next/server";
import {
  assertSameOrigin,
  noStore,
  parseWith,
  readJson,
  routeError,
} from "@/lib/http";
import { requireAdmin } from "@/lib/auth";
import { getRegistrationOpen, setRegistrationOpen } from "@/lib/students";
import { settingsSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
    return noStore(
      NextResponse.json({ registrationOpen: await getRegistrationOpen() }),
    );
  } catch (error) {
    return routeError(error, "admin.settings.get");
  }
}

export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request);
    const admin = await requireAdmin({ mutate: true });
    const input = parseWith(settingsSchema, await readJson(request));
    await setRegistrationOpen(input.registrationOpen, `admin:${admin.email}`);
    return noStore(
      NextResponse.json({ registrationOpen: input.registrationOpen }),
    );
  } catch (error) {
    return routeError(error, "admin.settings.update");
  }
}
