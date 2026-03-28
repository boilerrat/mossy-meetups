import { getServerSession } from "next-auth/next";
import type { NextApiRequest, NextApiResponse } from "next";

import { authOptions } from "../../../lib/auth";
import { getPrismaClient, hasDatabaseUrl } from "../../../lib/prisma";

type CreateEventPayload = {
  groupId?: string;
  title?: string;
  description?: string;
  location?: string;
  mapLink?: string;
  mapEmbed?: string;
  dateOption1?: string;
  dateOption2?: string;
  dateOption3?: string;
};

function parseDateOptions(payload: CreateEventPayload) {
  return [payload.dateOption1, payload.dateOption2, payload.dateOption3]
    .map((value) => value?.trim())
    .filter(Boolean)
    .map((value) => new Date(value as string))
    .filter((date) => !Number.isNaN(date.getTime()));
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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
  const dateOptions = parseDateOptions(payload);

  if (!payload.groupId?.trim()) {
    return res.status(400).json({ error: "Group is required" });
  }

  if (!payload.title?.trim()) {
    return res.status(400).json({ error: "Event title is required" });
  }

  if (dateOptions.length === 0) {
    return res.status(400).json({ error: "At least one valid date option is required" });
  }

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
        dateOptions: {
          create: dateOptions.map((date) => ({ date })),
        },
      },
      include: {
        dateOptions: true,
      },
    });

    return res.status(201).json({ event });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create event";
    return res.status(500).json({ error: message });
  }
}
