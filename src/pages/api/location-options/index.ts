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

  const { eventId, name, mapLink, mapEmbed } = req.body as {
    eventId?: string;
    name?: string;
    mapLink?: string;
    mapEmbed?: string;
  };

  if (!eventId?.trim()) {
    return res.status(400).json({ error: "eventId is required" });
  }
  if (!name?.trim()) {
    return res.status(400).json({ error: "Location name is required" });
  }

  const membership = await resolveEventMembership(prisma, eventId, session.user.id);
  if (!membership) {
    return res.status(404).json({ error: "Event not found" });
  }
  if (!membership.isAdmin) {
    return res.status(403).json({ error: "Only the group admin can add location options" });
  }

  // Cap at 4 options per event
  const existing = await prisma.locationOption.count({ where: { eventId } });
  if (existing >= 4) {
    return res.status(409).json({ error: "Maximum 4 location options per event" });
  }

  const option = await prisma.locationOption.create({
    data: {
      eventId,
      name: name.trim(),
      mapLink: mapLink?.trim() || null,
      mapEmbed: mapEmbed?.trim() || null,
      createdBy: session.user.id,
    },
  });

  return res.status(201).json({ success: true, data: option });
}

export default withRateLimit(handler);
