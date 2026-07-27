import { useCallback } from "react";
import { useSettingsStore } from "../../../stores/settingsStore";
import { GitDiffContent } from "./GitDiffContent";
import { GitDiffHeader } from "./GitDiffHeader";
import { GitDiffSelectionBar } from "./GitDiffSelectionBar";
import { DEFAULT_DIFF_ROOT_STYLE, TERMINAL_DIFF_ROOT_STYLE } from "./theme";
import type { GitDiffDataSource, GitDiffTarget } from "./types";
import { useGitDiffController } from "./useGitDiffController";

export interface GitDiffViewerProps {
  target: GitDiffTarget;
  dataSource: GitDiffDataSource;
  onClose?: () => void;
  onReverted?: () => void;
  closeOnRevert?: boolean;
  useTerminalTheme?: boolean;
}

export function GitDiffViewer({
  target,
  dataSource,
  onClose,
  onReverted,
  closeOnRevert = false,
  useTerminalTheme = false,
}: GitDiffViewerProps) {
  const resolvedTheme = useSettingsStore((state) => state.resolvedTheme);
  const handleReverted = useCallback(() => {
    onReverted?.();
    if (closeOnRevert) onClose?.();
  }, [closeOnRevert, onClose, onReverted]);
  const controller = useGitDiffController({ target, dataSource, onReverted: handleReverted });
  const requestDiscard = useCallback(() => {
    if (closeOnRevert) onClose?.();
    controller.requestDiscard();
  }, [closeOnRevert, controller, onClose]);

  return (
    <div
      className="flex h-full min-h-0 flex-col overflow-hidden font-mono"
      data-theme-mode={resolvedTheme}
      style={useTerminalTheme ? TERMINAL_DIFF_ROOT_STYLE : DEFAULT_DIFF_ROOT_STYLE}
    >
      <GitDiffHeader
        fileName={target.fileName}
        canDiscardFile={controller.canDiscardFile}
        onRequestDiscard={requestDiscard}
        onClose={onClose}
      />
      <GitDiffContent
        controller={controller}
        fallbackEditorTheme={resolvedTheme === "dark" ? "vs-dark" : "vs"}
        useTerminalTheme={useTerminalTheme}
      />
      <GitDiffSelectionBar controller={controller} />
    </div>
  );
}
