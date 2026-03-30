import { beforeEach, describe, expect, it, vi } from "vitest";

import { mockReq, mockRes } from "../helpers";

vi.mock("next-auth/next", () => ({ getServerSession: vi.fn() }));
vi.mock("../../lib/prisma", () => ({ getPrismaClient: vi.fn() }));
vi.mock("../../lib/membership", () => ({ resolveEventMembership: vi.fn() }));
vi.mock("../../lib/rate-limit", () => ({
  withRateLimit: (handler: unknown) => handler,
}));

import { getServerSession } from "next-auth/next";
import { resolveEventMembership } from "../../lib/membership";
import { getPrismaClient } from "../../lib/prisma";
import handler from "../../pages/api/events/[id]/comments/[commentId]";

const session = { user: { id: "user-1", email: "camper@example.com" } };
const baseMembership = {
  event: { id: "event-1", groupId: "group-1", arrivalDate: null },
  group: { id: "group-1", adminId: "admin-1", name: "Longpoint Crew" },
  isAdmin: false,
  isMember: true,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PATCH/DELETE /api/events/[id]/comments/[commentId]", () => {
  it("returns 405 for unsupported methods", async () => {
    const req = mockReq({ method: "GET", query: { id: "event-1", commentId: "comment-1" } });
    const res = mockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(405);
  });

  it("returns 404 when the comment does not belong to the event", async () => {
    const prisma = {
      eventComment: {
        findUnique: vi.fn().mockResolvedValue({
          id: "comment-1",
          eventId: "other-event",
          userId: "user-1",
          user: { name: "Alex", email: "camper@example.com" },
        }),
      },
    };
    vi.mocked(getServerSession).mockResolvedValue(session);
    vi.mocked(getPrismaClient).mockReturnValue(prisma as ReturnType<typeof getPrismaClient>);
    vi.mocked(resolveEventMembership).mockResolvedValue(baseMembership);
    const req = mockReq({
      method: "PATCH",
      query: { id: "event-1", commentId: "comment-1" },
      body: { body: "Updated" },
    });
    const res = mockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(404);
  });

  it("returns 403 when a non-author non-admin tries to edit", async () => {
    const prisma = {
      eventComment: {
        findUnique: vi.fn().mockResolvedValue({
          id: "comment-1",
          eventId: "event-1",
          userId: "user-2",
          user: { name: "Chris", email: "chris@example.com" },
        }),
      },
    };
    vi.mocked(getServerSession).mockResolvedValue(session);
    vi.mocked(getPrismaClient).mockReturnValue(prisma as ReturnType<typeof getPrismaClient>);
    vi.mocked(resolveEventMembership).mockResolvedValue(baseMembership);
    const req = mockReq({
      method: "PATCH",
      query: { id: "event-1", commentId: "comment-1" },
      body: { body: "Updated" },
    });
    const res = mockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(403);
  });

  it("allows the author to update their comment", async () => {
    const prisma = {
      eventComment: {
        findUnique: vi.fn().mockResolvedValue({
          id: "comment-1",
          eventId: "event-1",
          userId: "user-1",
          user: { name: "Alex", email: "camper@example.com" },
        }),
        update: vi.fn().mockResolvedValue({
          id: "comment-1",
          body: "Updated plans",
          createdAt: new Date("2026-03-29T12:00:00Z"),
          updatedAt: new Date("2026-03-29T13:00:00Z"),
          userId: "user-1",
          user: { name: "Alex", email: "camper@example.com" },
        }),
      },
    };
    vi.mocked(getServerSession).mockResolvedValue(session);
    vi.mocked(getPrismaClient).mockReturnValue(prisma as ReturnType<typeof getPrismaClient>);
    vi.mocked(resolveEventMembership).mockResolvedValue(baseMembership);
    const req = mockReq({
      method: "PATCH",
      query: { id: "event-1", commentId: "comment-1" },
      body: { body: "  Updated plans  " },
    });
    const res = mockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(prisma.eventComment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { body: "Updated plans" },
      }),
    );
  });

  it("allows the group admin to delete any comment", async () => {
    const prisma = {
      eventComment: {
        findUnique: vi.fn().mockResolvedValue({
          id: "comment-1",
          eventId: "event-1",
          userId: "user-2",
          user: { name: "Chris", email: "chris@example.com" },
        }),
        delete: vi.fn().mockResolvedValue({ id: "comment-1" }),
      },
    };
    vi.mocked(getServerSession).mockResolvedValue(session);
    vi.mocked(getPrismaClient).mockReturnValue(prisma as ReturnType<typeof getPrismaClient>);
    vi.mocked(resolveEventMembership).mockResolvedValue({
      ...baseMembership,
      isAdmin: true,
    });
    const req = mockReq({
      method: "DELETE",
      query: { id: "event-1", commentId: "comment-1" },
    });
    const res = mockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(prisma.eventComment.delete).toHaveBeenCalledWith({ where: { id: "comment-1" } });
  });
});
