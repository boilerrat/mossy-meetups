import { getServerSession } from "next-auth/next";
import type { NextApiRequest, NextApiResponse } from "next";

import { authOptions } from "../../../lib/auth";
import { getPrismaClient } from "../../../lib/prisma";
import { resolveEventMembership } from "../../../lib/membership";
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

  const prisma = getPrismaClient();
  if (!prisma) {
    return res.status(503).json({ error: "DATABASE_URL is not configured" });
  }

  const { eventId, date } = req.body as { eventId?: string; date?: string };

  if (!eventId?.trim()) {
    return res.status(400).json({ error: "eventId is required" });
  }

  if (!date?.trim()) {
    return res.status(400).json({ error: "date is required" });
  }

  const parsedDate = new Date(date.trim());
  if (Number.isNaN(parsedDate.getTime())) {
    return res.status(400).json({ error: "Invalid date" });
  }

  const membership = await resolveEventMembership(prisma, eventId, session.user.id);
  if (!membership) {
    return res.status(404).json({ error: "Event not found" });
  }
  if (!membership.isAdmin && !membership.isMember) {
    return res.status(403).json({ error: "You are not a member of this group" });
  }
  if (membership.event.arrivalDate !== null) {
    return res.status(409).json({ error: "This event already has a confirmed date" });
  }

  const proposal = await prisma.dateProposal.create({
    data: {
      eventId,
      date: parsedDate,
      createdBy: session.user.id,
    },
  });

  return res.status(201).json({ success: true, data: proposal });
}

export default withRateLimit(handler);
