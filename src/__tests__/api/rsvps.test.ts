import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockReq, mockRes } from "../helpers";

vi.mock("next-auth/next", () => ({ getServerSession: vi.fn() }));
vi.mock("../../lib/prisma", () => ({ getPrismaClient: vi.fn() }));
vi.mock("../../lib/rate-limit", () => ({
  withRateLimit: (handler: unknown) => handler,
}));

import { getServerSession } from "next-auth/next";
import { getPrismaClient } from "../../lib/prisma";
import handler from "../../pages/api/rsvps/index";

const mockSession = { user: { id: "user-1", email: "a@b.com" } };

const adminEvent = {
  id: "e-1",
  group: {
    adminId: "user-1",
    invites: [],
  },
};

const memberEvent = {
  id: "e-1",
  group: {
    adminId: "admin-99",
    invites: [{ id: "inv-1", userId: "user-1", usedAt: new Date() }],
  },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/rsvps", () => {
  it("returns 405 for non-POST methods", async () => {
    const req = mockReq({ method: "GET" });
    const res = mockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(405);
  });

  it("returns 401 when no session", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const req = mockReq({ body: { eventId: "e-1", status: "ATTENDING" } });
    const res = mockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(401);
  });

  it("returns 503 when no Prisma client", async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession);
    vi.mocked(getPrismaClient).mockReturnValue(null);
    const req = mockReq({ body: { eventId: "e-1", status: "ATTENDING" } });
    const res = mockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(503);
  });

  it("returns 400 when eventId is missing", async () => {
    const prisma = { event: { findUnique: vi.fn() } };
    vi.mocked(getServerSession).mockResolvedValue(mockSession);
    vi.mocked(getPrismaClient).mockReturnValue(prisma as ReturnType<typeof getPrismaClient>);
    const req = mockReq({ body: { status: "ATTENDING" } });
    const res = mockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({ error: "eventId is required" });
  });

  it("returns 400 for invalid status", async () => {
    const prisma = { event: { findUnique: vi.fn() } };
    vi.mocked(getServerSession).mockResolvedValue(mockSession);
    vi.mocked(getPrismaClient).mockReturnValue(prisma as ReturnType<typeof getPrismaClient>);
    const req = mockReq({ body: { eventId: "e-1", status: "GOING" } });
    const res = mockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({ error: expect.stringContaining("ATTENDING") });
  });

  it("returns 404 when event does not exist", async () => {
    const prisma = { event: { findUnique: vi.fn().mockResolvedValue(null) } };
    vi.mocked(getServerSession).mockResolvedValue(mockSession);
    vi.mocked(getPrismaClient).mockReturnValue(prisma as ReturnType<typeof getPrismaClient>);
    const req = mockReq({ body: { eventId: "e-1", status: "ATTENDING" } });
    const res = mockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(404);
  });

  it("returns 403 when user is not a group member", async () => {
    const nonMemberEvent = {
      id: "e-1",
      group: { adminId: "other-user", invites: [] },
    };
    const prisma = { event: { findUnique: vi.fn().mockResolvedValue(nonMemberEvent) } };
    vi.mocked(getServerSession).mockResolvedValue(mockSession);
    vi.mocked(getPrismaClient).mockReturnValue(prisma as ReturnType<typeof getPrismaClient>);
    const req = mockReq({ body: { eventId: "e-1", status: "ATTENDING" } });
    const res = mockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(403);
  });

  it("returns 200 and upserts RSVP when user is group admin", async () => {
    const rsvp = { id: "r-1", userId: "user-1", eventId: "e-1", status: "ATTENDING" };
    const prisma = {
      event: { findUnique: vi.fn().mockResolvedValue(adminEvent) },
      rSVP: { upsert: vi.fn().mockResolvedValue(rsvp) },
    };
    vi.mocked(getServerSession).mockResolvedValue(mockSession);
    vi.mocked(getPrismaClient).mockReturnValue(prisma as ReturnType<typeof getPrismaClient>);
    const req = mockReq({ body: { eventId: "e-1", status: "ATTENDING" } });
    const res = mockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ success: true, data: rsvp });
  });

  it("returns 200 when user is an accepted group member", async () => {
    const rsvp = { id: "r-1", userId: "user-1", eventId: "e-1", status: "MAYBE" };
    const prisma = {
      event: { findUnique: vi.fn().mockResolvedValue(memberEvent) },
      rSVP: { upsert: vi.fn().mockResolvedValue(rsvp) },
    };
    vi.mocked(getServerSession).mockResolvedValue(mockSession);
    vi.mocked(getPrismaClient).mockReturnValue(prisma as ReturnType<typeof getPrismaClient>);
    const req = mockReq({ body: { eventId: "e-1", status: "MAYBE" } });
    const res = mockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ success: true, data: { status: "MAYBE" } });
  });
});
