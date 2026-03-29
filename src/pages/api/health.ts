import type { NextApiRequest, NextApiResponse } from "next";
import { getPrismaClient, hasDatabaseUrl } from "../../lib/prisma";

type HealthResponse = {
  status: "ok" | "degraded";
  database: "connected" | "disconnected" | "unconfigured";
  timestamp: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<HealthResponse>,
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).end();
  }

  if (!hasDatabaseUrl()) {
    return res.status(200).json({
      status: "degraded",
      database: "unconfigured",
      timestamp: new Date().toISOString(),
    });
  }

  let prisma;

  try {
    prisma = getPrismaClient();
  } catch {
    return res.status(200).json({
      status: "degraded",
      database: "disconnected",
      timestamp: new Date().toISOString(),
    });
  }

  if (!prisma) {
    return res.status(200).json({
      status: "degraded",
      database: "unconfigured",
      timestamp: new Date().toISOString(),
    });
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    return res.status(200).json({
      status: "ok",
      database: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch {
    return res.status(200).json({
      status: "degraded",
      database: "disconnected",
      timestamp: new Date().toISOString(),
    });
  }
}
