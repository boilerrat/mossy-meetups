import { getServerSession } from "next-auth/next";
import type { NextApiRequest, NextApiResponse } from "next";

import { authOptions } from "../../../../lib/auth";
import { getPrismaClient } from "../../../../lib/prisma";
import { resolveEventMembership } from "../../../../lib/membership";

function icsDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function icsEscape(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

/** Fold lines to max 75 octets per RFC 5545 */
function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const chunks: string[] = [];
  let i = 0;
  chunks.push(line.slice(0, 75));
  i = 75;
  while (i < line.length) {
    chunks.push(" " + line.slice(i, i + 74));
    i += 74;
  }
  return chunks.join("\r\n");
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
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
    return res.status(400).json({ error: "Invalid event ID" });
  }

  const membership = await resolveEventMembership(prisma, id, session.user.id);
  if (!membership) {
    return res.status(404).json({ error: "Event not found" });
  }
  if (!membership.isAdmin && !membership.isMember) {
    return res.status(403).json({ error: "Forbidden" });
  }
  if (!membership.event.arrivalDate) {
    return res.status(400).json({ error: "Event does not have a confirmed date yet" });
  }

  const event = await prisma.event.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      description: true,
      location: true,
      mapLink: true,
      arrivalDate: true,
      departureDate: true,
    },
  });

  if (!event || !event.arrivalDate) {
    return res.status(404).json({ error: "Event not found" });
  }

  const now = new Date();
  const dtEnd = event.departureDate ?? new Date(event.arrivalDate.getTime() + 86400000);

  const slug = event.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const filename = `${slug || "event"}.ics`;

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Mossy Meetups//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.id}@moss.boilerhaus.org`,
    `DTSTAMP:${icsDate(now)}`,
    `DTSTART:${icsDate(event.arrivalDate)}`,
    `DTEND:${icsDate(dtEnd)}`,
    `SUMMARY:${icsEscape(event.title)}`,
    event.description ? `DESCRIPTION:${icsEscape(event.description)}` : null,
    event.location ? `LOCATION:${icsEscape(event.location)}` : null,
    event.mapLink ? `URL:${event.mapLink}` : null,
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .map((l) => foldLine(l as string))
    .join("\r\n");

  res.setHeader("Content-Type", "text/calendar; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  return res.status(200).send(lines);
}
