declare global {
  // eslint-disable-next-line no-var
  var prisma: unknown;
}

export function hasDatabaseUrl() {
  return Boolean(process.env.DATABASE_URL);
}

export function getPrismaClient() {
  if (!hasDatabaseUrl()) {
    return null;
  }

  const { PrismaClient } = require("@prisma/client") as typeof import("@prisma/client");
  const prisma = (global.prisma as import("@prisma/client").PrismaClient | undefined) || new PrismaClient();

  if (process.env.NODE_ENV !== "production") {
    global.prisma = prisma;
  }

  return prisma;
}
