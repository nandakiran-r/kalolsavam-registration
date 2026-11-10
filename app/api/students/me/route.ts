import { NextResponse } from "next/server";
import {
  getProfileByCredentials,
  updateRegistration,
} from "@/lib/students";
import {
  getClientIp,
  noStore,
  parseWith,
  readJson,
  routeError,
} from "@/lib/http";
import { enforceRateLimit } from "@/lib/rate-limit";
import { lookupSchema, studentInputSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    await enforceRateLimit(`lookup:ip:${ip}`, 120, 60);
    const { applicationId, token } = parseWith(
      lookupSchema,
      await readJson(request),
    );
    const profile = await getProfileByCredentials(applicationId, token);
    return noStore(NextResponse.json({ profile }));
  } catch (error) {
    return routeError(error, "students.me.lookup");
  }
}

export async function PATCH(request: Request) {
  try {
    const ip = getClientIp(request);
    await enforceRateLimit(`edit:ip:${ip}`, 30, 60);
    const body = parseWith(
      lookupSchema.extend({ student: studentInputSchema }).strict(),
      await readJson(request),
    );
    const profile = await updateRegistration(
      body.applicationId,
      body.token,
      body.student,
    );
    return noStore(NextResponse.json({ profile }));
  } catch (error) {
    return routeError(error, "students.me.update");
  }
}
