import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const tempDir = mkdtempSync(join(tmpdir(), "cli-manager-pi-terminal-"));
process.on("exit", () => rmSync(tempDir, { recursive: true, force: true }));

const source = readFileSync(
  new URL("../src/terminal/browser/TerminalPiCompatibility.ts", import.meta.url),
  "utf8",
);
const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
  fileName: "TerminalPiCompatibility.ts",
}).outputText;
const modulePath = join(tempDir, "TerminalPiCompatibility.mjs");
writeFileSync(modulePath, transpiled, "utf8");

const {
  createPiTerminalDiagnostics,
  isPiTerminalContext,
} = await import(pathToFileURL(modulePath).href);

const PI_CONTEXT = {
  projectTool: "pi",
  startupCmd: "pi",
  titleTool: "",
};

test("recognizes Pi from project tool, title, or startup command", () => {
  assert.equal(isPiTerminalContext(PI_CONTEXT), true);
  assert.equal(isPiTerminalContext({ projectTool: "", startupCmd: "", titleTool: "pi" }), true);
  assert.equal(isPiTerminalContext({ projectTool: "", startupCmd: "pi.ps1 --model test", titleTool: "" }), true);
  assert.equal(isPiTerminalContext({ projectTool: "", startupCmd: "pip install pi", titleTool: "" }), false);
  assert.equal(isPiTerminalContext({
    projectTool: "codex",
    startupCmd: "powershell",
    titleTool: "",
    outputHint: "\x1b[38;5;109;1mpi\x1b[38;5;241;22m v0.82.1",
  }), true);
});

test("records bounded raw and normalized summaries without rewriting Pi output", () => {
  const events = [];
  const diagnostics = createPiTerminalDiagnostics(
    "session-177",
    (message, payload) => events.push({ message, payload }),
    true,
  );
  diagnostics.updateContext(PI_CONTEXT);

  const output = "private-prefix\x1b[?2026h\x1b[48;5;59m\x1b[38;5;188mPI177-TEST\x1b[?2026lprivate-suffix";
  diagnostics.onFrame({
    kind: "output",
    sessionId: "session-177",
    sequence: 42,
    cols: 106,
    rows: 24,
    data: new Uint8Array(),
  }, output, output);

  assert.equal(events.length, 1);
  assert.equal(events[0].message, "[pi177] terminal frame");
  assert.equal(events[0].payload.raw.markerHits, 1);
  assert.equal(events[0].payload.raw.foreground188, 1);
  assert.equal(events[0].payload.raw.background59, 1);
  assert.equal(events[0].payload.raw.syncBegin, 1);
  assert.equal(events[0].payload.raw.syncEnd, 1);
  assert.equal(events[0].payload.raw.markerPreview.includes("PI177-TEST"), true);
  assert.equal(events[0].payload.raw.markerPreview.length < output.length + 20, true);
  assert.deepEqual(events[0].payload.raw, events[0].payload.normalized);
});

test("detects a marker split across daemon frames", () => {
  const events = [];
  const diagnostics = createPiTerminalDiagnostics("session-177", (_, payload) => events.push(payload), true);
  diagnostics.updateContext(PI_CONTEXT);
  const frame = {
    kind: "output",
    sessionId: "session-177",
    cols: 106,
    rows: 24,
    data: new Uint8Array(),
  };

  diagnostics.onFrame({ ...frame, sequence: 1 }, "PI1", "PI1");
  diagnostics.onFrame({ ...frame, sequence: 2 }, "77-SPLIT", "77-SPLIT");

  assert.equal(events[0].raw.markerHits, 0);
  assert.equal(events[1].raw.markerHits, 1);
  assert.equal(events[1].raw.markerPreview, "PI177-SPLIT");
});

test("activates when Pi is launched inside a generic shell session", () => {
  const events = [];
  const diagnostics = createPiTerminalDiagnostics("session-177", (_, payload) => events.push(payload), true);
  diagnostics.updateContext({ projectTool: "codex", startupCmd: "powershell", titleTool: "" });
  const frame = {
    kind: "output",
    sessionId: "session-177",
    cols: 106,
    rows: 24,
    data: new Uint8Array(),
  };

  diagnostics.onFrame({ ...frame, sequence: 1 }, "\x1b[38;5;109;1mpi\x1b[38;5;241;22m v0.", "");
  diagnostics.onFrame({ ...frame, sequence: 2 }, "82.1\r\n", "");

  assert.equal(events.length, 1);
  assert.equal(events[0].sequence, 2);
});

test("uses the explicit marker as a development diagnostic trigger", () => {
  const events = [];
  const diagnostics = createPiTerminalDiagnostics("session-177", (_, payload) => events.push(payload), true);
  diagnostics.updateContext({ projectTool: "codex", startupCmd: "powershell", titleTool: "" });
  diagnostics.onFrame({
    kind: "output",
    sessionId: "session-177",
    sequence: 1,
    cols: 106,
    rows: 24,
    data: new Uint8Array(),
  }, "\x1b[38;5;188mPI177-EXPLICIT", "\x1b[38;5;188mPI177-EXPLICIT");

  assert.equal(events.length, 1);
  assert.equal(events[0].raw.markerHits, 1);
});

test("stays silent for non-Pi sessions and when diagnostics are disabled", () => {
  const events = [];
  const frame = {
    kind: "output",
    sessionId: "session-177",
    sequence: 1,
    cols: 106,
    rows: 24,
    data: new Uint8Array(),
  };
  const nonPi = createPiTerminalDiagnostics("session-177", (_, payload) => events.push(payload), true);
  nonPi.updateContext({ projectTool: "codex", startupCmd: "codex", titleTool: "" });
  nonPi.onFrame(frame, "ordinary non-Pi output", "ordinary non-Pi output");

  const disabled = createPiTerminalDiagnostics("session-177", (_, payload) => events.push(payload), false);
  disabled.updateContext(PI_CONTEXT);
  disabled.onFrame(frame, "PI177-DISABLED", "PI177-DISABLED");

  assert.deepEqual(events, []);
});
