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
    return res.status(400).json({ error: "Invalid proposal ID" });
  }

  const proposal = await prisma.dateProposal.findUnique({
    where: { id },
    include: { event: { include: { group: true } } },
  });

  if (!proposal) {
    return res.status(404).json({ error: "Proposal not found" });
  }

  const isCreator = proposal.createdBy === session.user.id;
  const isAdmin = proposal.event.group.adminId === session.user.id;

  if (!isCreator && !isAdmin) {
    return res.status(403).json({ error: "Forbidden" });
  }

  await prisma.dateProposal.delete({ where: { id } });

  return res.status(200).json({ success: true });
}
