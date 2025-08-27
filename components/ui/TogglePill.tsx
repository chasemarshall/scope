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

/**
 * Circle → pill that expands width-only (height fixed to 32px).
 * Uses measurement + CSS transition for a smooth animation.
 * Icon is perfectly centered inside a 32×32 circle.
 */
export default function TogglePill({ label, icon, active = false, onToggle }: Props) {
  const Icon = icon === "search" ? Search : Brain;

  const measureRef = useRef<HTMLSpanElement>(null);
  const [labelW, setLabelW] = useState(0);

  useLayoutEffect(() => {
    if (measureRef.current) {
      setLabelW(Math.ceil(measureRef.current.getBoundingClientRect().width));
    }
  }, [label]);

  const CIRCLE = 32;             // collapsed circle width/height
  const GAP = active ? 6 : 0;    // space between icon and text when open
  const PAD_R = active ? 10 : 0; // padding right when open
  const width = active ? CIRCLE + GAP + labelW + PAD_R : CIRCLE;

  return (
    <button
      type="button"
      onClick={() => onToggle?.(!active)}
      className={[
        "relative overflow-hidden rounded-full border h-8 grid",
        "grid-cols-[32px_1fr] items-center select-none",
        active
          ? "bg-blue-500/20 border-blue-400/40 text-blue-300 shadow-[0_0_0_1px_rgba(59,130,246,0.25)]"
          : "bg-neutral-900/60 border-neutral-700 text-neutral-300 hover:bg-neutral-800",
      ].join(" ")}
      style={{
        width,
        willChange: "width",
        transition:
          "width 180ms cubic-bezier(0.2,0,0,1), background-color 150ms, border-color 150ms, color 150ms",
      }}
      aria-pressed={active}
    >
      {/* Icon circle (always 32×32 and centered) */}
      <span className="flex items-center justify-center w-8 h-8">
        <Icon size={16} />
      </span>

      {/* Visible label */}
      <span
        className={[
          "text-xs font-medium overflow-hidden",
          active ? "opacity-100" : "opacity-0",
        ].join(" ")}
        style={{
          transition: "opacity 160ms ease",
          marginLeft: active ? 6 : 0,
          paddingRight: active ? 10 : 0,
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>

      {/* Invisible measurer */}
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
