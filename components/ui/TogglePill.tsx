"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Search, Cpu } from "lucide-react";

type ToggleIcon = "search" | "think";

type Props = {
  label: string;
  icon: ToggleIcon;
  active?: boolean;
  onToggle?: (next: boolean) => void;
};

const Icon = ({ name }: { name: ToggleIcon }) => {
  if (name === "search") return <Search size={16} />;
  return <Cpu size={16} />;
};

/**
 * Starts as a circular icon.
 * When active, expands into a pill with label + subtle blue highlight.
 */
export default function TogglePill({ label, icon, active = false, onToggle }: Props) {
  return (
    <button
      onClick={() => onToggle?.(!active)}
      className={[
        "flex items-center overflow-hidden rounded-full border transition-all duration-200",
        active
          ? "bg-blue-500/20 border-blue-400/40 text-blue-300 shadow-[0_0_0_1px_rgba(59,130,246,0.25)]"
          : "bg-neutral-900/60 border-neutral-700 text-neutral-300 hover:bg-neutral-800",
      ].join(" ")}
      style={{
        padding: active ? "0.35rem 0.75rem 0.35rem 0.5rem" : "0.5rem",
        minWidth: active ? undefined : 34,
        minHeight: 34
      }}
      aria-pressed={active}
    >
      <Icon name={icon} />
      <AnimatePresence>
        {active && (
          <motion.span
            className="ml-1 text-xs font-medium"
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "auto" }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.18 }}
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}
