import type { HistorySessionSummary } from "./types";

const SSH_SESSION_CLOCK_SKEW_MS = 60_000;

export type SshCodexSessionBindingSelection =
  | { status: "resolved"; sessionId: string; sourceInstanceId: string }
  | { status: "not_found" }
  | { status: "ambiguous" };

function normalizedSessionId(summary: HistorySessionSummary): string {
  return summary.session_ref?.sourceSessionId?.trim() || summary.session_id.trim();
}

export function selectUniqueSshCodexSessionBinding(input: {
  summaries: HistorySessionSummary[];
  terminalStartedAtMs: number;
  terminalActivityAtMs: number;
  nowMs: number;
  alreadyBoundSessionIds: ReadonlySet<string>;
}): SshCodexSessionBindingSelection {
  const earliestCreatedAt = input.terminalStartedAtMs - SSH_SESSION_CLOCK_SKEW_MS;
  const earliestUpdatedAt = Math.max(
    input.terminalStartedAtMs,
    input.terminalActivityAtMs || input.terminalStartedAtMs,
  ) - SSH_SESSION_CLOCK_SKEW_MS;
  const latestPlausibleAt = input.nowMs + SSH_SESSION_CLOCK_SKEW_MS;
  const matches = input.summaries.filter((summary) => {
    const sessionId = normalizedSessionId(summary);
    return summary.source === "codex"
      && summary.session_ref?.transportKind === "ssh"
      && Boolean(sessionId)
      && !/\s/.test(sessionId)
      && !input.alreadyBoundSessionIds.has(sessionId)
      && summary.message_count > 0
      && summary.created_at >= earliestCreatedAt
      && summary.created_at <= latestPlausibleAt
      && summary.updated_at >= earliestUpdatedAt
      && summary.updated_at <= latestPlausibleAt;
  });

  if (matches.length === 0) return { status: "not_found" };
  if (matches.length !== 1) return { status: "ambiguous" };
  const match = matches[0];
  return {
    status: "resolved",
    sessionId: normalizedSessionId(match),
    sourceInstanceId: match.session_ref?.sourceInstanceId?.trim() || "",
  };
}
