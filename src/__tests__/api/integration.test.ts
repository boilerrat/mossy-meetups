/**
 * Integration test: create group → create event
 *
 * Uses mocked Prisma to test the full handler call chain without a real DB.
 * Each step asserts that the output of one step feeds correctly into the next.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockReq, mockRes } from "../helpers";

vi.mock("next-auth/next", () => ({ getServerSession: vi.fn() }));
vi.mock("../../lib/prisma", () => ({
  hasDatabaseUrl: vi.fn(),
  getPrismaClient: vi.fn(),
}));
vi.mock("../../lib/rate-limit", () => ({
  withRateLimit: (handler: unknown) => handler,
}));

import { getServerSession } from "next-auth/next";
import { hasDatabaseUrl, getPrismaClient } from "../../lib/prisma";
import groupsHandler from "../../pages/api/groups/index";
import eventsHandler from "../../pages/api/events/index";

const session = { user: { id: "user-1", email: "camp@example.com" } };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getServerSession).mockResolvedValue(session);
  vi.mocked(hasDatabaseUrl).mockReturnValue(true);
});

describe("Create group → create event integration", () => {
  it("creates a group then uses its id to create an event", async () => {
    const createdGroup = { id: "g-integration-1", name: "Festival Crew", adminId: "user-1" };
    const createdEvent = {
      id: "e-integration-1",
      groupId: "g-integration-1",
      title: "Opening Ceremony",
      arrivalDate: null,
    };

    const prisma = {
      group: { create: vi.fn().mockResolvedValue(createdGroup) },
      event: { create: vi.fn().mockResolvedValue(createdEvent) },
    };
    vi.mocked(getPrismaClient).mockReturnValue(prisma as ReturnType<typeof getPrismaClient>);

    // Step 1: create group
    const groupReq = mockReq({ body: { name: "Festival Crew" } });
    const groupRes = mockRes();
    await groupsHandler(groupReq, groupRes);

    expect(groupRes.statusCode).toBe(201);
    const groupBody = groupRes.body as { group: { id: string; name: string } };
    expect(groupBody.group.name).toBe("Festival Crew");

    const groupId = groupBody.group.id;

    // Step 2: create event using the group id from step 1
    const eventReq = mockReq({
      body: { groupId, title: "Opening Ceremony" },
    });
    const eventRes = mockRes();
    await eventsHandler(eventReq, eventRes);

    expect(eventRes.statusCode).toBe(201);
    const eventBody = eventRes.body as { event: { id: string; groupId: string } };
    expect(eventBody.event.groupId).toBe(groupId);

    // Confirm the Prisma calls received the correct data
    expect(prisma.group.create).toHaveBeenCalledWith({
      data: { name: "Festival Crew", adminId: "user-1" },
    });
    expect(prisma.event.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ groupId: "g-integration-1", title: "Opening Ceremony" }),
      }),
    );
  });

  it("aborts event creation when group creation fails", async () => {
    const prisma = {
      group: { create: vi.fn().mockRejectedValue(new Error("unique constraint")) },
      event: { create: vi.fn() },
    };
    vi.mocked(getPrismaClient).mockReturnValue(prisma as ReturnType<typeof getPrismaClient>);

    const groupReq = mockReq({ body: { name: "Duplicate Group" } });
    const groupRes = mockRes();
    await groupsHandler(groupReq, groupRes);

    expect(groupRes.statusCode).toBe(500);
    expect(prisma.event.create).not.toHaveBeenCalled();
  });
});
