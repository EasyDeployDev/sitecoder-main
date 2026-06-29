import { PrismaClient } from "@prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";
import { PrismaNeon } from "@prisma/adapter-neon";
import { Pool } from "@neondatabase/serverless";

export function createPrismaClient(): any {
  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl?.startsWith("prisma+")) {
    const client = new PrismaClient({ datasourceUrl: databaseUrl });
    return client.$extends(withAccelerate());
  }

  const neon = new Pool({ connectionString: databaseUrl });
  const adapter = new PrismaNeon(neon);
  return new PrismaClient({ adapter });
}

export function getPrisma(): any {
  return createPrismaClient();
}
