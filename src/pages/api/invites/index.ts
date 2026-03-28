import crypto from "crypto";
import { getServerSession } from "next-auth/next";
import type { NextApiRequest, NextApiResponse } from "next";

import { authOptions } from "../../../lib/auth";
import { getPrismaClient } from "../../../lib/prisma";
import { sendInviteEmail } from "../../../lib/email";
import { withRateLimit } from "../../../lib/rate-limit";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

  const { groupId, email } = req.body as { groupId?: string; email?: string };

  if (!groupId?.trim()) {
    return res.status(400).json({ error: "Group ID is required" });
  }

  const normalizedEmail = email?.trim().toLowerCase();
  if (!normalizedEmail || !EMAIL_RE.test(normalizedEmail)) {
    return res.status(400).json({ error: "Valid email address is required" });
  }

  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group) {
    return res.status(404).json({ error: "Group not found" });
  }

  if (group.adminId !== session.user.id) {
    return res.status(403).json({ error: "Only the group admin can send invites" });
  }

  // Check if this email is already an active member
  const existing = await prisma.invite.findFirst({
    where: { groupId, email: normalizedEmail, usedAt: { not: null } },
  });
  if (existing) {
    return res.status(409).json({ error: "This person is already a member of the group" });
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const invite = await prisma.invite.create({
    data: { groupId, email: normalizedEmail, token, expiresAt },
  });

  const inviteUrl = `${process.env.NEXTAUTH_URL}/join/${token}`;

  try {
    await sendInviteEmail({ to: normalizedEmail, groupName: group.name, inviteUrl });
  } catch {
    await prisma.invite.delete({ where: { id: invite.id } });
    return res.status(500).json({ error: "Failed to send invite email. Check EMAIL_SERVER config." });
  }

  return res.status(201).json({ success: true, data: { inviteId: invite.id } });
}

export default withRateLimit(handler, { limit: 10, windowMs: 60_000 });
