import { describe, it, expect } from "vitest";
import { findingKey, numberFindings, parseDismissals, filterSuppressed, DismissTracker } from "./dismiss";

describe("findingKey", () => {
  it("extracts severity + location from finding line", () => {
    const line = '- **Medium:** src/gateway/model.ts:97 — chatId extraction uses wrong index';
    const key = findingKey(line);
    expect(key).toContain("medium:src/gateway/model.ts:97");
  });

  it("handles numbered finding format (F# prefix)", () => {
    const line = '- **F1 Medium:** src/foo.ts:10 — something bad';
    const key = findingKey(line);
    expect(key).toBe("medium:src/foo.ts:10 — something bad");
  });

  it("falls back to trimmed line for non-matching format", () => {
    const key = findingKey("some random text");
    expect(key).toBe("some random text");
  });
});

describe("numberFindings", () => {
  it("numbers finding bullets sequentially", () => {
    const text = '- **High:** foo.ts:1 — bug\n- **Low:** bar.ts:2 — nit\nSome other text';
    const { numbered, findings } = numberFindings(text);
    expect(numbered).toContain("**F1 High:**");
    expect(numbered).toContain("**F2 Low:**");
    expect(numbered).toContain("Some other text");
    expect(findings).toHaveLength(2);
  });

  it("preserves non-finding lines unchanged", () => {
    const text = 'Header\n\n- **Medium:** x.ts:5 — issue\n\nFooter';
    const { numbered } = numberFindings(text);
    expect(numbered).toContain("Header");
    expect(numbered).toContain("Footer");
    expect(numbered).toContain("**F1 Medium:**");
  });
});

describe("parseDismissals", () => {
  it("parses DISMISS F# with colon separator", () => {
    const text = "The chatId extraction is intentional.\nDISMISS F1: intentional design for telegram thread format";
    const dismissals = parseDismissals(text);
    expect(dismissals.size).toBe(1);
    expect(dismissals.get(1)).toBe("intentional design for telegram thread format");
  });

  it("parses multiple dismissals", () => {
    const text = "DISMISS F1: by design\nDISMISS F2: not a real issue";
    const dismissals = parseDismissals(text);
    expect(dismissals.size).toBe(2);
    expect(dismissals.get(1)).toBe("by design");
    expect(dismissals.get(2)).toBe("not a real issue");
  });

  it("parses dash separator", () => {
    const text = "DISMISS F3 - already reviewed";
    const dismissals = parseDismissals(text);
    expect(dismissals.get(3)).toBe("already reviewed");
  });

  it("returns empty map when no dismissals", () => {
    const text = "I fixed both issues as suggested.";
    expect(parseDismissals(text).size).toBe(0);
  });
});

describe("filterSuppressed", () => {
  it("removes suppressed findings", () => {
    const text = '- **High:** foo.ts:1 — bug one\n- **Low:** bar.ts:2 — nit two';
    const suppressed = new Set([findingKey('- **High:** foo.ts:1 — bug one')]);
    const result = filterSuppressed(text, suppressed);
    expect(result).not.toContain("bug one");
    expect(result).toContain("nit two");
  });

  it("returns null when all findings suppressed", () => {
    const text = '- **High:** foo.ts:1 — bug one';
    const suppressed = new Set([findingKey('- **High:** foo.ts:1 — bug one')]);
    expect(filterSuppressed(text, suppressed)).toBeNull();
  });

  it("returns original when no suppressions", () => {
    const text = '- **Low:** x.ts:5 — something';
    expect(filterSuppressed(text, new Set())).toBe(text);
  });
});

describe("DismissTracker", () => {
  it("tracks dismissals and suppresses after threshold", () => {
    const tracker = new DismissTracker();
    const findings = ['- **Medium:** src/foo.ts:10 — bad pattern', '- **Low:** src/bar.ts:5 — nit'];
    tracker.setLastFindings(findings);

    // First dismiss
    tracker.processDismissals("DISMISS F1: intentional");
    expect(tracker.getSuppressed().size).toBe(0); // threshold is 2

    // Second dismiss (same finding via new review)
    tracker.setLastFindings(findings);
    tracker.processDismissals("DISMISS F1: still intentional");
    expect(tracker.getSuppressed().size).toBe(1);
  });

  it("reset clears all state", () => {
    const tracker = new DismissTracker();
    tracker.setLastFindings(['- **High:** x.ts:1 — bug']);
    tracker.processDismissals("DISMISS F1: nope");
    tracker.processDismissals("DISMISS F1: nope again");
    expect(tracker.getSuppressed().size).toBe(1);

    tracker.reset();
    expect(tracker.getSuppressed().size).toBe(0);
  });
});
