# Technical Design

## Responsibility Boundaries

- `TerminalCliContext.ts`：统一解析 session/project CLI 身份。
- `TerminalPiIme.ts`：限定行扫描并返回最后一条 Pi composer 底边。
- `TerminalPiAnsiTransform.ts`：状态化 CSI 解析与精确 SGR 背景替换。
- `TerminalPiDiagnostics.ts`：开发期有界诊断。
- `TerminalPiCompatibility.ts`：Pi 激活状态、门面和子模块协调。
- `XTermTerminal.tsx`：只组合 Pi 输出转换与既有光标转换，透传 IME 策略。
- `historyResumeCommand.ts`：本地历史恢复命令与 Pi 专用参数清理。
- `historyResumeProject.ts`：来源匹配与本地项目选择。

## ANSI Contract

- RGB 只匹配 Pi 0.82.1 内置 dark/light 的 pending/success/error 值。
- 256 色只替换无歧义的 22/52/255；17/254 保留。
- 不解析或改写 OSC；不丢弃被 frame 拆分的 CSI；reset 丢弃未完成残片。
- 禁止访问 xterm 私有 `_line/loadCell/setCell`。

## PTY Contract

- 最终环境缺省补 `COLORTERM=truecolor`。
- Windows 不增改 `TERM`；非 Windows 缺省补 `TERM=xterm-256color`。
- WSLENV 按变量名去重转发 `COLORTERM`，保留 flag 和原条目。

## Resume Contract

- Pi：`pi --session <id>`；不得使用 `--session-id`。
- Pi 参数清理独立于现有 Claude/Codex/Grok helper。
- 精确 Worktree 和正确来源优先；错误来源的当前项目不能自动绑定。

## Rollback

移除 Pi facade 接线、PTY 能力默认值和 Pi resume capability 即可；现有三种 CLI 恢复语义不变。
