import { NextResponse } from "next/server";
import { createRegistration, getRegistrationOpen } from "@/lib/students";
import { getClientIp, noStore, parseWith, readJson, routeError } from "@/lib/http";
import { enforceRateLimit } from "@/lib/rate-limit";
import { registrationSchema } from "@/lib/validation";
import { AppError } from "@/lib/errors";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    await enforceRateLimit(`register:ip:${ip}`, 10, 60 * 60);

    if (!(await getRegistrationOpen())) {
      throw new AppError(
        "Registration is currently closed. Please contact the Kalolsavam office.",
        403,
        { code: "REGISTRATION_CLOSED" },
      );
    }

    const body = parseWith(registrationSchema, await readJson(request));
    const { website, ...input } = body;
    if (website) {
      // Honeypot: bots fill hidden fields. Give a generic rejection.
      throw new AppError("Invalid submission.", 400, { code: "BOT" });
    }

    const result = await createRegistration(input);
    return noStore(
      NextResponse.json(
        {
          profile: result.profile,
          editToken: result.editToken,
        },
        { status: 201 },
      ),
    );
  } catch (error) {
    return routeError(error, "students.create");
  }
}
