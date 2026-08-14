"use client";

// Native <select> lets us style the closed box, but the open options list is
// always rendered by the OS/browser and can't be styled with CSS — hence a
// hand-built dropdown here so the open list matches the app's design too.
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { STATUS_LABELS } from "@/components/StatusBadge";

export function StatusFilter({ statuses, value }: { statuses: string[]; value: string }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function select(nextValue: string) {
    setOpen(false);
    const params = new URLSearchParams();
    if (nextValue) params.set("status", nextValue);
    router.push(`/staff/visits${params.toString() ? `?${params}` : ""}`);
  }

  const selectedLabel = value ? (STATUS_LABELS[value] ?? value) : "Tümü";

  return (
    <div className="dropdown" ref={rootRef}>
      <button
        type="button"
        className="dropdown-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {selectedLabel}
        <ChevronDown size={16} strokeWidth={2} />
      </button>
      {open && (
        <ul className="dropdown-menu" role="listbox">
          <li role="option" aria-selected={value === ""}>
            <button type="button" className="dropdown-option" onClick={() => select("")}>
              Tümü
            </button>
          </li>
          {statuses.map((s) => (
            <li key={s} role="option" aria-selected={value === s}>
              <button
                type="button"
                className={`dropdown-option${value === s ? " dropdown-option-selected" : ""}`}
                onClick={() => select(s)}
              >
                {STATUS_LABELS[s] ?? s}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
