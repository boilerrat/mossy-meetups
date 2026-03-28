import { getServerSession } from "next-auth/next";
import type { NextApiRequest, NextApiResponse } from "next";

import { authOptions } from "../../../lib/auth";
import { getPrismaClient, hasDatabaseUrl } from "../../../lib/prisma";
import { withRateLimit } from "../../../lib/rate-limit";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!hasDatabaseUrl()) {
    return res.status(503).json({ error: "DATABASE_URL is not configured" });
  }

  const { name } = req.body as { name?: string };

  if (!name?.trim()) {
    return res.status(400).json({ error: "Group name is required" });
  }

  try {
    const prisma = getPrismaClient();

    if (!prisma) {
      return res.status(503).json({ error: "DATABASE_URL is not configured" });
    }

    const group = await prisma.group.create({
      data: {
        name: name.trim(),
        adminId: session.user.id,
      },
    });

    return res.status(201).json({ group });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create group";
    return res.status(500).json({ error: message });
  }
}

export default withRateLimit(handler);
