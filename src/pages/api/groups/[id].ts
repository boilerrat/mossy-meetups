import { getServerSession } from "next-auth/next";
import type { NextApiRequest, NextApiResponse } from "next";

import { authOptions } from "../../../lib/auth";
import { getPrismaClient } from "../../../lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const prisma = getPrismaClient();
  if (!prisma) {
    return res.status(503).json({ error: "DATABASE_URL is not configured" });
  }

  const { id } = req.query;
  if (typeof id !== "string") {
    return res.status(400).json({ error: "Invalid group ID" });
  }

  const group = await prisma.group.findUnique({ where: { id } });

  if (!group) {
    return res.status(404).json({ error: "Group not found" });
  }

  if (group.adminId !== session.user.id) {
    return res.status(403).json({ error: "Only the group admin can modify this group" });
  }

  if (req.method === "DELETE") {
    await prisma.group.delete({ where: { id } });
    return res.status(200).json({ success: true });
  }

  if (req.method === "PATCH") {
    const { name } = req.body as { name?: string };
    if (!name?.trim()) {
      return res.status(400).json({ error: "Group name is required" });
    }

    const updated = await prisma.group.update({
      where: { id },
      data: { name: name.trim() },
    });

    return res.status(200).json({ success: true, data: updated });
  }

  res.setHeader("Allow", "PATCH, DELETE");
  return res.status(405).json({ error: "Method not allowed" });
}
