import { lazy, Suspense } from "react";
import { Decoration, Diff, Hunk } from "react-diff-view";
import { Undo2 } from "../../icons";
import { useI18n } from "../../../lib/i18n";
import type { GitDiffViewMode } from "../../../stores/settingsStore";
import { TERMINAL_DIFF_TABLE_STYLE } from "./theme";
import type { GitDiffController } from "./types";

const MonacoDiffFallback = lazy(() =>
  import("../MonacoDiffFallback").then((module) => ({ default: module.MonacoDiffFallback })),
);

interface GitDiffContentProps {
  controller: GitDiffController;
  fallbackEditorTheme: "vs" | "vs-dark";
  useTerminalTheme: boolean;
  viewMode: GitDiffViewMode;
}

export function GitDiffContent({
  controller,
  fallbackEditorTheme,
  useTerminalTheme,
  viewMode,
}: GitDiffContentProps) {
  const { t } = useI18n();
  const {
    diffText,
    loading,
    error,
    parsed,
    selectedKeys,
    reverting,
    canRevertHunks,
    canRevertLines,
    toggleSelectedChange,
    revertHunk,
    activeHunkIndex,
    goToHunk,
    registerHunkAnchor,
  } = controller;

  return (
    <div className="flex-1 overflow-auto p-4" style={{ backgroundColor: "var(--surface)" }}>
      {loading && (
        <div className="flex h-full items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div
              className="h-8 w-8 animate-spin rounded-full border-2"
              style={{ borderColor: "var(--success)", borderTopColor: "transparent" }}
            />
            <p className="text-sm text-text-muted">{t("git.diff.loading")}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="flex h-full items-center justify-center">
          <p className="max-w-md text-center text-sm" style={{ color: "var(--danger)" }}>{error}</p>
        </div>
      )}

      {!loading && !error && diffText && parsed && (
        <div
          className="diff-viewer-container overflow-hidden rounded-lg border shadow-sm"
          style={useTerminalTheme
            ? TERMINAL_DIFF_TABLE_STYLE
            : { backgroundColor: "var(--surface-container-lowest)", borderColor: "var(--border)" }}
        >
          <Diff
            viewType={viewMode}
            diffType={parsed.file.type}
            hunks={parsed.file.hunks}
            tokens={parsed.tokens}
            selectedChanges={selectedKeys}
            gutterEvents={canRevertLines ? { onClick: toggleSelectedChange } : undefined}
          >
            {(hunks) => hunks.flatMap((hunk, index) => [
              <Decoration key={`deco-${index}-${hunk.content}`}>
                <div
                  ref={(element) => registerHunkAnchor(index, element)}
                  data-git-diff-hunk-index={index}
                  aria-current={activeHunkIndex === index ? "location" : undefined}
                  onClick={() => goToHunk(index)}
                  className="flex items-center justify-between gap-2 px-3 py-1"
                  style={{
                    backgroundColor: activeHunkIndex === index
                      ? "var(--surface-container-high)"
                      : "var(--surface-container-low)",
                    borderTop: "1px solid color-mix(in srgb, var(--border) 20%, transparent)",
                  }}
                >
                  <span className="truncate text-[11px] text-text-muted">{hunk.content}</span>
                  {canRevertHunks && (
                    <button
                      type="button"
                      onClick={() => void revertHunk(index)}
                      disabled={reverting}
                      className="ui-focus-ring flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[11px] transition-opacity hover:opacity-80 disabled:opacity-40"
                      style={{ color: "var(--danger)" }}
                      title={t("git.diff.revertHunkTitle")}
                    >
                      <Undo2 size={11} />
                      {t("git.diff.revertHunk")}
                    </button>
                  )}
                </div>
              </Decoration>,
              <Hunk key={`hunk-${index}-${hunk.content}`} hunk={hunk} />,
            ])}
          </Diff>
        </div>
      )}

      {!loading && !error && diffText && !parsed && (
        <div
          className="diff-viewer-container h-full min-h-[320px] overflow-hidden rounded-lg border"
          style={useTerminalTheme
            ? TERMINAL_DIFF_TABLE_STYLE
            : { backgroundColor: "var(--surface-container-lowest)", borderColor: "var(--border)" }}
        >
          <Suspense fallback={null}>
            <MonacoDiffFallback value={diffText} theme={fallbackEditorTheme} />
          </Suspense>
        </div>
      )}

      {!loading && !error && !diffText && (
        <div className="flex h-full items-center justify-center">
          <p className="text-sm text-text-muted">{t("git.diff.noContent")}</p>
        </div>
      )}
    </div>
  );
}
