import { NextResponse } from "next/server";
import {
  assertSameOrigin,
  noStore,
  parseWith,
  readJson,
  routeError,
} from "@/lib/http";
import { requireAdmin } from "@/lib/auth";
import {
  adminUpdateRegistration,
  getRegistrationById,
  softDeleteRegistrations,
} from "@/lib/students";
import { studentInputSchema } from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;
    const profile = await getRegistrationById(Number(id));
    return noStore(NextResponse.json({ profile }));
  } catch (error) {
    return routeError(error, "admin.registrations.get");
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    assertSameOrigin(request);
    const admin = await requireAdmin({ mutate: true });
    const { id } = await params;
    const input = parseWith(studentInputSchema, await readJson(request));
    const profile = await adminUpdateRegistration(Number(id), input, `admin:${admin.email}`);
    return noStore(NextResponse.json({ profile }));
  } catch (error) {
    return routeError(error, "admin.registrations.update");
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    assertSameOrigin(request);
    const admin = await requireAdmin({ mutate: true });
    const { id } = await params;
    const numericId = Number(id);
    if (!Number.isInteger(numericId) || numericId <= 0) {
      return NextResponse.json({ error: "Invalid registration." }, { status: 400 });
    }
    const deleted = await softDeleteRegistrations([numericId], `admin:${admin.email}`);
    return noStore(NextResponse.json({ deleted }));
  } catch (error) {
    return routeError(error, "admin.registrations.delete");
  }
}
