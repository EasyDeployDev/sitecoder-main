import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate/edge";
import { PrismaNeon } from "@prisma/adapter-neon";
import { Pool } from "@neondatabase/serverless";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function buildPrismaClient(): PrismaClient {
  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl?.startsWith("prisma+")) {
    const client = new PrismaClient({
      datasourceUrl: databaseUrl,
    }).$extends(withAccelerate());
    return client as unknown as PrismaClient;
  }

  const neon = new Pool({ connectionString: databaseUrl });
  const adapter = new PrismaNeon(neon);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? buildPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export function createPrismaClient(): PrismaClient {
  return prisma;
}

export function getPrisma(): PrismaClient {
  return prisma;
}
