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
  dateOption1?: string;
  dateOption2?: string;
  dateOption3?: string;
};

function parseDateOptions(payload: UpdateEventPayload) {
  return [payload.dateOption1, payload.dateOption2, payload.dateOption3]
    .map((v) => v?.trim())
    .filter(Boolean)
    .map((v) => new Date(v as string))
    .filter((d) => !Number.isNaN(d.getTime()));
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

    if (!payload.title?.trim()) {
      return res.status(400).json({ error: "Event title is required" });
    }

    const dateOptions = parseDateOptions(payload);
    if (dateOptions.length === 0) {
      return res.status(400).json({ error: "At least one valid date option is required" });
    }

    const updated = await prisma.event.update({
      where: { id },
      data: {
        title: payload.title.trim(),
        description: payload.description?.trim() || null,
        location: payload.location?.trim() || null,
        mapLink: payload.mapLink?.trim() || null,
        mapEmbed: payload.mapEmbed?.trim() || null,
        dateOptions: {
          deleteMany: {},
          create: dateOptions.map((date) => ({ date })),
        },
      },
      include: { dateOptions: true },
    });

    return res.status(200).json({ success: true, data: updated });
  }

  res.setHeader("Allow", "PATCH, DELETE");
  return res.status(405).json({ error: "Method not allowed" });
}
