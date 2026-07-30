import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForDatabase = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  postgresPool: Pool | undefined;
};

function createDatabaseClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required to connect to PostgreSQL.");
  }

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  if (process.env.NODE_ENV !== "production") {
    globalForDatabase.postgresPool = pool;
  }

  return prisma;
}

export function getDatabase() {
  const prisma = globalForDatabase.prisma ?? createDatabaseClient();
  if (process.env.NODE_ENV !== "production") {
    globalForDatabase.prisma = prisma;
  }
  return prisma;
}
