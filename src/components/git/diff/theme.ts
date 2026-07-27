import type { CSSProperties } from "react";

export const TERMINAL_DIFF_ROOT_STYLE = {
  "--surface": "var(--terminal-theme-background, #0c0e10)",
  "--surface-container-low": "color-mix(in srgb, var(--terminal-theme-background, #0c0e10) 86%, var(--terminal-theme-foreground, #f8fafc) 8%)",
  "--surface-container-lowest": "color-mix(in srgb, var(--terminal-theme-background, #0c0e10) 94%, var(--terminal-theme-foreground, #f8fafc) 4%)",
  "--text-primary": "var(--terminal-theme-foreground, #f8fafc)",
  "--text-muted": "var(--file-editor-muted, var(--terminal-theme-muted, #94a3b8))",
  "--border": "var(--file-editor-border, color-mix(in srgb, var(--terminal-theme-foreground, #f8fafc) 13%, transparent))",
  backgroundColor: "var(--terminal-theme-background, #0c0e10)",
  borderColor: "var(--file-editor-border, color-mix(in srgb, var(--terminal-theme-foreground, #f8fafc) 13%, transparent))",
} as CSSProperties;

export const DEFAULT_DIFF_ROOT_STYLE = {
  backgroundColor: "var(--surface)",
  borderColor: "var(--border)",
} as CSSProperties;

export const TERMINAL_DIFF_TABLE_STYLE = {
  "--git-diff-bg": "color-mix(in srgb, var(--terminal-theme-background, #0c0e10) 91%, var(--terminal-theme-foreground, #f8fafc) 5%)",
  "--git-diff-gutter-bg": "color-mix(in srgb, var(--terminal-theme-background, #0c0e10) 84%, var(--terminal-theme-foreground, #f8fafc) 8%)",
  "--git-diff-border": "var(--file-editor-border, color-mix(in srgb, var(--terminal-theme-foreground, #f8fafc) 13%, transparent))",
  "--git-diff-text": "var(--terminal-theme-foreground, #f8fafc)",
  "--git-diff-muted": "var(--file-editor-muted, var(--terminal-theme-muted, #94a3b8))",
  "--git-diff-hunk-bg": "color-mix(in srgb, var(--terminal-theme-background, #0c0e10) 76%, var(--terminal-theme-accent, #60a5fa) 18%)",
  "--git-diff-hunk-text": "var(--terminal-theme-accent, #60a5fa)",
  "--git-diff-insert-bg": "color-mix(in srgb, var(--term-panel-green, #3dd68c) 15%, transparent)",
  "--git-diff-insert-gutter-bg": "color-mix(in srgb, var(--term-panel-green, #3dd68c) 22%, var(--terminal-theme-background, #0c0e10) 78%)",
  "--git-diff-insert-decoration": "color-mix(in srgb, var(--term-panel-green, #3dd68c) 34%, transparent)",
  "--git-diff-delete-bg": "color-mix(in srgb, var(--term-panel-red, #ff6b6b) 15%, transparent)",
  "--git-diff-delete-gutter-bg": "color-mix(in srgb, var(--term-panel-red, #ff6b6b) 22%, var(--terminal-theme-background, #0c0e10) 78%)",
  "--git-diff-delete-decoration": "color-mix(in srgb, var(--term-panel-red, #ff6b6b) 34%, transparent)",
  backgroundColor: "var(--surface-container-lowest)",
  borderColor: "var(--border)",
} as CSSProperties;
