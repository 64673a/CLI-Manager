import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const tempDir = mkdtempSync(join(tmpdir(), "cli-manager-pane-marker-"));
process.on("exit", () => rmSync(tempDir, { recursive: true, force: true }));

const source = readFileSync(new URL("../src/lib/terminalPaneMarker.ts", import.meta.url), "utf8");
const output = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
}).outputText;
const modulePath = join(tempDir, "terminalPaneMarker.mjs");
writeFileSync(modulePath, output, "utf8");

const {
  DEFAULT_TERMINAL_PANE_MARKER_FOCUS_COLOR,
  DEFAULT_TERMINAL_PANE_MARKER_SETTINGS,
  resolveTerminalPaneMarker,
  sanitizeTerminalPaneMarkerSettings,
} = await import(pathToFileURL(modulePath).href);

const resolve = (overrides = {}) => resolveTerminalPaneMarker({
  isLayoutVisible: true,
  isAppFocused: true,
  isPaneFocused: true,
  isMainSession: true,
  hookStatus: "none",
  settings: DEFAULT_TERMINAL_PANE_MARKER_SETTINGS,
  ...overrides,
});

test("missing settings migrate to enabled defaults", () => {
  assert.deepEqual(sanitizeTerminalPaneMarkerSettings(undefined), {
    style: "tab-frame",
    doneColor: "#8FBF7F",
    failedColor: "#F7768E",
    attentionColor: "#FF9E64",
  });
});

test("Pane marker settings participate in preference sync", () => {
  const syncSettings = readFileSync(new URL("../src/lib/syncSettings.ts", import.meta.url), "utf8");
  assert.match(syncSettings, /terminalPaneMarker:\s*"preferences"/);
});

test("Pane marker overlay is anchored inside terminal content instead of the Tab bar", () => {
  const terminalTabs = readFileSync(new URL("../src/components/TerminalTabs.tsx", import.meta.url), "utf8");
  assert.match(
    terminalTabs,
    /className="ui-terminal-pane-content[\s\S]*?<PaneContentDropZones[\s\S]*?className="ui-terminal-pane-marker"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*\);/,
  );
  assert.doesNotMatch(terminalTabs, /ui-terminal-pane-marker__tab-bottom/);
});

test("invalid style and colors fall back independently", () => {
  assert.deepEqual(sanitizeTerminalPaneMarkerSettings({
    style: "shadow",
    doneColor: "#112233",
    failedColor: "red",
    attentionColor: "#abcdef",
  }), {
    style: "tab-frame",
    doneColor: "#112233",
    failedColor: "#F7768E",
    attentionColor: "#ABCDEF",
  });
});

test("focused Pane uses the default focus color at 2px and full opacity", () => {
  assert.equal(DEFAULT_TERMINAL_PANE_MARKER_FOCUS_COLOR, "#51A0CC");
  assert.deepEqual(resolve(), {
    status: "focus",
    color: "#51A0CC",
    width: 2,
    opacity: 1,
  });
});

test("app blur removes focus emphasis but keeps background Hook states", () => {
  assert.equal(resolve({ isAppFocused: false }), null);
  assert.deepEqual(resolve({ isAppFocused: false, hookStatus: "done" }), {
    status: "done",
    color: "#8FBF7F",
    width: 1,
    opacity: 0.5,
  });
});

test("done, failed and attention override the focused Pane color", () => {
  assert.equal(resolve({ hookStatus: "done" }).color, "#8FBF7F");
  assert.equal(resolve({ hookStatus: "failed" }).color, "#F7768E");
  assert.equal(resolve({ hookStatus: "attention" }).color, "#FF9E64");
  assert.equal(resolve({ hookStatus: "attention" }).width, 2);
});

test("background running and non-main Pane Hook state do not render", () => {
  assert.equal(resolve({ isPaneFocused: false, hookStatus: "running" }), null);
  assert.equal(resolve({ isPaneFocused: false, hookStatus: "failed", isMainSession: false }), null);
});

test("only the visible Workspan active Tab participates", () => {
  assert.equal(resolve({ isLayoutVisible: false, hookStatus: "attention" }), null);
  assert.deepEqual(resolve({
    isPaneFocused: false,
    hookStatus: "done",
  }), {
    status: "done",
    color: "#8FBF7F",
    width: 1,
    opacity: 0.5,
  });
});
