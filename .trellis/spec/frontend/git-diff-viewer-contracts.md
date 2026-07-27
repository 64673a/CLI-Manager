# Git Diff Viewer Contracts

## Data Source Boundary

- Shared Diff rendering consumes a discriminated `snapshot | live` data source.
- A snapshot contains text only and cannot expose mutation actions at the type level.
- A live source owns its loader and may inject explicit mutation capabilities.
- Viewer components and controllers must not invoke Tauri commands, inspect SSH state, or read the global Git Store directly.
- Local, WSL, macOS/Linux desktop, and SSH differences stay behind the caller-provided transport capability.

## Target Identity

- Every load is bound to a stable target identity plus file path, file name, and status.
- When target identity changes, the controller clears the previous selection and ignores completion from the old request.
- Consumers must not reuse a live source for a different repository context without changing target identity.

## Component Responsibilities

- `DiffViewerModal.tsx`: compatibility adapter, portal, overlay, and keyboard lifecycle only.
- `diff/useGitDiffController.ts`: load state, parsing, tokenization, selection, and mutation orchestration.
- `diff/GitDiffViewer.tsx`: composition only.
- `diff/GitDiffContent.tsx`: loading/error/empty/parsed/fallback rendering.
- `diff/GitDiffHeader.tsx`: file-level commands and close action.
- `diff/GitDiffSelectionBar.tsx`: partial-revert status and selected-line commands.
- `diff/types.ts`: target, data-source, mutation, parse, and controller contracts.

New navigation, display options, pinned-editor hosting, accessibility, and performance work must extend these boundaries instead of rebuilding a second Diff viewer.

## Compatibility

- Git changes use a live source with explicit load and mutation actions.
- File editor Diff uses an explicit project-bound live source.
- History and terminal-stat Diff use snapshots and remain read-only.
- Unsupported text parsing falls back to the existing read-only Monaco renderer; supported file types remain unchanged.

## Verification

Run:

```bash
npx tsc --noEmit
node --test scripts/gitDiffViewerArchitecture.test.mjs scripts/gitStoreRemote.test.mjs
```
