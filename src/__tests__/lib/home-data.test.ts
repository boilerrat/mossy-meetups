import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../lib/prisma", () => ({
  hasDatabaseUrl: vi.fn(),
  getPrismaClient: vi.fn(),
}));

import { hasDatabaseUrl, getPrismaClient } from "../../lib/prisma";
import { getHomePageData } from "../../lib/home-data";

beforeEach(() => {
  vi.clearAllMocks();
});

const userId = "user-1";

function makeGroup(overrides = {}) {
  return {
    id: "g-1",
    name: "Camp Crew",
    adminId: userId,
    admin: { id: userId, name: "Alex", email: "alex@example.com" },
    events: [],
    ...overrides,
  };
}

function makeEvent(overrides = {}) {
  return {
    id: "e-1",
    title: "Campfire Set",
    description: null,
    location: null,
    mapLink: null,
    mapEmbed: null,
    arrivalDate: new Date("2026-08-01T19:00:00Z"),
    departureDate: null,
    _count: { rsvps: 3, dateProposals: 0, locationOptions: 0 },
    rsvps: [{ status: "ATTENDING" }],
    ...overrides,
  };
}

describe("getHomePageData", () => {
  it("returns databaseReady:false when DATABASE_URL is missing", async () => {
    vi.mocked(hasDatabaseUrl).mockReturnValue(false);
    const result = await getHomePageData(userId);
    expect(result.databaseReady).toBe(false);
    expect(result.databaseMessage).toMatch(/not configured/i);
    expect(result.groups).toEqual([]);
    expect(result.upcomingEvents).toEqual([]);
    expect(result.tbdEvents).toEqual([]);
  });

  it("returns databaseReady:false when getPrismaClient returns null", async () => {
    vi.mocked(hasDatabaseUrl).mockReturnValue(true);
    vi.mocked(getPrismaClient).mockReturnValue(null);
    const result = await getHomePageData(userId);
    expect(result.databaseReady).toBe(false);
  });

  it("returns databaseReady:false when Prisma throws", async () => {
    const prisma = {
      group: { findMany: vi.fn().mockRejectedValue(new Error("DB down")) },
    };
    vi.mocked(hasDatabaseUrl).mockReturnValue(true);
    vi.mocked(getPrismaClient).mockReturnValue(prisma as ReturnType<typeof getPrismaClient>);
    const result = await getHomePageData(userId);
    expect(result.databaseReady).toBe(false);
    expect(result.databaseMessage).toBe("DB down");
  });

  it("returns empty collections when user has no groups", async () => {
    const prisma = { group: { findMany: vi.fn().mockResolvedValue([]) } };
    vi.mocked(hasDatabaseUrl).mockReturnValue(true);
    vi.mocked(getPrismaClient).mockReturnValue(prisma as ReturnType<typeof getPrismaClient>);
    const result = await getHomePageData(userId);
    expect(result.databaseReady).toBe(true);
    expect(result.groups).toEqual([]);
    expect(result.upcomingEvents).toEqual([]);
    expect(result.tbdEvents).toEqual([]);
  });

  it("serializes groups correctly", async () => {
    const group = makeGroup();
    const prisma = { group: { findMany: vi.fn().mockResolvedValue([group]) } };
    vi.mocked(hasDatabaseUrl).mockReturnValue(true);
    vi.mocked(getPrismaClient).mockReturnValue(prisma as ReturnType<typeof getPrismaClient>);
    const result = await getHomePageData(userId);
    expect(result.groups).toHaveLength(1);
    expect(result.groups[0]).toMatchObject({
      id: "g-1",
      name: "Camp Crew",
      adminId: userId,
      adminName: "Alex",
      adminEmail: "alex@example.com",
      eventCount: 0,
    });
  });

  it("falls back to 'Unnamed host' when admin.name is null", async () => {
    const group = makeGroup({ admin: { id: userId, name: null, email: "x@y.com" } });
    const prisma = { group: { findMany: vi.fn().mockResolvedValue([group]) } };
    vi.mocked(hasDatabaseUrl).mockReturnValue(true);
    vi.mocked(getPrismaClient).mockReturnValue(prisma as ReturnType<typeof getPrismaClient>);
    const result = await getHomePageData(userId);
    expect(result.groups[0].adminName).toBe("Unnamed host");
  });

  it("splits events into upcoming and TBD buckets", async () => {
    const upcomingEvent = makeEvent();
    const tbdEvent = makeEvent({ id: "e-2", title: "TBD Festival", arrivalDate: null, rsvps: [] });
    const group = makeGroup({ events: [upcomingEvent, tbdEvent] });
    const prisma = { group: { findMany: vi.fn().mockResolvedValue([group]) } };
    vi.mocked(hasDatabaseUrl).mockReturnValue(true);
    vi.mocked(getPrismaClient).mockReturnValue(prisma as ReturnType<typeof getPrismaClient>);
    const result = await getHomePageData(userId);
    expect(result.upcomingEvents).toHaveLength(1);
    expect(result.upcomingEvents[0].id).toBe("e-1");
    expect(result.tbdEvents).toHaveLength(1);
    expect(result.tbdEvents[0].id).toBe("e-2");
  });

  it("serializes dates as ISO strings in upcoming events", async () => {
    const group = makeGroup({ events: [makeEvent()] });
    const prisma = { group: { findMany: vi.fn().mockResolvedValue([group]) } };
    vi.mocked(hasDatabaseUrl).mockReturnValue(true);
    vi.mocked(getPrismaClient).mockReturnValue(prisma as ReturnType<typeof getPrismaClient>);
    const result = await getHomePageData(userId);
    expect(result.upcomingEvents[0].arrivalDate).toBe("2026-08-01T19:00:00.000Z");
  });

  it("sets userRsvpStatus from the first RSVP record", async () => {
    const group = makeGroup({ events: [makeEvent({ rsvps: [{ status: "MAYBE" }] })] });
    const prisma = { group: { findMany: vi.fn().mockResolvedValue([group]) } };
    vi.mocked(hasDatabaseUrl).mockReturnValue(true);
    vi.mocked(getPrismaClient).mockReturnValue(prisma as ReturnType<typeof getPrismaClient>);
    const result = await getHomePageData(userId);
    expect(result.upcomingEvents[0].userRsvpStatus).toBe("MAYBE");
  });

  it("sets userRsvpStatus to null when user has no RSVP", async () => {
    const group = makeGroup({ events: [makeEvent({ rsvps: [] })] });
    const prisma = { group: { findMany: vi.fn().mockResolvedValue([group]) } };
    vi.mocked(hasDatabaseUrl).mockReturnValue(true);
    vi.mocked(getPrismaClient).mockReturnValue(prisma as ReturnType<typeof getPrismaClient>);
    const result = await getHomePageData(userId);
    expect(result.upcomingEvents[0].userRsvpStatus).toBeNull();
  });

  it("sorts upcoming events by arrivalDate ascending", async () => {
    const later = makeEvent({ id: "e-later", arrivalDate: new Date("2026-09-01T00:00:00Z") });
    const earlier = makeEvent({ id: "e-earlier", arrivalDate: new Date("2026-07-01T00:00:00Z") });
    const group = makeGroup({ events: [later, earlier] });
    const prisma = { group: { findMany: vi.fn().mockResolvedValue([group]) } };
    vi.mocked(hasDatabaseUrl).mockReturnValue(true);
    vi.mocked(getPrismaClient).mockReturnValue(prisma as ReturnType<typeof getPrismaClient>);
    const result = await getHomePageData(userId);
    expect(result.upcomingEvents[0].id).toBe("e-earlier");
    expect(result.upcomingEvents[1].id).toBe("e-later");
  });

  it("sorts TBD events alphabetically by title", async () => {
    const z = makeEvent({ id: "e-z", title: "Zephyr Fest", arrivalDate: null, rsvps: [] });
    const a = makeEvent({ id: "e-a", title: "Acorn Camp", arrivalDate: null, rsvps: [] });
    const group = makeGroup({ events: [z, a] });
    const prisma = { group: { findMany: vi.fn().mockResolvedValue([group]) } };
    vi.mocked(hasDatabaseUrl).mockReturnValue(true);
    vi.mocked(getPrismaClient).mockReturnValue(prisma as ReturnType<typeof getPrismaClient>);
    const result = await getHomePageData(userId);
    expect(result.tbdEvents[0].id).toBe("e-a");
    expect(result.tbdEvents[1].id).toBe("e-z");
  });
});
