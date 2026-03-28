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
// Import the unwrapped handler by bypassing the withRateLimit wrapper
// We mock withRateLimit to be a no-op, so the default export IS the handler.
import handler from "../../pages/api/groups/index";

const mockSession = { user: { id: "user-1", email: "a@b.com" } };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/groups", () => {
  it("returns 405 for non-POST methods", async () => {
    const req = mockReq({ method: "GET" });
    const res = mockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(405);
    expect(res.setHeader).toHaveBeenCalledWith("Allow", "POST");
  });

  it("returns 401 when no session", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    vi.mocked(hasDatabaseUrl).mockReturnValue(true);
    const req = mockReq();
    const res = mockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(401);
    expect(res.body).toMatchObject({ error: "Unauthorized" });
  });

  it("returns 503 when DATABASE_URL is missing", async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession);
    vi.mocked(hasDatabaseUrl).mockReturnValue(false);
    const req = mockReq({ body: { name: "Test Group" } });
    const res = mockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(503);
  });

  it("returns 400 when name is missing", async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession);
    vi.mocked(hasDatabaseUrl).mockReturnValue(true);
    vi.mocked(getPrismaClient).mockReturnValue({} as ReturnType<typeof getPrismaClient>);
    const req = mockReq({ body: {} });
    const res = mockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({ error: "Group name is required" });
  });

  it("returns 400 when name is whitespace only", async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession);
    vi.mocked(hasDatabaseUrl).mockReturnValue(true);
    vi.mocked(getPrismaClient).mockReturnValue({} as ReturnType<typeof getPrismaClient>);
    const req = mockReq({ body: { name: "   " } });
    const res = mockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(400);
  });

  it("returns 201 with created group on success", async () => {
    const group = { id: "g-1", name: "Camp Crew", adminId: "user-1", createdAt: new Date() };
    const prisma = { group: { create: vi.fn().mockResolvedValue(group) } };
    vi.mocked(getServerSession).mockResolvedValue(mockSession);
    vi.mocked(hasDatabaseUrl).mockReturnValue(true);
    vi.mocked(getPrismaClient).mockReturnValue(prisma as ReturnType<typeof getPrismaClient>);
    const req = mockReq({ body: { name: "  Camp Crew  " } });
    const res = mockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(201);
    expect(res.body).toMatchObject({ group: { name: "Camp Crew" } });
    expect(prisma.group.create).toHaveBeenCalledWith({
      data: { name: "Camp Crew", adminId: "user-1" },
    });
  });

  it("returns 500 when Prisma throws", async () => {
    const prisma = {
      group: { create: vi.fn().mockRejectedValue(new Error("DB exploded")) },
    };
    vi.mocked(getServerSession).mockResolvedValue(mockSession);
    vi.mocked(hasDatabaseUrl).mockReturnValue(true);
    vi.mocked(getPrismaClient).mockReturnValue(prisma as ReturnType<typeof getPrismaClient>);
    const req = mockReq({ body: { name: "Camp Crew" } });
    const res = mockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(500);
    expect(res.body).toMatchObject({ error: "DB exploded" });
  });
});
