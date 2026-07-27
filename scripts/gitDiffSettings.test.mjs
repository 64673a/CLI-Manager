import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("Git diff view mode defaults to split and validates persisted values", () => {
  const settings = read("../src/stores/settingsStore.ts");
  assert.match(settings, /gitDiffViewMode:\s*"split"/);
  assert.match(settings, /entries\.gitDiffViewMode === "split" \|\| entries\.gitDiffViewMode === "unified"/);
  assert.match(settings, /: DEFAULTS\.gitDiffViewMode/);
});

test("Git diff view mode participates in preference sync", () => {
  const syncSettings = read("../src/lib/syncSettings.ts");
  assert.match(syncSettings, /gitDiffViewMode:\s*"preferences"/);
});
