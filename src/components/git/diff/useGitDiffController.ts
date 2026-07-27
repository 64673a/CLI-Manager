import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getChangeKey, parseDiff, tokenize } from "react-diff-view";
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
import type { GitDiffHunkPlacement } from "./reviewNavigation";
import type { GitDiffViewMode } from "../../../stores/settingsStore";
import { useGitDiffSelection } from "./gitDiffSelection";

interface UseGitDiffControllerOptions {
  target: GitDiffTarget;
  dataSource: GitDiffDataSource;
  onReverted?: () => void;
  initialHunkPlacement?: GitDiffHunkPlacement;
  viewMode: GitDiffViewMode;
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

function selectedLines(
  parsed: ParsedGitDiff | null,
  selectedKeys: ReadonlySet<string>,
): GitDiffSelectedLine[] {
  if (!parsed || selectedKeys.size === 0) return [];
  const lines: GitDiffSelectedLine[] = [];
  for (const hunk of parsed.file.hunks) {
    for (const change of hunk.changes) {
      if (change.type === "normal" || !selectedKeys.has(getChangeKey(change))) continue;
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
  initialHunkPlacement = "first",
  viewMode,
}: UseGitDiffControllerOptions): GitDiffController {
  const { t } = useI18n();
  const [diffText, setDiffText] = useState("");
  const [loading, setLoading] = useState(false);
  const [reverting, setReverting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeHunkIndex, setActiveHunkIndex] = useState(0);
  const [loadRevision, setLoadRevision] = useState(0);
  const [payloadAllowsPartialRevert, setPayloadAllowsPartialRevert] = useState(false);
  const hunkAnchorsRef = useRef(new Map<number, HTMLElement>());
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
  const parsed = useMemo(() => parseGitDiff(diffText, target.fileName), [diffText, target.fileName]);
  const selection = useGitDiffSelection(
    parsed?.file.hunks,
    viewMode,
    diffText,
  );

  useEffect(() => {
    selection.clearSelection();
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
        else if (message.includes("ssh_agent_capability_missing:gitDiffOptions")) {
          setError(t("git.diff.sshAgentUpgradeRequired"));
        }
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
  }, [liveLoader, loadRevision, selection.clearSelection, snapshotContent, stableTarget, t]);

  const hunkCount = parsed?.file.hunks.length ?? 0;
  const activeHunkNewStart = parsed?.file.hunks[activeHunkIndex]?.newStart;
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

  const registerHunkAnchor = useCallback((hunkIndex: number, element: HTMLElement | null) => {
    if (element) hunkAnchorsRef.current.set(hunkIndex, element);
    else hunkAnchorsRef.current.delete(hunkIndex);
  }, []);
  const goToHunk = useCallback((hunkIndex: number) => {
    if (hunkCount === 0) return;
    const nextIndex = Math.min(Math.max(hunkIndex, 0), hunkCount - 1);
    setActiveHunkIndex(nextIndex);
  }, [hunkCount]);
  const requestDiscard = useCallback(
    () => mutations?.requestDiscard?.(stableTarget),
    [mutations, stableTarget],
  );

  const revertHunk = useCallback(async (hunkIndex: number) => {
    if (!canRevertHunks || !mutations?.revertHunk) return;
    setReverting(true);
    try {
      await mutations.revertHunk(stableTarget, diffText, hunkIndex);
      setLoadRevision((revision) => revision + 1);
      onReverted?.();
    } catch {
      toast.error(t("git.diff.revertHunkFailed"));
    } finally {
      setReverting(false);
    }
  }, [canRevertHunks, diffText, mutations, onReverted, stableTarget, t]);

  const revertSelectedLines = useCallback(async () => {
    if (!canRevertLines || !mutations?.revertLines) return;
    const lines = selectedLines(parsed, selection.selectedKeySet);
    if (lines.length === 0) return;
    setReverting(true);
    try {
      await mutations.revertLines(stableTarget, diffText, lines);
      setLoadRevision((revision) => revision + 1);
      onReverted?.();
    } catch {
      toast.error(t("git.diff.revertLinesFailed"));
    } finally {
      setReverting(false);
    }
  }, [canRevertLines, diffText, mutations, onReverted, parsed, selection.selectedKeySet, stableTarget, t]);

  useEffect(() => {
    setActiveHunkIndex(initialHunkPlacement === "last" && hunkCount > 0 ? hunkCount - 1 : 0);
  }, [hunkCount, initialHunkPlacement, stableTarget.id]);

  useEffect(() => {
    if (hunkCount === 0) return;
    const frame = window.requestAnimationFrame(() => {
      hunkAnchorsRef.current.get(activeHunkIndex)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeHunkIndex, hunkCount, stableTarget.id]);

  return {
    diffText,
    loading,
    reverting,
    error,
    parsed,
    selectedKeys: selection.selectedKeys,
    selectedKeySet: selection.selectedKeySet,
    canDiscardFile,
    canRevertHunks,
    canRevertLines,
    partialRevertUnavailable,
    activeHunkIndex,
    hunkCount,
    activeHunkNewStart,
    selectChange: ({ change }, extend) => selection.selectChange(change, extend),
    extendSelectionFromKeyboard: ({ change }, direction) => (
      selection.extendSelectionFromKeyboard(change, direction)
    ),
    clearSelection: selection.clearSelection,
    goToHunk,
    registerHunkAnchor,
    requestDiscard,
    revertHunk,
    revertSelectedLines,
  };
}
