"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

export function Popover({
  anchorEl,
  onClose,
  className,
  children,
}: {
  anchorEl: HTMLElement;
  onClose: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const anchorRect = anchorEl.getBoundingClientRect();
    const width = el.offsetWidth || 250;
    const height = el.offsetHeight || 200;
    let left = Math.min(anchorRect.left, window.innerWidth - width - 12);
    left = Math.max(12, left);
    let top = anchorRect.bottom + 6;
    if (top + height > window.innerHeight - 12) {
      top = Math.max(12, window.innerHeight - height - 12);
    }
    setPos({ top, left });
  }, [anchorEl]);

  useEffect(() => {
    function handlePointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (ref.current?.contains(target) || anchorEl.contains(target)) return;
      onClose();
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [anchorEl, onClose]);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        position: "fixed",
        top: pos?.top ?? -9999,
        left: pos?.left ?? -9999,
        visibility: pos ? "visible" : "hidden",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  );
}
