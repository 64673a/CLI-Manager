# Implementation Plan

1. 完成远端同步、Trellis 规范读取、修复分诊和 GitNexus impact。
2. 按 IME / ANSI / diagnostics / facade 拆分 Pi 兼容模块并统一输出接线。
3. 在 PTY 环境边界补 truecolor 与 WSLENV 转发。
4. 抽取 Pi 历史恢复命令、参数清理和项目选择逻辑。
5. 更新 V1.3.3 Changelog、功能清单和前后端契约。
6. 运行 TypeScript、定向 Node、定向 Rust、cargo check、diff check 和 GitNexus detect_changes。
7. 不运行 dev/build/Tauri 启动命令；由用户新建 PowerShell Pi 终端手工验收。

## Risk

- `PtyManager.create_with_launch`：CRITICAL；仅补缺省环境值，不改签名或生命周期。
- `XTermTerminal` / `useTerminalDisplay`：LOW；只接入共享转换与 reset。
- 历史恢复：LOW；Pi 使用独立 helper，保留 Claude/Codex/Grok 行为。
