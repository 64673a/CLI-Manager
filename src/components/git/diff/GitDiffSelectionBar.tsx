import { Undo2 } from "../../icons";
import { useI18n } from "../../../lib/i18n";
import type { GitDiffController } from "./types";

interface GitDiffSelectionBarProps {
  controller: GitDiffController;
}

export function GitDiffSelectionBar({ controller }: GitDiffSelectionBarProps) {
  const { t } = useI18n();
  const {
    parsed,
    selectedKeys,
    reverting,
    canRevertLines,
    partialRevertUnavailable,
    clearSelection,
    revertSelectedLines,
  } = controller;

  return (
    <>
      {partialRevertUnavailable && (
        <div
          className="border-t px-4 py-2 text-[11px]"
          style={{
            borderColor: "color-mix(in srgb, var(--border) 24%, transparent)",
            backgroundColor: "var(--surface-container-low)",
            color: "var(--text-muted)",
          }}
        >
          {t("git.diff.nonUtf8PartialRevertDisabled")}
        </div>
      )}

      {canRevertLines && parsed && (
        <div
          className="flex items-center justify-between gap-3 border-t px-4 py-2 text-[11px]"
          style={{
            borderColor: "color-mix(in srgb, var(--border) 24%, transparent)",
            backgroundColor: "var(--surface-container-low)",
            color: "var(--text-muted)",
          }}
        >
          <span>{t("git.diff.selectLineHint")}</span>
          {selectedKeys.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-text-primary">{t("git.diff.selectedLines", { count: selectedKeys.length })}</span>
              <button
                type="button"
                onClick={clearSelection}
                className="ui-focus-ring rounded px-2 py-0.5 transition-opacity hover:opacity-80"
                style={{ color: "var(--text-muted)" }}
              >
                {t("git.diff.clearSelection")}
              </button>
              <button
                type="button"
                onClick={() => void revertSelectedLines()}
                disabled={reverting}
                className="ui-focus-ring flex items-center gap-1 rounded px-2 py-0.5 transition-opacity hover:opacity-80 disabled:opacity-40"
                style={{
                  color: "var(--danger)",
                  border: "1px solid color-mix(in srgb, var(--danger) 26%, var(--border))",
                }}
              >
                <Undo2 size={11} />
                {t("git.diff.revertSelectedLines", { count: selectedKeys.length })}
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
