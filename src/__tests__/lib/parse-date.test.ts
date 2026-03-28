import { describe, it, expect } from "vitest";
import { parseDate } from "../../lib/parse-date";

describe("parseDate", () => {
  it("returns null for undefined", () => {
    expect(parseDate(undefined)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parseDate("")).toBeNull();
  });

  it("returns null for whitespace-only string", () => {
    expect(parseDate("   ")).toBeNull();
  });

  it("returns null for an invalid date string", () => {
    expect(parseDate("not-a-date")).toBeNull();
  });

  it("returns a Date for a valid ISO string", () => {
    const result = parseDate("2026-08-01T19:00:00.000Z");
    expect(result).toBeInstanceOf(Date);
    expect(result?.toISOString()).toBe("2026-08-01T19:00:00.000Z");
  });

  it("returns a Date for a local datetime string", () => {
    const result = parseDate("2026-08-01T19:00");
    expect(result).toBeInstanceOf(Date);
    expect(result?.getTime()).not.toBeNaN();
  });

  it("trims surrounding whitespace before parsing", () => {
    const result = parseDate("  2026-08-01T19:00:00.000Z  ");
    expect(result).toBeInstanceOf(Date);
  });
});
