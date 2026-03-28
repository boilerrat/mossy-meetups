import type { PrismaClient } from "@prisma/client";

export type MembershipResult = {
  event: { id: string; groupId: string; arrivalDate: Date | null };
  group: { id: string; adminId: string; name: string };
  isAdmin: boolean;
  isMember: boolean;
};

/**
 * Resolves group membership for a given event + user.
 * Returns null if the event doesn't exist.
 * Returns { isAdmin: false, isMember: false } if the user has no access.
 */
export async function resolveEventMembership(
  prisma: PrismaClient,
  eventId: string,
  userId: string
): Promise<MembershipResult | null> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      groupId: true,
      arrivalDate: true,
      group: {
        select: {
          id: true,
          adminId: true,
          name: true,
          invites: {
            where: { userId, usedAt: { not: null } },
            select: { id: true },
          },
        },
      },
    },
  });

  if (!event) return null;

  const isAdmin = event.group.adminId === userId;
  const isMember = event.group.invites.length > 0;

  return {
    event: { id: event.id, groupId: event.groupId, arrivalDate: event.arrivalDate },
    group: { id: event.group.id, adminId: event.group.adminId, name: event.group.name },
    isAdmin,
    isMember,
  };
}
