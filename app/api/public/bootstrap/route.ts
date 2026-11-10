import { NextResponse } from "next/server";
import { getPublicBootstrap } from "@/lib/students";
import { noStore, routeError } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getPublicBootstrap();
    return noStore(NextResponse.json(data));
  } catch (error) {
    return routeError(error, "public/bootstrap");
  }
}
