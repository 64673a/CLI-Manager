# Issue #177：Pi 终端兼容与历史恢复

## Goal

在 V1.3.3 根因修复 Pi 0.82.1 的中文输入法定位、工具状态背景和本地历史恢复问题。

## Root Causes

- IME 扫描遇到第一条横线即返回，把 composer 内部分隔线误认成底边。
- Windows PTY 未声明 truecolor，Pi 降级到存在颜色冲突的 256 色；旧方案还依赖 xterm 私有缓冲区写 API。
- Pi 已进入历史来源注册表，但来源匹配、恢复命令和当前项目选择未同步接入。

## Requirements

- 组合文字保持真实输入行；helper textarea 使用限定范围内最后一条 composer 底边。
- Windows 默认补 `COLORTERM=truecolor` 且不改 `TERM`；非 Windows 保持
  `TERM=xterm-256color`；WSL 通过 `WSLENV` 转发 `COLORTERM`。
- 写入 xterm 前用可跨 frame 的 CSI 转换器清除 Pi 内置深浅主题工具状态背景；保留前景、用户/自定义背景、Diff 与其他 ANSI/OSC。
- live、replay、初始序列化快照共用转换器，reset/dispose 清空残片。
- Pi 本地恢复使用 `pi --session <session-id>`，清理冲突 Pi 参数并保留普通参数。
- 项目选择顺序固定为 Worktree、来源+cwd/project-key、当前筛选项目、唯一候选、选择框。
- SSH Pi 恢复不在本次范围；不新增依赖、不修改 Pi 安装目录。

## Acceptance

- 定向 IME、ANSI、PTY 环境与历史恢复回归通过。
- `npx tsc --noEmit`、定向 Rust 测试、`cargo check` 通过。
- 新建 PowerShell Pi 终端手工验证候选框、三种工具状态和历史恢复。

## Changelog Target

`V1.3.3`
