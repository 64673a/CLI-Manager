import { useEffect, useRef, type ReactNode } from "react";
import { Portal } from "../../ui/Portal";

interface GitDiffDialogFrameProps {
  open: boolean;
  onClose: () => void;
  ariaLabel: string;
  children: ReactNode;
  focusOnOpen?: boolean;
}

export function GitDiffDialogFrame({
  open,
  onClose,
  ariaLabel,
  children,
  focusOnOpen = true,
}: GitDiffDialogFrameProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open && focusOnOpen) dialogRef.current?.focus();
  }, [focusOnOpen, open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.isComposing) return;
      event.preventDefault();
      event.stopPropagation();
      onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  if (!open) return null;
  return (
    <Portal>
      <div
        className="fixed inset-0 flex items-center justify-center bg-black/60 p-2 sm:p-4"
        style={{ zIndex: 100 }}
        onClick={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
      >
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label={ariaLabel}
          tabIndex={-1}
          className="ui-focus-ring h-[85vh] w-full max-w-6xl overflow-hidden rounded-lg border shadow-2xl"
          style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
          onClick={(event) => event.stopPropagation()}
        >
          {children}
        </div>
      </div>
    </Portal>
  );
}
