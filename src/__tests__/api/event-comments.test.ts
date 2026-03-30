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
import handler from "../../pages/api/events/[id]/comments/index";

const session = { user: { id: "user-1", email: "camper@example.com" } };
const membership = {
  event: { id: "event-1", groupId: "group-1", arrivalDate: null },
  group: { id: "group-1", adminId: "admin-1", name: "Longpoint Crew" },
  isAdmin: false,
  isMember: true,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET/POST /api/events/[id]/comments", () => {
  it("returns 405 for unsupported methods", async () => {
    const req = mockReq({ method: "PUT", query: { id: "event-1" } });
    const res = mockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(405);
    expect(res.setHeader).toHaveBeenCalledWith("Allow", "GET, POST");
  });

  it("returns 401 when no session exists", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const req = mockReq({ method: "GET", query: { id: "event-1" } });
    const res = mockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(401);
  });

  it("returns 503 when Prisma is unavailable", async () => {
    vi.mocked(getServerSession).mockResolvedValue(session);
    vi.mocked(getPrismaClient).mockReturnValue(null);
    const req = mockReq({ method: "GET", query: { id: "event-1" } });
    const res = mockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(503);
  });

  it("returns 403 when the user is not a member", async () => {
    vi.mocked(getServerSession).mockResolvedValue(session);
    vi.mocked(getPrismaClient).mockReturnValue({} as ReturnType<typeof getPrismaClient>);
    vi.mocked(resolveEventMembership).mockResolvedValue({
      ...membership,
      isMember: false,
      isAdmin: false,
    });
    const req = mockReq({ method: "GET", query: { id: "event-1" } });
    const res = mockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(403);
  });

  it("returns serialized comments for members", async () => {
    const comments = [
      {
        id: "comment-1",
        body: "Bring lanterns.",
        createdAt: new Date("2026-03-29T12:00:00Z"),
        updatedAt: new Date("2026-03-29T12:00:00Z"),
        userId: "user-2",
        user: { name: "Chris", email: "chris@example.com" },
      },
    ];
    const prisma = {
      eventComment: { findMany: vi.fn().mockResolvedValue(comments) },
    };
    vi.mocked(getServerSession).mockResolvedValue(session);
    vi.mocked(getPrismaClient).mockReturnValue(prisma as ReturnType<typeof getPrismaClient>);
    vi.mocked(resolveEventMembership).mockResolvedValue(membership);
    const req = mockReq({ method: "GET", query: { id: "event-1" } });
    const res = mockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      success: true,
      data: [
        {
          id: "comment-1",
          authorName: "Chris",
          authorEmail: "chris@example.com",
          authorId: "user-2",
        },
      ],
    });
  });

  it("returns 400 when a posted comment body is empty", async () => {
    vi.mocked(getServerSession).mockResolvedValue(session);
    vi.mocked(getPrismaClient).mockReturnValue({} as ReturnType<typeof getPrismaClient>);
    vi.mocked(resolveEventMembership).mockResolvedValue(membership);
    const req = mockReq({
      method: "POST",
      query: { id: "event-1" },
      body: { body: "   " },
    });
    const res = mockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
  });

  it("creates a comment for an event member", async () => {
    const prisma = {
      eventComment: {
        create: vi.fn().mockResolvedValue({
          id: "comment-1",
          body: "I can bring coffee.",
          createdAt: new Date("2026-03-29T12:00:00Z"),
          updatedAt: new Date("2026-03-29T12:00:00Z"),
          userId: "user-1",
          user: { name: "Alex", email: "camper@example.com" },
        }),
      },
    };
    vi.mocked(getServerSession).mockResolvedValue(session);
    vi.mocked(getPrismaClient).mockReturnValue(prisma as ReturnType<typeof getPrismaClient>);
    vi.mocked(resolveEventMembership).mockResolvedValue(membership);
    const req = mockReq({
      method: "POST",
      query: { id: "event-1" },
      body: { body: "  I can bring coffee.  " },
    });
    const res = mockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(201);
    expect(prisma.eventComment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          eventId: "event-1",
          userId: "user-1",
          body: "I can bring coffee.",
        },
      }),
    );
  });
});
