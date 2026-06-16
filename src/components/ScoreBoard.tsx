"use client";

import React from "react";
import { GameState, Team, KickResult } from "@/utils/types";
import { PixelKit } from "./Sprites";

interface ScoreDotsProps {
  kicks: KickResult[];
}

function ScoreDots({ kicks }: ScoreDotsProps) {
  const cells = Array.from({ length: Math.max(5, kicks.length) });
  return (
    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
      {cells.map((_, i) => {
        const k = kicks[i];
        const c = k === "GOAL" ? "var(--green)" : k === undefined ? "transparent" : "var(--red)";
        const bc = k === undefined ? "var(--line)" : c;
        return (
          <span
            key={i}
            title={k || ""}
            style={{
              width: 11,
              height: 11,
              border: `1px solid ${bc}`,
              background: c,
              borderRadius: "50%",
            }}
          />
        );
      })}
    </div>
  );
}

interface ScoreBoardProps {
  gameState: GameState;
  yourTeam: Team;
  oppTeam: Team;
}

export default function ScoreBoard({ gameState, yourTeam, oppTeam }: ScoreBoardProps) {
  const { ys, os, yk, ok, round, phase } = gameState;
  const sdLabel = round > 5 ? `Sudden death ${round - 5}` : `Round ${round} of 5`;

  return (
    <div className="panel" style={{ padding: 12, marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <PixelKit color={yourTeam.color} size={26} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="mono" style={{ fontSize: 12, fontWeight: 700 }}>
            YOU <span style={{ color: yourTeam.color }}>{yourTeam.code}</span>
          </div>
          <ScoreDots kicks={yk} />
        </div>
        <div className="disp" style={{ fontSize: 30, fontWeight: 800 }}>
          <span style={{ color: "var(--green)" }}>{ys}</span>
          <span style={{ color: "var(--dim)", margin: "0 6px" }}>:</span>
          <span style={{ color: "var(--text)" }}>{os}</span>
        </div>
        <div style={{ flex: 1, minWidth: 0, textAlign: "right" }}>
          <div className="mono" style={{ fontSize: 12, fontWeight: 700 }}>
            <span style={{ color: oppTeam.color }}>{oppTeam.code}</span> OPP
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <ScoreDots kicks={ok} />
          </div>
        </div>
        <PixelKit color={oppTeam.color} size={26} />
      </div>
      <hr className="hr" style={{ margin: "10px 0 8px" }} />
      <div className="lbl up" style={{ textAlign: "center" }}>
        {phase === "done" ? "Full time" : sdLabel}
      </div>
    </div>
  );
}
