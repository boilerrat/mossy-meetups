import { getServerSession } from "next-auth/next";
import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthOptions } from "../../../../../lib/auth";
import { resolveEventMembership } from "../../../../../lib/membership";
import { getPrismaClient } from "../../../../../lib/prisma";
import { withRateLimit } from "../../../../../lib/rate-limit";

function serializeComment(comment: {
  id: string;
  body: string;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  user: { name: string | null; email: string };
}) {
  return {
    id: comment.id,
    body: comment.body,
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
    authorId: comment.userId,
    authorName: comment.user.name || comment.user.email,
    authorEmail: comment.user.email,
  };
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const session = await getServerSession(req, res, getAuthOptions());
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
    return res.status(403).json({ error: "You are not a member of this group" });
  }

  if (req.method === "GET") {
    const comments = await prisma.eventComment.findMany({
      where: { eventId: id },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return res.status(200).json({
      success: true,
      data: comments.map(serializeComment),
    });
  }

  const { body } = req.body as { body?: string };
  if (!body?.trim()) {
    return res.status(400).json({ error: "Comment body is required" });
  }

  if (body.trim().length > 1200) {
    return res.status(400).json({ error: "Comment body must be 1200 characters or fewer" });
  }

  const comment = await prisma.eventComment.create({
    data: {
      eventId: id,
      userId: session.user.id,
      body: body.trim(),
    },
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  return res.status(201).json({ success: true, data: serializeComment(comment) });
}

export default withRateLimit(handler);
