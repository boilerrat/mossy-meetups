import { getServerSession } from "next-auth/next";
import type { NextApiRequest, NextApiResponse } from "next";

import { authOptions } from "../../../lib/auth";
import { getPrismaClient } from "../../../lib/prisma";
import { resolveEventMembership } from "../../../lib/membership";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
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

  const { dateProposalId } = req.body as { dateProposalId?: string };

  if (!dateProposalId?.trim()) {
    return res.status(400).json({ error: "dateProposalId is required" });
  }

  const proposal = await prisma.dateProposal.findUnique({
    where: { id: dateProposalId },
    select: { id: true, eventId: true },
  });

  if (!proposal) {
    return res.status(404).json({ error: "Proposal not found" });
  }

  const membership = await resolveEventMembership(prisma, proposal.eventId, session.user.id);
  if (!membership || (!membership.isAdmin && !membership.isMember)) {
    return res.status(403).json({ error: "You are not a member of this group" });
  }

  // Toggle: delete-first-then-create pattern (race-condition safe)
  const deleted = await prisma.dateVote.deleteMany({
    where: { dateProposalId, userId: session.user.id },
  });

  if (deleted.count === 0) {
    await prisma.dateVote.create({
      data: { dateProposalId, userId: session.user.id },
    });
    return res.status(200).json({ success: true, data: { voted: true } });
  }

  return res.status(200).json({ success: true, data: { voted: false } });
}
