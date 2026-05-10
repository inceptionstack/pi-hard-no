import { describe, it, expect } from "vitest";
import { parseVerdict, cleanReviewText, isLgtmResult } from "./reviewer";

describe("reviewer verdict parsing", () => {
  it("parseVerdict extracts LGTM", () => {
    expect(parseVerdict("some text <verdict>LGTM</verdict> more")).toBe("lgtm");
  });

  it("parseVerdict extracts ISSUES_FOUND", () => {
    expect(parseVerdict("<verdict>ISSUES_FOUND</verdict>")).toBe("issues");
  });

  it("parseVerdict returns null when no tag", () => {
    expect(parseVerdict("no verdict here")).toBeNull();
  });

  it("isLgtmResult returns true for empty text", () => {
    expect(isLgtmResult("")).toBe(true);
    expect(isLgtmResult("  ")).toBe(true);
  });

  it("isLgtmResult returns false when severity markers present", () => {
    expect(isLgtmResult("- **High:** something bad")).toBe(false);
    expect(isLgtmResult("- **Medium:** fix this")).toBe(false);
  });

  it("isLgtmResult returns true for explicit LGTM text", () => {
    expect(isLgtmResult("LGTM — looks good")).toBe(true);
  });

  it("cleanReviewText strips verdict tags", () => {
    const raw = "Some findings\n<verdict>ISSUES_FOUND</verdict>";
    expect(cleanReviewText(raw)).toBe("Some findings");
  });

  it("empty cleanedText with ISSUES_FOUND verdict should be treated as LGTM", () => {
    // This tests the bug where model returns <verdict>ISSUES_FOUND</verdict>
    // with no actual findings text — resulting in confusing "found potential issues:" + nothing
    const raw = "<verdict>ISSUES_FOUND</verdict>";
    const cleaned = cleanReviewText(raw);
    expect(cleaned).toBe("");
    // The fix: verdict=issues + empty cleaned = treat as LGTM
    // (tested at integration level in reviewer.ts line ~395)
    expect(isLgtmResult(cleaned)).toBe(true);
  });
});
