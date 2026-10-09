import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Liveness + readiness probe for load balancers, container orchestrators and
 * uptime monitors.
 *
 * It actually touches the database — a process that is up but cannot reach
 * Postgres serves nothing but error pages, and should be taken out of rotation.
 * The response deliberately carries no version, hostname or error detail: this
 * endpoint is unauthenticated and reachable from the internet.
 */
export async function GET() {
  const startedAt = Date.now();

  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json(
      { status: "ok", database: "up", latencyMs: Date.now() - startedAt },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    console.error("[health] database check failed:", error);
    return NextResponse.json(
      { status: "degraded", database: "down" },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }
}
