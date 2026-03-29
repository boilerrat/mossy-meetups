import { getServerSession } from "next-auth/next";
import type { NextApiRequest, NextApiResponse } from "next";

import { authOptions } from "../../../lib/auth";
import { getPrismaClient } from "../../../lib/prisma";

type UpdateEventPayload = {
  title?: string;
  description?: string;
  location?: string;
  mapLink?: string;
  mapEmbed?: string;
  arrivalDate?: string;
  nights?: number | string;
  isPotluck?: boolean;
};

function parseDate(value?: string): Date | null {
  if (!value?.trim()) return null;
  const date = new Date(value.trim());
  return Number.isNaN(date.getTime()) ? null : date;
}

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
    return res.status(400).json({ error: "Invalid event ID" });
  }

  const event = await prisma.event.findUnique({
    where: { id },
    include: { group: true },
  });

  if (!event) {
    return res.status(404).json({ error: "Event not found" });
  }

  if (event.group.adminId !== session.user.id) {
    return res.status(403).json({ error: "Only the group admin can modify this event" });
  }

  if (req.method === "DELETE") {
    await prisma.event.delete({ where: { id } });
    return res.status(200).json({ success: true });
  }

  if (req.method === "PATCH") {
    const payload = req.body as UpdateEventPayload;

    // title is only required if it's being explicitly set (full edit form)
    if ("title" in payload && !payload.title?.trim()) {
      return res.status(400).json({ error: "Event title is required" });
    }

    // Build a partial update — only include fields present in the payload
    const data: Record<string, unknown> = {};

    if ("title" in payload) data.title = payload.title!.trim();
    if ("description" in payload) data.description = payload.description?.trim() || null;
    if ("location" in payload) data.location = payload.location?.trim() || null;
    if ("mapLink" in payload) data.mapLink = payload.mapLink?.trim() || null;
    if ("mapEmbed" in payload) data.mapEmbed = payload.mapEmbed?.trim() || null;
    if ("isPotluck" in payload) data.isPotluck = Boolean(payload.isPotluck);

    if ("arrivalDate" in payload || "nights" in payload) {
      const nights = payload.nights ? parseInt(String(payload.nights), 10) : null;
      const arrivalDate = "arrivalDate" in payload ? parseDate(payload.arrivalDate) : undefined;

      if ("nights" in payload) {
        data.nights = nights && nights > 0 ? nights : null;
      }
      if ("arrivalDate" in payload) {
        data.arrivalDate = arrivalDate ?? null;
      }

      // Recalculate departureDate whenever either arrivalDate or nights changes
      const effectiveArrival = arrivalDate ?? null;
      const effectiveNights = nights && nights > 0 ? nights : null;
      if (effectiveArrival && effectiveNights) {
        data.departureDate = new Date(
          effectiveArrival.getTime() + effectiveNights * 24 * 60 * 60 * 1000
        );
      } else if ("arrivalDate" in payload || "nights" in payload) {
        data.departureDate = null;
      }
    }

    const updated = await prisma.event.update({ where: { id }, data });

    return res.status(200).json({ success: true, data: updated });
  }

  res.setHeader("Allow", "PATCH, DELETE");
  return res.status(405).json({ error: "Method not allowed" });
}
