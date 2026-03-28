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

  const { eventId, locationOptionId } = req.body as {
    eventId?: string;
    locationOptionId?: string;
  };

  if (!eventId?.trim() || !locationOptionId?.trim()) {
    return res.status(400).json({ error: "eventId and locationOptionId are required" });
  }

  const membership = await resolveEventMembership(prisma, eventId, session.user.id);
  if (!membership) {
    return res.status(404).json({ error: "Event not found" });
  }
  if (!membership.isAdmin && !membership.isMember) {
    return res.status(403).json({ error: "You are not a member of this group" });
  }

  // Verify the location option belongs to this event
  const option = await prisma.locationOption.findUnique({
    where: { id: locationOptionId },
    select: { eventId: true },
  });

  if (!option || option.eventId !== eventId) {
    return res.status(400).json({ error: "Location option does not belong to this event" });
  }

  // One vote per user per event — upsert replaces any previous vote
  const vote = await prisma.locationVote.upsert({
    where: { eventId_userId: { eventId, userId: session.user.id } },
    create: { eventId, locationOptionId, userId: session.user.id },
    update: { locationOptionId },
  });

  return res.status(200).json({ success: true, data: vote });
}

export default withRateLimit(handler);
