import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// USE_TEST_DB=true (see `npm run dev:test`) swaps in the local SQLite
// mirror (prisma/schema.sqlite.prisma) instead of the real SQL Server —
// for running/testing the whole app when there's no network route to the
// office database. Never set in a real deployment; falls back to the
// normal client if the test client hasn't been generated yet (run
// `npm run db:test:push` first).
function createClient(): PrismaClient {
  if (process.env.USE_TEST_DB === "true") {
    try {
      const testClientPath = "../../node_modules/.prisma/client-test";
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- optional module, only present after `npm run db:test:push`
      const { PrismaClient: TestPrismaClient } = require(testClientPath);
      return new TestPrismaClient() as PrismaClient;
    } catch {
      console.warn("USE_TEST_DB=true but the test client isn't built — run `npm run db:test:push` first. Falling back to the real database.");
    }
  }
  return new PrismaClient();
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
