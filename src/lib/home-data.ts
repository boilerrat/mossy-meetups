import { getPrismaClient, hasDatabaseUrl } from "./prisma";

type HomeGroup = {
  id: string;
  name: string;
  adminId: string;
  adminName: string;
  adminEmail: string;
  eventCount: number;
};

export type HomeEvent = {
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
  dateProposalCount: number;
  locationOptionCount: number;
};

export type HomePageData = {
  databaseReady: boolean;
  databaseMessage: string | null;
  groups: HomeGroup[];
  upcomingEvents: HomeEvent[];
  tbdEvents: HomeEvent[];
};

export async function getHomePageData(userId: string): Promise<HomePageData> {
  if (!hasDatabaseUrl()) {
    return {
      databaseReady: false,
      databaseMessage: "DATABASE_URL is not configured in the runtime environment.",
      groups: [],
      upcomingEvents: [],
      tbdEvents: [],
    };
  }

  try {
    const prisma = getPrismaClient();

    if (!prisma) {
      return {
        databaseReady: false,
        databaseMessage: "DATABASE_URL is not configured in the runtime environment.",
        groups: [],
        upcomingEvents: [],
        tbdEvents: [],
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
                dateProposals: true,
                locationOptions: true,
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

    const allEvents: HomeEvent[] = groups.flatMap((group) =>
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
        dateProposalCount: event._count.dateProposals,
        locationOptionCount: event._count.locationOptions,
      })),
    );

    const upcomingEvents = allEvents
      .filter((e) => e.arrivalDate !== null)
      .sort((a, b) => a.arrivalDate!.localeCompare(b.arrivalDate!));

    const tbdEvents = allEvents
      .filter((e) => e.arrivalDate === null)
      .sort((a, b) => a.title.localeCompare(b.title));

    return {
      databaseReady: true,
      databaseMessage: null,
      groups: serializedGroups,
      upcomingEvents,
      tbdEvents,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown database error";

    return {
      databaseReady: false,
      databaseMessage: message,
      groups: [],
      upcomingEvents: [],
      tbdEvents: [],
    };
  }
}
