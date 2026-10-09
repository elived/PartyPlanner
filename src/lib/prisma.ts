import { PrismaClient } from "@prisma/client";

/**
 * A single PrismaClient per process. In dev, Next's hot reload re-evaluates
 * modules on every edit, which would otherwise open a new connection pool each
 * time until Postgres refuses new connections — so we stash it on globalThis.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
