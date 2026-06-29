import { PrismaClient } from "@prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";
import { PrismaNeon } from "@prisma/adapter-neon";
import { Pool } from "@neondatabase/serverless";
import { cache } from "react";

export function createPrismaClient(): PrismaClient {
  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl?.startsWith("prisma+")) {
    return new PrismaClient({ datasourceUrl: databaseUrl }).$extends(
      withAccelerate(),
    ) as unknown as PrismaClient;
  }

  const neon = new Pool({ connectionString: databaseUrl });
  const adapter = new PrismaNeon(neon);
  return new PrismaClient({ adapter });
}

export const getPrisma = cache(() => createPrismaClient());
