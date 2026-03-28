import { getServerSession } from "next-auth/next";
import type { NextApiRequest, NextApiResponse } from "next";

import { authOptions } from "../../../lib/auth";
import { getPrismaClient } from "../../../lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "DELETE") {
    res.setHeader("Allow", "DELETE");
    return res.status(405).json({ error: "Method not allowed" });
  }

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
    return res.status(400).json({ error: "Invalid option ID" });
  }

  const option = await prisma.locationOption.findUnique({
    where: { id },
    include: { event: { include: { group: true } } },
  });

  if (!option) {
    return res.status(404).json({ error: "Location option not found" });
  }

  if (option.event.group.adminId !== session.user.id) {
    return res.status(403).json({ error: "Only the group admin can remove location options" });
  }

  await prisma.locationOption.delete({ where: { id } });

  return res.status(200).json({ success: true });
}
