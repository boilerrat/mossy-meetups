import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { randomUUID } from "crypto";
import { authOptions } from "../../../lib/auth";
import { getPrismaClient } from "../../../lib/prisma";
import { withRateLimit } from "../../../lib/rate-limit";

type RSVPStatus = "ATTENDING" | "MAYBE" | "NOT_ATTENDING";

const VALID_STATUSES = new Set<RSVPStatus>(["ATTENDING", "MAYBE", "NOT_ATTENDING"]);

async function handler(req: NextApiRequest, res: NextApiResponse) {
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
    select: {
      id: true,
      groupId: true,
      group: {
        select: {
          adminId: true,
        },
      },
    },
  });

  if (!event) {
    return res.status(404).json({ error: "Event not found" });
  }

  const userId = session.user.id;
  const groupId = event.groupId;
  const isGroupAdmin = event.group.adminId === userId;

  // Auto-join: if RSVPing ATTENDING or MAYBE and not already a member, create an invite record
  if (!isGroupAdmin && (status === "ATTENDING" || status === "MAYBE")) {
    const existingMembership = await prisma.invite.findFirst({
      where: { groupId, userId, usedAt: { not: null } },
    });

    if (!existingMembership) {
      await prisma.invite.create({
        data: {
          groupId,
          userId,
          email: session.user.email!,
          token: randomUUID(),
          expiresAt: new Date(),
          usedAt: new Date(),
        },
      });
    }
  }

  const rsvp = await prisma.rSVP.upsert({
    where: { userId_eventId: { userId, eventId } },
    create: { userId, eventId, status: status as RSVPStatus },
    update: { status: status as RSVPStatus },
  });

  return res.status(200).json({ success: true, data: rsvp });
}

export default withRateLimit(handler);
