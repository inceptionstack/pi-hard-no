/**
 * dismiss.ts — Track and suppress dismissed review findings
 *
 * When the agent responds to a review with "DISMISS F#: reason",
 * that finding is tracked. If the same finding appears in a subsequent
 * review cycle and has been dismissed >= threshold times, it's suppressed.
 *
 * Finding identity: severity + file:line + first 60 chars of problem text.
 */

import { log } from "./logger";

export interface DismissedFinding {
  key: string;
  reason: string;
  count: number;
}

/** How many times a finding must be dismissed before it's auto-suppressed. */
const SUPPRESS_THRESHOLD = 2;

/** Extract a stable key from a finding bullet line. */
export function findingKey(line: string): string {
  // Format: - **Severity:** file:line — problem text
  const match = line.match(/^\s*-\s*\*\*(?:F\d+\s+)?(\w+):\*\*\s*(.+)/);
  if (!match) return line.trim().slice(0, 80);
  const severity = match[1].toLowerCase();
  const rest = match[2].trim().slice(0, 60);
  return `${severity}:${rest}`;
}

/** Number findings in review text and return the numbered version + finding list. */
export function numberFindings(text: string): { numbered: string; findings: string[] } {
  const lines = text.split("\n");
  const findings: string[] = [];
  let counter = 0;

  const numbered = lines.map(line => {
    // Match finding bullets: - **Severity:** ...
    const match = line.match(/^(\s*-\s*)\*\*(\w+):\*\*(.*)$/);
    if (match) {
      counter++;
      findings.push(line);
      return `${match[1]}**F${counter} ${match[2]}:**${match[3]}`;
    }
    return line;
  }).join("\n");

  return { numbered, findings };
}

/** Parse DISMISS markers from agent text. Returns map of F# → reason. */
export function parseDismissals(text: string): Map<number, string> {
  const dismissals = new Map<number, string>();
  // Match: DISMISS F1: reason  or  DISMISS F1 - reason  or  DISMISS F1 reason
  const pattern = /DISMISS\s+F(\d+)\s*[:–\-]\s*(.+)/gi;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    dismissals.set(parseInt(match[1], 10), match[2].trim());
  }
  return dismissals;
}

/** Filter suppressed findings from review text. Returns filtered text or null if all suppressed. */
export function filterSuppressed(text: string, suppressed: Set<string>): string | null {
  if (suppressed.size === 0) return text;

  const lines = text.split("\n");
  const filtered = lines.filter(line => {
    const match = line.match(/^\s*-\s*\*\*\w+:\*\*/);
    if (!match) return true; // keep non-finding lines
    const key = findingKey(line);
    return !suppressed.has(key);
  });

  // If all findings were suppressed, return null (should be LGTM)
  const remaining = filtered.filter(l => l.match(/^\s*-\s*\*\*/));
  if (remaining.length === 0) return null;

  return filtered.join("\n");
}

/**
 * Dismiss tracker — stores dismissed findings across review loops.
 * Scoped to one orchestrator instance (one session).
 */
export class DismissTracker {
  private dismissed = new Map<string, DismissedFinding>();
  private lastFindings: string[] = [];

  /** Record the findings from the latest review (for F# → finding mapping). */
  setLastFindings(findings: string[]): void {
    this.lastFindings = findings;
  }

  /** Process agent's response text for DISMISS markers. */
  processDismissals(agentText: string): number {
    const markers = parseDismissals(agentText);
    if (markers.size === 0) return 0;

    let count = 0;
    for (const [fNum, reason] of markers) {
      const finding = this.lastFindings[fNum - 1]; // F1 = index 0
      if (!finding) continue;

      const key = findingKey(finding);
      const existing = this.dismissed.get(key);
      if (existing) {
        existing.count++;
        existing.reason = reason;
      } else {
        this.dismissed.set(key, { key, reason, count: 1 });
      }
      count++;
      log(`dismiss: F${fNum} dismissed (${key}) — "${reason}" [count=${this.dismissed.get(key)!.count}]`);
    }
    return count;
  }

  /** Get the set of finding keys that should be suppressed (dismissed >= threshold). */
  getSuppressed(): Set<string> {
    const suppressed = new Set<string>();
    for (const [key, entry] of this.dismissed) {
      if (entry.count >= SUPPRESS_THRESHOLD) {
        suppressed.add(key);
      }
    }
    return suppressed;
  }

  /** Reset all dismissals (e.g. on session end). */
  reset(): void {
    this.dismissed.clear();
    this.lastFindings = [];
  }
}
