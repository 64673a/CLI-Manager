import { useEffect, useMemo } from "react";
import type { GitFileDiffPayload } from "../../lib/gitTransport";
import { Portal } from "../ui/Portal";
import { GitDiffViewer as StructuredGitDiffViewer } from "./diff/GitDiffViewer";
import type {
  GitDiffDataSource,
  GitDiffSelectedLine,
  GitDiffTarget,
} from "./diff/types";
import "react-diff-view/style/index.css";
import "./diffViewer.css";

interface LegacyGitDiffViewerProps {
  projectPath?: string;
  filePath: string;
  fileName: string;
  status: string;
  diffText?: string;
  loadDiff?: (filePath: string, status: string) => Promise<GitFileDiffPayload>;
  revertHunk?: (filePath: string, diffText: string, hunkIndex: number) => Promise<void>;
  revertLines?: (
    filePath: string,
    diffText: string,
    selectedLines: GitDiffSelectedLine[],
  ) => Promise<void>;
  onRequestDiscard?: (path: string, name: string, status: string) => void;
  onClose?: () => void;
  onReverted?: () => void;
  closeOnRevert?: boolean;
  useTerminalTheme?: boolean;
}

interface DiffViewerModalProps extends Omit<LegacyGitDiffViewerProps, "onClose"> {
  open: boolean;
  onClose: () => void;
  projectPath: string;
}

function missingLiveDataSource(): Promise<GitFileDiffPayload> {
  return Promise.reject(new Error("git_diff_live_source_missing"));
}

export function GitDiffViewer({
  projectPath,
  filePath,
  fileName,
  status,
  diffText,
  loadDiff,
  revertHunk,
  revertLines,
  onRequestDiscard,
  ...viewerProps
}: LegacyGitDiffViewerProps) {
  const target = useMemo<GitDiffTarget>(() => ({
    id: `${projectPath ?? "snapshot"}:${filePath}:${status}`,
    projectPath,
    filePath,
    fileName,
    status,
  }), [fileName, filePath, projectPath, status]);
  const dataSource = useMemo<GitDiffDataSource>(() => {
    if (diffText !== undefined) return { kind: "snapshot", content: diffText };
    return {
      kind: "live",
      load: loadDiff
        ? (currentTarget) => loadDiff(currentTarget.filePath, currentTarget.status)
        : missingLiveDataSource,
      mutations: {
        revertHunk: revertHunk
          ? (currentTarget, content, hunkIndex) => revertHunk(currentTarget.filePath, content, hunkIndex)
          : undefined,
        revertLines: revertLines
          ? (currentTarget, content, lines) => revertLines(currentTarget.filePath, content, lines)
          : undefined,
        requestDiscard: onRequestDiscard
          ? (currentTarget) => onRequestDiscard(currentTarget.filePath, currentTarget.fileName, currentTarget.status)
          : undefined,
      },
    };
  }, [diffText, loadDiff, onRequestDiscard, revertHunk, revertLines]);

  return <StructuredGitDiffViewer target={target} dataSource={dataSource} {...viewerProps} />;
}

export function DiffViewerModal({ open, onClose, ...viewerProps }: DiffViewerModalProps) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.isComposing) return;
      event.preventDefault();
      event.stopPropagation();
      onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  if (!open) return null;
  return (
    <Portal>
      <div
        className="fixed inset-0 flex items-center justify-center bg-black/60 p-4"
        style={{ zIndex: 100 }}
        onClick={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
      >
        <div
          className="h-[85vh] w-full max-w-6xl overflow-hidden rounded-xl border shadow-2xl"
          style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
          onClick={(event) => event.stopPropagation()}
        >
          <GitDiffViewer {...viewerProps} onClose={onClose} closeOnRevert />
        </div>
      </div>
    </Portal>
  );
}
