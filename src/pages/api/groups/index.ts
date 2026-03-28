import type { NextApiRequest, NextApiResponse } from "next";

import { getPrismaClient, hasDatabaseUrl } from "../../../lib/prisma";

type CreateGroupPayload = {
  name?: string;
  adminEmail?: string;
  adminName?: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!hasDatabaseUrl()) {
    return res.status(503).json({ error: "DATABASE_URL is not configured" });
  }

  const { name, adminEmail, adminName } = req.body as CreateGroupPayload;

  if (!name?.trim()) {
    return res.status(400).json({ error: "Group name is required" });
  }

  if (!adminEmail?.trim()) {
    return res.status(400).json({ error: "Admin email is required" });
  }

  try {
    const prisma = getPrismaClient();

    if (!prisma) {
      return res.status(503).json({ error: "DATABASE_URL is not configured" });
    }

    const admin = await prisma.user.upsert({
      where: {
        email: adminEmail.trim().toLowerCase(),
      },
      update: {
        name: adminName?.trim() || undefined,
      },
      create: {
        email: adminEmail.trim().toLowerCase(),
        name: adminName?.trim() || null,
      },
    });

    const group = await prisma.group.create({
      data: {
        name: name.trim(),
        adminId: admin.id,
      },
    });

    return res.status(201).json({ group });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create group";
    return res.status(500).json({ error: message });
  }
}
