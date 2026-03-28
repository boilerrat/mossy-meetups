import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockReq, mockRes } from "../helpers";

vi.mock("../../lib/prisma", () => ({
  hasDatabaseUrl: vi.fn(),
  getPrismaClient: vi.fn(),
}));

import { hasDatabaseUrl, getPrismaClient } from "../../lib/prisma";
import handler from "../../pages/api/health";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/health", () => {
  it("returns 405 for non-GET methods", async () => {
    const req = mockReq({ method: "POST" });
    const res = mockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(405);
  });

  it("returns degraded when DATABASE_URL is not set", async () => {
    vi.mocked(hasDatabaseUrl).mockReturnValue(false);
    const req = mockReq({ method: "GET" });
    const res = mockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ status: "degraded", database: "unconfigured" });
  });

  it("returns degraded when prisma client is null", async () => {
    vi.mocked(hasDatabaseUrl).mockReturnValue(true);
    vi.mocked(getPrismaClient).mockReturnValue(null);
    const req = mockReq({ method: "GET" });
    const res = mockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ status: "degraded", database: "unconfigured" });
  });

  it("returns ok with database connected when query succeeds", async () => {
    const prisma = { $queryRaw: vi.fn().mockResolvedValue([{ "?column?": 1 }]) };
    vi.mocked(hasDatabaseUrl).mockReturnValue(true);
    vi.mocked(getPrismaClient).mockReturnValue(prisma as ReturnType<typeof getPrismaClient>);
    const req = mockReq({ method: "GET" });
    const res = mockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ status: "ok", database: "connected" });
    expect((res.body as { timestamp: string }).timestamp).toBeTruthy();
  });

  it("returns degraded with database disconnected when query fails", async () => {
    const prisma = { $queryRaw: vi.fn().mockRejectedValue(new Error("connection refused")) };
    vi.mocked(hasDatabaseUrl).mockReturnValue(true);
    vi.mocked(getPrismaClient).mockReturnValue(prisma as ReturnType<typeof getPrismaClient>);
    const req = mockReq({ method: "GET" });
    const res = mockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ status: "degraded", database: "disconnected" });
  });
});
