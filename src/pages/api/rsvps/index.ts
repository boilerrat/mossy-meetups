import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";
import { getPrismaClient } from "../../../lib/prisma";

type RSVPStatus = "ATTENDING" | "MAYBE" | "NOT_ATTENDING";

const VALID_STATUSES = new Set<RSVPStatus>(["ATTENDING", "MAYBE", "NOT_ATTENDING"]);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { eventId, status } = req.body as { eventId?: string; status?: string };

  if (!eventId || typeof eventId !== "string") {
    return res.status(400).json({ error: "eventId is required" });
  }

  if (!status || !VALID_STATUSES.has(status as RSVPStatus)) {
    return res.status(400).json({ error: "status must be ATTENDING, MAYBE, or NOT_ATTENDING" });
  }

  const prisma = getPrismaClient();
  if (!prisma) {
    return res.status(503).json({ error: "Database unavailable" });
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      group: {
        include: {
          invites: {
            where: { userId: session.user.id, usedAt: { not: null } },
          },
        },
      },
    },
  });

  if (!event) {
    return res.status(404).json({ error: "Event not found" });
  }

  const isGroupAdmin = event.group.adminId === session.user.id;
  const isGroupMember = event.group.invites.length > 0;

  if (!isGroupAdmin && !isGroupMember) {
    return res.status(403).json({ error: "Not a member of this group" });
  }

  const rsvp = await prisma.rSVP.upsert({
    where: { userId_eventId: { userId: session.user.id, eventId } },
    create: { userId: session.user.id, eventId, status: status as RSVPStatus },
    update: { status: status as RSVPStatus },
  });

  return res.status(200).json({ success: true, data: rsvp });
}
