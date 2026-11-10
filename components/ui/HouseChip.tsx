"use client";

import type { House } from "@/lib/constants";
import { HOUSE_META } from "@/lib/constants";

export function HouseChip({
  house,
  size = "md",
}: {
  house: House;
  size?: "sm" | "md";
}) {
  const meta = HOUSE_META[house];
  return (
    <span
      className={`house-chip ${size === "sm" ? "px-2 py-0.5 text-[11px]" : ""}`}
      style={{
        backgroundColor: meta.tint,
        borderColor: `${meta.hex}40`,
        color: meta.text,
      }}
    >
      <span
        aria-hidden="true"
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: meta.hex }}
      />
      House {house}
    </span>
  );
}

export function HouseLegend() {
  return (
    <div className="flex flex-wrap gap-1.5">
      {(["A", "B", "C", "D"] as House[]).map((house) => (
        <HouseChip key={house} house={house} size="sm" />
      ))}
    </div>
  );
}
