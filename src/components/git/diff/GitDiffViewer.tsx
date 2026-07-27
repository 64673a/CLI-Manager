import { useCallback, type KeyboardEvent } from "react";
import { useSettingsStore } from "../../../stores/settingsStore";
import type { GitDiffOptions } from "../../../lib/gitDiffOptions";
import type { GitDiffViewMode } from "../../../stores/settingsStore";
import { GitDiffContent } from "./GitDiffContent";
import { GitDiffHeader } from "./GitDiffHeader";
import { GitDiffSelectionBar } from "./GitDiffSelectionBar";
import { GitDiffToolbar } from "./GitDiffToolbar";
import { DEFAULT_DIFF_ROOT_STYLE, TERMINAL_DIFF_ROOT_STYLE } from "./theme";
import { stepReviewNavigation, type GitDiffNavigationDirection } from "./reviewNavigation";
import type { GitDiffDataSource, GitDiffReviewContext, GitDiffTarget } from "./types";
import { useGitDiffController } from "./useGitDiffController";

export interface GitDiffViewerProps {
  target: GitDiffTarget;
  dataSource: GitDiffDataSource;
  onClose?: () => void;
  onReverted?: () => void;
  closeOnRevert?: boolean;
  useTerminalTheme?: boolean;
  viewMode?: GitDiffViewMode;
  diffOptions?: GitDiffOptions;
  onViewModeChange?: (viewMode: GitDiffViewMode) => void;
  onDiffOptionsChange?: (options: GitDiffOptions) => void;
  review?: GitDiffReviewContext;
}

export function GitDiffViewer({
  target,
  dataSource,
  onClose,
  onReverted,
  closeOnRevert = false,
  useTerminalTheme = false,
  viewMode = "split",
  diffOptions,
  onViewModeChange,
  onDiffOptionsChange,
  review,
}: GitDiffViewerProps) {
  const resolvedTheme = useSettingsStore((state) => state.resolvedTheme);
  const handleReverted = useCallback(() => {
    onReverted?.();
    if (closeOnRevert) onClose?.();
  }, [closeOnRevert, onClose, onReverted]);
  const controller = useGitDiffController({
    target,
    dataSource,
    onReverted: handleReverted,
    initialHunkPlacement: review?.initialHunkPlacement,
  });
  const requestDiscard = useCallback(() => {
    if (closeOnRevert) onClose?.();
    controller.requestDiscard();
  }, [closeOnRevert, controller, onClose]);
  const navigate = useCallback((direction: GitDiffNavigationDirection) => {
    if (!review) return;
    const next = stepReviewNavigation(
      direction,
      { targetIndex: review.fileIndex, hunkIndex: controller.activeHunkIndex },
      review.fileCount,
      controller.hunkCount,
    );
    if (!next) return;
    if (next.targetIndex === review.fileIndex) controller.goToHunk(next.hunkIndex);
    else if (direction === "previous") review.onNavigateToPreviousFile();
    else review.onNavigateToNextFile();
  }, [controller, review]);
  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    if (!review || event.key !== "F7" || event.nativeEvent.isComposing) return;
    event.preventDefault();
    event.stopPropagation();
    navigate(event.shiftKey ? "previous" : "next");
  }, [navigate, review]);
  const canNavigatePrevious = Boolean(review)
    && (controller.activeHunkIndex > 0 || review!.canNavigateToPreviousFile);
  const canNavigateNext = Boolean(review)
    && (controller.activeHunkIndex + 1 < controller.hunkCount || review!.canNavigateToNextFile);

  return (
    <div
      className="flex h-full min-h-0 flex-col overflow-hidden font-mono"
      data-theme-mode={resolvedTheme}
      style={useTerminalTheme ? TERMINAL_DIFF_ROOT_STYLE : DEFAULT_DIFF_ROOT_STYLE}
      tabIndex={review ? 0 : undefined}
      autoFocus={Boolean(review)}
      onKeyDown={handleKeyDown}
    >
      {review && onViewModeChange ? (
        <GitDiffToolbar
          filePath={target.filePath}
          status={target.status}
          fileIndex={review.fileIndex}
          fileCount={review.fileCount}
          additions={review.additions}
          deletions={review.deletions}
          viewMode={viewMode}
          diffOptions={diffOptions}
          canNavigatePrevious={canNavigatePrevious}
          canNavigateNext={canNavigateNext}
          canOpenSource={target.status !== "D"}
          canDiscardFile={controller.canDiscardFile}
          onNavigatePrevious={() => navigate("previous")}
          onNavigateNext={() => navigate("next")}
          onViewModeChange={onViewModeChange}
          onDiffOptionsChange={onDiffOptionsChange}
          onOpenSource={() => review.onOpenSource(controller.activeHunkNewStart)}
          onPin={review.onPin}
          onRequestDiscard={requestDiscard}
          onClose={onClose}
        />
      ) : (
        <GitDiffHeader
          fileName={target.fileName}
          canDiscardFile={controller.canDiscardFile}
          onRequestDiscard={requestDiscard}
          onClose={onClose}
        />
      )}
      <GitDiffContent
        controller={controller}
        fallbackEditorTheme={resolvedTheme === "dark" ? "vs-dark" : "vs"}
        useTerminalTheme={useTerminalTheme}
        viewMode={viewMode}
      />
      <GitDiffSelectionBar
        controller={controller}
        whitespaceMode={diffOptions?.whitespace}
      />
    </div>
  );
}
