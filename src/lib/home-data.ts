import { getPrismaClient, hasDatabaseUrl } from "./prisma";

type HomeGroup = {
  id: string;
  name: string;
  adminId: string;
  adminName: string;
  adminEmail: string;
  eventCount: number;
};

type HomeEvent = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  mapLink: string | null;
  mapEmbed: string | null;
  groupId: string;
  groupAdminId: string;
  groupName: string;
  arrivalDate: string | null;
  departureDate: string | null;
  rsvpCount: number;
  userRsvpStatus: string | null;
};

export type HomePageData = {
  databaseReady: boolean;
  databaseMessage: string | null;
  groups: HomeGroup[];
  events: HomeEvent[];
};

export async function getHomePageData(userId: string): Promise<HomePageData> {
  if (!hasDatabaseUrl()) {
    return {
      databaseReady: false,
      databaseMessage: "DATABASE_URL is not configured in the runtime environment.",
      groups: [],
      events: [],
    };
  }

  try {
    const prisma = getPrismaClient();

    if (!prisma) {
      return {
        databaseReady: false,
        databaseMessage: "DATABASE_URL is not configured in the runtime environment.",
        groups: [],
        events: [],
      };
    }

    const groups = await prisma.group.findMany({
      where: {
        OR: [
          { adminId: userId },
          { invites: { some: { userId, usedAt: { not: null } } } },
        ],
      },
      include: {
        admin: true,
        events: {
          include: {
            _count: {
              select: {
                rsvps: true,
              },
            },
            rsvps: {
              where: { userId },
              select: { status: true },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const serializedGroups: HomeGroup[] = groups.map((group) => ({
      id: group.id,
      name: group.name,
      adminId: group.adminId,
      adminName: group.admin.name || "Unnamed host",
      adminEmail: group.admin.email,
      eventCount: group.events.length,
    }));

    const serializedEvents: HomeEvent[] = groups
      .flatMap((group) =>
        group.events.map((event) => ({
          id: event.id,
          title: event.title,
          description: event.description,
          location: event.location,
          mapLink: event.mapLink,
          mapEmbed: event.mapEmbed,
          groupId: group.id,
          groupAdminId: group.adminId,
          groupName: group.name,
          arrivalDate: event.arrivalDate?.toISOString() || null,
          departureDate: event.departureDate?.toISOString() || null,
          rsvpCount: event._count.rsvps,
          userRsvpStatus: event.rsvps[0]?.status ?? null,
        })),
      )
      .sort((left, right) => {
        if (!left.arrivalDate && !right.arrivalDate) {
          return left.title.localeCompare(right.title);
        }
        if (!left.arrivalDate) return 1;
        if (!right.arrivalDate) return -1;
        return left.arrivalDate.localeCompare(right.arrivalDate);
      });

    return {
      databaseReady: true,
      databaseMessage: null,
      groups: serializedGroups,
      events: serializedEvents,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown database error";

    return {
      databaseReady: false,
      databaseMessage: message,
      groups: [],
      events: [],
    };
  }
}
