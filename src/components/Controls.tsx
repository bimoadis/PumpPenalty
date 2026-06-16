"use client";

import React from "react";
import { Zone } from "@/utils/types";

const ZONES: string[] = ["Left", "Center", "Right"];

interface ControlsProps {
  phase: "select" | "shoot" | "dive" | "anim" | "done";
  busy: boolean;
  onSelectZone: (zone: Zone) => void;
}

export default function Controls({ phase, busy, onSelectZone }: ControlsProps) {
  if (phase === "anim") {
    return (
      <div style={{ textAlign: "center", marginBottom: 12 }}>
        <span className="mono up" style={{ fontSize: 11, color: "var(--dim)" }}>
          resolving
          <span style={{ animation: "blink 1s step-end infinite" }}>_</span>
        </span>
      </div>
    );
  }

  if (phase !== "shoot" && phase !== "dive") {
    return null;
  }

  const isShoot = phase === "shoot";
  const btnClass = isShoot ? "btn-green" : "btn-gold";

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        gap: 8,
        marginBottom: 12,
      }}
    >
      {ZONES.map((z, i) => (
        <button
          key={z}
          className={`btn ${btnClass}`}
          disabled={busy}
          onClick={() => onSelectZone(i as Zone)}
        >
          {z}
        </button>
      ))}
    </div>
  );
}
