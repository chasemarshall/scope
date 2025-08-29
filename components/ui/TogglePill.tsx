"use client";
import React, { useLayoutEffect, useRef, useState } from "react";
import { Search, Brain } from "lucide-react";

type ToggleIcon = "search" | "think";
type Props = {
  label: string;
  icon: ToggleIcon;
  active?: boolean;
  onToggle?: (next: boolean) => void;
};

// Layout constants
const LAYOUT = {
  CIRCLE_SIZE: 32,
  ACTIVE_GAP: 6,
  ACTIVE_PADDING_RIGHT: 10,
  TRANSITION_DURATION: "180ms",
  OPACITY_TRANSITION: "160ms",
} as const;

export default function TogglePill({ label, icon, active = false, onToggle }: Props) {
  const Icon = icon === "search" ? Search : Brain;
  const measureRef = useRef<HTMLSpanElement>(null);
  const [labelW, setLabelW] = useState(0);

  useLayoutEffect(() => {
    if (measureRef.current) {
      setLabelW(Math.ceil(measureRef.current.getBoundingClientRect().width));
    }
  }, [label]);

  const GAP = active ? LAYOUT.ACTIVE_GAP : 0;
  const PAD_R = active ? LAYOUT.ACTIVE_PADDING_RIGHT : 0;
  const width = active ? LAYOUT.CIRCLE_SIZE + GAP + labelW + PAD_R : LAYOUT.CIRCLE_SIZE;

  return (
    <button
      type="button"
      onClick={() => onToggle?.(!active)}
      className={[
        "relative overflow-hidden rounded-full border h-8 grid grid-cols-[32px_1fr] items-center select-none",
        active
          ? "bg-blue-500/20 border-blue-400/40 text-blue-300 shadow-[0_0_0_1px_rgba(59,130,246,0.25)]"
          : "bg-neutral-900/60 border-neutral-700 text-neutral-300 hover:bg-neutral-800",
      ].join(" ")}
      style={{
        width,
        transition: `width ${LAYOUT.TRANSITION_DURATION} cubic-bezier(0.2,0,0,1), background-color 150ms, border-color 150ms, color 150ms`,
        willChange: "width",
      }}
      aria-pressed={active}
      aria-label={`${active ? 'Disable' : 'Enable'} ${label}`}
    >
      <span className="flex items-center justify-center w-8 h-8">
        <Icon size={16} />
      </span>
      <span
        className={[
          "text-xs font-medium overflow-hidden",
          active ? "opacity-100" : "opacity-0",
        ].join(" ")}
        style={{
          transition: `opacity ${LAYOUT.OPACITY_TRANSITION} ease`,
          marginLeft: active ? LAYOUT.ACTIVE_GAP : 0,
          paddingRight: active ? LAYOUT.ACTIVE_PADDING_RIGHT : 0,
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
      <span
        ref={measureRef}
        className="absolute -z-10 opacity-0 pointer-events-none text-xs font-medium"
        style={{ whiteSpace: "nowrap" }}
      >
        {label}
      </span>
    </button>
  );
}
