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
import handler from "../../pages/api/events/index";

const mockSession = { user: { id: "user-1", email: "a@b.com" } };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/events", () => {
  it("returns 405 for non-POST methods", async () => {
    const req = mockReq({ method: "GET" });
    const res = mockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(405);
  });

  it("returns 401 when no session", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    vi.mocked(hasDatabaseUrl).mockReturnValue(true);
    const req = mockReq();
    const res = mockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(401);
  });

  it("returns 503 when DATABASE_URL is missing", async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession);
    vi.mocked(hasDatabaseUrl).mockReturnValue(false);
    const req = mockReq({ body: { groupId: "g-1", title: "Campfire" } });
    const res = mockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(503);
  });

  it("returns 400 when groupId is missing", async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession);
    vi.mocked(hasDatabaseUrl).mockReturnValue(true);
    vi.mocked(getPrismaClient).mockReturnValue({} as ReturnType<typeof getPrismaClient>);
    const req = mockReq({ body: { title: "Campfire" } });
    const res = mockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({ error: "Group is required" });
  });

  it("returns 400 when title is missing", async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession);
    vi.mocked(hasDatabaseUrl).mockReturnValue(true);
    vi.mocked(getPrismaClient).mockReturnValue({} as ReturnType<typeof getPrismaClient>);
    const req = mockReq({ body: { groupId: "g-1" } });
    const res = mockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({ error: "Event title is required" });
  });

  it("returns 201 with created event on success", async () => {
    const event = {
      id: "e-1",
      groupId: "g-1",
      title: "Campfire Set",
      description: null,
      location: null,
      mapLink: null,
      mapEmbed: null,
      arrivalDate: null,
      departureDate: null,
      createdAt: new Date(),
    };
    const prisma = { event: { create: vi.fn().mockResolvedValue(event) } };
    vi.mocked(getServerSession).mockResolvedValue(mockSession);
    vi.mocked(hasDatabaseUrl).mockReturnValue(true);
    vi.mocked(getPrismaClient).mockReturnValue(prisma as ReturnType<typeof getPrismaClient>);
    const req = mockReq({ body: { groupId: "g-1", title: "  Campfire Set  " } });
    const res = mockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(201);
    expect(res.body).toMatchObject({ event: { title: "Campfire Set" } });
    expect(prisma.event.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ title: "Campfire Set", groupId: "g-1" }),
      }),
    );
  });

  it("parses valid arrivalDate and departureDate", async () => {
    const event = { id: "e-1", arrivalDate: new Date("2026-08-01T19:00:00Z") };
    const prisma = { event: { create: vi.fn().mockResolvedValue(event) } };
    vi.mocked(getServerSession).mockResolvedValue(mockSession);
    vi.mocked(hasDatabaseUrl).mockReturnValue(true);
    vi.mocked(getPrismaClient).mockReturnValue(prisma as ReturnType<typeof getPrismaClient>);
    const req = mockReq({
      body: {
        groupId: "g-1",
        title: "Event",
        arrivalDate: "2026-08-01T19:00:00Z",
        departureDate: "2026-08-03T12:00:00Z",
      },
    });
    const res = mockRes();
    await handler(req, res);
    expect(prisma.event.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          arrivalDate: new Date("2026-08-01T19:00:00Z"),
          departureDate: new Date("2026-08-03T12:00:00Z"),
        }),
      }),
    );
  });

  it("passes null when arrivalDate is empty string", async () => {
    const prisma = { event: { create: vi.fn().mockResolvedValue({ id: "e-1" }) } };
    vi.mocked(getServerSession).mockResolvedValue(mockSession);
    vi.mocked(hasDatabaseUrl).mockReturnValue(true);
    vi.mocked(getPrismaClient).mockReturnValue(prisma as ReturnType<typeof getPrismaClient>);
    const req = mockReq({ body: { groupId: "g-1", title: "TBD Event", arrivalDate: "" } });
    const res = mockRes();
    await handler(req, res);
    expect(prisma.event.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ arrivalDate: null }),
      }),
    );
  });

  it("returns 500 when Prisma throws", async () => {
    const prisma = {
      event: { create: vi.fn().mockRejectedValue(new Error("connection lost")) },
    };
    vi.mocked(getServerSession).mockResolvedValue(mockSession);
    vi.mocked(hasDatabaseUrl).mockReturnValue(true);
    vi.mocked(getPrismaClient).mockReturnValue(prisma as ReturnType<typeof getPrismaClient>);
    const req = mockReq({ body: { groupId: "g-1", title: "Event" } });
    const res = mockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(500);
  });
});
