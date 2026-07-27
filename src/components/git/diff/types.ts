import type { ChangeData, FileData, HunkTokens } from "react-diff-view";
import type { GitFileDiffPayload } from "../../../lib/gitTransport";

export type GitDiffLineSide = "old" | "new";

export interface GitDiffSelectedLine {
  side: GitDiffLineSide;
  lineNumber: number;
}

export interface GitDiffTarget {
  id: string;
  projectPath?: string;
  filePath: string;
  fileName: string;
  status: string;
}

export interface GitDiffMutationActions {
  revertHunk?: (
    target: GitDiffTarget,
    diffText: string,
    hunkIndex: number,
  ) => Promise<void>;
  revertLines?: (
    target: GitDiffTarget,
    diffText: string,
    selectedLines: GitDiffSelectedLine[],
  ) => Promise<void>;
  requestDiscard?: (target: GitDiffTarget) => void;
}

export interface GitDiffSnapshotDataSource {
  kind: "snapshot";
  content: string;
}

export interface GitDiffLiveDataSource {
  kind: "live";
  load: (target: GitDiffTarget) => Promise<GitFileDiffPayload>;
  mutations?: GitDiffMutationActions;
}

export type GitDiffDataSource = GitDiffSnapshotDataSource | GitDiffLiveDataSource;

export interface ParsedGitDiff {
  file: FileData;
  tokens: HunkTokens;
}

export interface GitDiffController {
  diffText: string;
  loading: boolean;
  reverting: boolean;
  error: string | null;
  parsed: ParsedGitDiff | null;
  selectedKeys: string[];
  canDiscardFile: boolean;
  canRevertHunks: boolean;
  canRevertLines: boolean;
  partialRevertUnavailable: boolean;
  toggleSelectedChange: (args: { change: ChangeData | null }) => void;
  clearSelection: () => void;
  requestDiscard: () => void;
  revertHunk: (hunkIndex: number) => Promise<void>;
  revertSelectedLines: () => Promise<void>;
}
