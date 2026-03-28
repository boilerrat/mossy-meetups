import { getServerSession } from "next-auth/next";
import type { NextApiRequest, NextApiResponse } from "next";

import { authOptions } from "../../../lib/auth";
import { getPrismaClient, hasDatabaseUrl } from "../../../lib/prisma";
import { parseDate } from "../../../lib/parse-date";
import { withRateLimit } from "../../../lib/rate-limit";

type CreateEventPayload = {
  groupId?: string;
  title?: string;
  description?: string;
  location?: string;
  mapLink?: string;
  mapEmbed?: string;
  arrivalDate?: string;
  departureDate?: string;
};

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

  const payload = req.body as CreateEventPayload;

  if (!payload.groupId?.trim()) {
    return res.status(400).json({ error: "Group is required" });
  }

  if (!payload.title?.trim()) {
    return res.status(400).json({ error: "Event title is required" });
  }

  const arrivalDate = parseDate(payload.arrivalDate);
  const departureDate = parseDate(payload.departureDate);

  try {
    const prisma = getPrismaClient();

    if (!prisma) {
      return res.status(503).json({ error: "DATABASE_URL is not configured" });
    }

    const event = await prisma.event.create({
      data: {
        groupId: payload.groupId.trim(),
        title: payload.title.trim(),
        description: payload.description?.trim() || null,
        location: payload.location?.trim() || null,
        mapLink: payload.mapLink?.trim() || null,
        mapEmbed: payload.mapEmbed?.trim() || null,
        arrivalDate,
        departureDate,
      },
    });

    return res.status(201).json({ event });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create event";
    return res.status(500).json({ error: message });
  }
}

export default withRateLimit(handler);
