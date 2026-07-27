import { useCallback, useEffect, useMemo, useState } from "react";
import { getChangeKey, parseDiff, tokenize } from "react-diff-view";
import type { ChangeData } from "react-diff-view";
import { toast } from "sonner";
import { debugConsoleWarn } from "../../../lib/debugConsole";
import { useI18n } from "../../../lib/i18n";
import { detectLanguage, refractor } from "../diffHighlight";
import type {
  GitDiffController,
  GitDiffDataSource,
  GitDiffSelectedLine,
  GitDiffTarget,
  ParsedGitDiff,
} from "./types";

interface UseGitDiffControllerOptions {
  target: GitDiffTarget;
  dataSource: GitDiffDataSource;
  onReverted?: () => void;
}

function parseGitDiff(diffText: string, fileName: string): ParsedGitDiff | null {
  if (!diffText) return null;
  try {
    const [file] = parseDiff(diffText);
    if (!file) return null;

    const language = detectLanguage(fileName);
    if (language) {
      try {
        return {
          file,
          tokens: tokenize(file.hunks, { highlight: true, refractor, language }),
        };
      } catch (error) {
        debugConsoleWarn("[GitDiffViewer] Failed to highlight diff; using plain tokens:", error);
      }
    }
    return { file, tokens: tokenize(file.hunks) };
  } catch (error) {
    debugConsoleWarn("[GitDiffViewer] Failed to parse diff:", error);
    return null;
  }
}

function selectedLines(parsed: ParsedGitDiff | null, selectedKeys: string[]): GitDiffSelectedLine[] {
  if (!parsed || selectedKeys.length === 0) return [];
  const keys = new Set(selectedKeys);
  const lines: GitDiffSelectedLine[] = [];
  for (const hunk of parsed.file.hunks) {
    for (const change of hunk.changes) {
      if (change.type === "normal" || !keys.has(getChangeKey(change))) continue;
      lines.push({
        side: change.type === "insert" ? "new" : "old",
        lineNumber: change.lineNumber,
      });
    }
  }
  return lines;
}

export function useGitDiffController({
  target,
  dataSource,
  onReverted,
}: UseGitDiffControllerOptions): GitDiffController {
  const { t } = useI18n();
  const [diffText, setDiffText] = useState("");
  const [loading, setLoading] = useState(false);
  const [reverting, setReverting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [payloadAllowsPartialRevert, setPayloadAllowsPartialRevert] = useState(false);
  const snapshotContent = dataSource.kind === "snapshot" ? dataSource.content : undefined;
  const liveLoader = dataSource.kind === "live" ? dataSource.load : undefined;
  const mutations = dataSource.kind === "live" ? dataSource.mutations : undefined;
  const stableTarget = useMemo<GitDiffTarget>(() => target, [
    target.fileName,
    target.filePath,
    target.id,
    target.projectPath,
    target.status,
  ]);

  useEffect(() => {
    setSelectedKeys([]);
    setError(null);
    setPayloadAllowsPartialRevert(false);

    if (snapshotContent !== undefined) {
      setDiffText(snapshotContent);
      setLoading(false);
      return;
    }
    if (!liveLoader) {
      setDiffText("");
      setLoading(false);
      setError("git_diff_live_source_missing");
      return;
    }

    let cancelled = false;
    setDiffText("");
    setLoading(true);
    void liveLoader(stableTarget)
      .then((payload) => {
        if (cancelled) return;
        setDiffText(payload.content);
        setPayloadAllowsPartialRevert(payload.canRevertHunks);
      })
      .catch((loadError) => {
        if (cancelled) return;
        const message = loadError instanceof Error ? loadError.message : String(loadError);
        if (message.includes("binary_file")) setError(t("files.error.binaryFile"));
        else if (message.includes("text_decode_failed") || message.includes("text_encoding_unknown")) {
          setError(t("files.error.encodingUnknown"));
        } else setError(message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [liveLoader, snapshotContent, stableTarget, t]);

  const parsed = useMemo(() => parseGitDiff(diffText, target.fileName), [diffText, target.fileName]);
  const trackedFile = target.status !== "U" && target.status !== "??";
  const canDiscardFile = trackedFile && Boolean(mutations?.requestDiscard);
  const canRevertHunks = canDiscardFile
    && payloadAllowsPartialRevert
    && Boolean(mutations?.revertHunk);
  const canRevertLines = canDiscardFile
    && payloadAllowsPartialRevert
    && Boolean(mutations?.revertLines);
  const partialRevertUnavailable = canDiscardFile
    && !payloadAllowsPartialRevert
    && parsed !== null;

  const toggleSelectedChange = useCallback(({ change }: { change: ChangeData | null }) => {
    if (!change || change.type === "normal") return;
    const key = getChangeKey(change);
    setSelectedKeys((current) => current.includes(key)
      ? current.filter((candidate) => candidate !== key)
      : [...current, key]);
  }, []);

  const clearSelection = useCallback(() => setSelectedKeys([]), []);
  const requestDiscard = useCallback(
    () => mutations?.requestDiscard?.(stableTarget),
    [mutations, stableTarget],
  );

  const revertHunk = useCallback(async (hunkIndex: number) => {
    if (!mutations?.revertHunk) return;
    setReverting(true);
    try {
      await mutations.revertHunk(stableTarget, diffText, hunkIndex);
      onReverted?.();
    } catch {
      toast.error(t("git.diff.revertHunkFailed"));
    } finally {
      setReverting(false);
    }
  }, [diffText, mutations, onReverted, stableTarget, t]);

  const revertSelectedLines = useCallback(async () => {
    if (!mutations?.revertLines) return;
    const lines = selectedLines(parsed, selectedKeys);
    if (lines.length === 0) return;
    setReverting(true);
    try {
      await mutations.revertLines(stableTarget, diffText, lines);
      onReverted?.();
    } catch {
      toast.error(t("git.diff.revertLinesFailed"));
    } finally {
      setReverting(false);
    }
  }, [diffText, mutations, onReverted, parsed, selectedKeys, stableTarget, t]);

  return {
    diffText,
    loading,
    reverting,
    error,
    parsed,
    selectedKeys,
    canDiscardFile,
    canRevertHunks,
    canRevertLines,
    partialRevertUnavailable,
    toggleSelectedChange,
    clearSelection,
    requestDiscard,
    revertHunk,
    revertSelectedLines,
  };
}
