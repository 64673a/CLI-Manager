import type { Terminal } from "@xterm/xterm";
import type { TerminalImeAnchor } from "../../lib/terminalIme";

const PI_COMPOSER_RULE_PATTERN = /^[─━═╌╍┄┅┈┉╴╶]+$/u;
const PI_IME_RULE_LOOKAHEAD_ROWS = 6;

export function resolvePiImeTextareaAnchor(
  terminal: Terminal,
  anchor: TerminalImeAnchor,
): TerminalImeAnchor {
  const buffer = terminal.buffer.active;
  const lastRow = Math.min(terminal.rows - 1, anchor.y + PI_IME_RULE_LOOKAHEAD_ROWS);
  let bottomRuleRow: number | null = null;

  for (let row = anchor.y + 1; row <= lastRow; row += 1) {
    const line = buffer.getLine(buffer.viewportY + row);
    const text = line?.translateToString(true).trim() ?? "";
    if (text && PI_COMPOSER_RULE_PATTERN.test(text)) bottomRuleRow = row;
  }

  return bottomRuleRow === null ? anchor : { x: anchor.x, y: bottomRuleRow };
}
