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
  nextDate: string | null;
  dateOptions: string[];
  rsvpCount: number;
};

export type HomePageData = {
  databaseReady: boolean;
  databaseMessage: string | null;
  groups: HomeGroup[];
  events: HomeEvent[];
};

export async function getHomePageData(): Promise<HomePageData> {
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
      include: {
        admin: true,
        events: {
          include: {
            dateOptions: {
              orderBy: {
                date: "asc",
              },
            },
            _count: {
              select: {
                rsvps: true,
              },
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
          nextDate: event.dateOptions[0]?.date.toISOString() || null,
          dateOptions: event.dateOptions.map((option) => option.date.toISOString()),
          rsvpCount: event._count.rsvps,
        })),
      )
      .sort((left, right) => {
        if (!left.nextDate && !right.nextDate) {
          return left.title.localeCompare(right.title);
        }

        if (!left.nextDate) {
          return 1;
        }

        if (!right.nextDate) {
          return -1;
        }

        return left.nextDate.localeCompare(right.nextDate);
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
