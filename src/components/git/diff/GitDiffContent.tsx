import { lazy, Suspense, useRef } from "react";
import { useI18n } from "../../../lib/i18n";
import type { GitDiffViewMode } from "../../../stores/settingsStore";
import { TERMINAL_DIFF_TABLE_STYLE } from "./theme";
import type { GitDiffController } from "./types";
import { GitDiffHunkList } from "./GitDiffHunkList";

const MonacoDiffFallback = lazy(() =>
  import("../MonacoDiffFallback").then((module) => ({ default: module.MonacoDiffFallback })),
);

interface GitDiffContentProps {
  controller: GitDiffController;
  fallbackEditorTheme: "vs" | "vs-dark";
  fileName: string;
  useTerminalTheme: boolean;
  viewMode: GitDiffViewMode;
}

export function GitDiffContent({
  controller,
  fallbackEditorTheme,
  fileName,
  useTerminalTheme,
  viewMode,
}: GitDiffContentProps) {
  const { t } = useI18n();
  const { diffText, loading, error, parsed } = controller;
  const contentRef = useRef<HTMLDivElement | null>(null);

  return (
    <div ref={contentRef} className="flex-1 overflow-auto p-4" style={{ backgroundColor: "var(--surface)" }}>
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
          style={useTerminalTheme
            ? TERMINAL_DIFF_TABLE_STYLE
            : { backgroundColor: "var(--surface-container-lowest)", borderColor: "var(--border)" }}
        >
          <GitDiffHunkList
            controller={controller}
            fileName={fileName}
            scrollElementRef={contentRef}
            viewMode={viewMode}
          />
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
