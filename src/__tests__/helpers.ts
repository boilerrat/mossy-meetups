import { vi } from "vitest";
import type { NextApiRequest, NextApiResponse } from "next";

export function mockReq(overrides: Partial<NextApiRequest> = {}): NextApiRequest {
  return {
    method: "POST",
    body: {},
    headers: {},
    socket: { remoteAddress: "127.0.0.1" },
    ...overrides,
  } as unknown as NextApiRequest;
}

type MockRes = {
  statusCode: number;
  body: unknown;
  headers: Record<string, string>;
  status: ReturnType<typeof vi.fn>;
  json: ReturnType<typeof vi.fn>;
  end: ReturnType<typeof vi.fn>;
  setHeader: ReturnType<typeof vi.fn>;
};

export function mockRes(): MockRes & NextApiResponse {
  const res: MockRes = {
    statusCode: 200,
    body: undefined,
    headers: {},
    status: vi.fn(),
    json: vi.fn(),
    end: vi.fn(),
    setHeader: vi.fn(),
  };

  res.status.mockImplementation((code: number) => {
    res.statusCode = code;
    return res;
  });

  res.json.mockImplementation((data: unknown) => {
    res.body = data;
    return res;
  });

  return res as unknown as MockRes & NextApiResponse;
}
