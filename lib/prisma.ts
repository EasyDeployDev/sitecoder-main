import { PrismaClient } from "@prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";
import { PrismaNeon } from "@prisma/adapter-neon";
import { Pool } from "@neondatabase/serverless";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export function createPrismaClient(): PrismaClient {
  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl?.startsWith("prisma+")) {
    return new PrismaClient({ datasourceUrl: databaseUrl }).$extends(
      withAccelerate(),
    ) as unknown as PrismaClient;
  }

  // Neon serverless driver is only for neon.tech (or explicit opt-in).
  // Standard Postgres (Zerops, local, etc.) uses the default Prisma engine.
  const useNeonAdapter =
    process.env.USE_NEON_ADAPTER === "1" ||
    Boolean(databaseUrl?.includes("neon.tech"));

  if (useNeonAdapter) {
    const neon = new Pool({ connectionString: databaseUrl });
    const adapter = new PrismaNeon(neon);
    return new PrismaClient({ adapter });
  }

  return new PrismaClient({ datasourceUrl: databaseUrl });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export function getPrisma(): PrismaClient {
  return prisma;
}
