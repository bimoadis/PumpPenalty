"use client";

import React from "react";
import { Team } from "@/utils/types";
import { TEAMS } from "@/utils/constants";

interface TeamSelectProps {
  yourTeam: Team;
  oppTeam: Team;
  setYourTeam: (t: Team) => void;
  setOppTeam: (t: Team) => void;
  onStartGame: () => void;
}

export default function TeamSelect({
  yourTeam,
  oppTeam,
  setYourTeam,
  setOppTeam,
  onStartGame,
}: TeamSelectProps) {
  return (
    <section className="panel" style={{ padding: 14, marginBottom: 12 }}>
      <div className="lbl up" style={{ marginBottom: 8 }}>Your team</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
        {TEAMS.map((t) => {
          const sel = yourTeam.code === t.code;
          return (
            <button
              key={t.code}
              className="chip"
              onClick={() => {
                setYourTeam(t);
                if (oppTeam.code === t.code) {
                  const firstNotSame = TEAMS.find((x) => x.code !== t.code);
                  if (firstNotSame) setOppTeam(firstNotSame);
                }
              }}
              style={{
                borderColor: sel ? t.color : "var(--line)",
                background: sel ? "rgba(255,255,255,0.05)" : "#0a0e0f",
                color: sel ? t.color : "var(--text)",
              }}
            >
              {t.code} <span style={{ color: "var(--dim)" }}>{t.p}%</span>
            </button>
          );
        })}
      </div>

      <div className="lbl up" style={{ marginBottom: 8 }}>Opponent</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
        {TEAMS.map((t) => {
          const sel = oppTeam.code === t.code;
          const same = yourTeam.code === t.code;
          return (
            <button
              key={t.code}
              className="chip"
              disabled={same}
              onClick={() => setOppTeam(t)}
              style={{
                opacity: same ? 0.25 : 1,
                borderColor: sel ? t.color : "var(--line)",
                background: sel ? "rgba(255,255,255,0.05)" : "#0a0e0f",
                color: sel ? t.color : "var(--text)",
              }}
            >
              {t.code} <span style={{ color: "var(--dim)" }}>{t.p}%</span>
            </button>
          );
        })}
      </div>

      <div className="mono" style={{ fontSize: 11, color: "var(--gray)", marginBottom: 12, lineHeight: 1.5 }}>
        {yourTeam.name} sit at {yourTeam.p}% on Polymarket, {oppTeam.name} at {oppTeam.p}%. Higher implied odds means a slightly better striker and keeper. Reading the keeper still decides most kicks.
      </div>
      <button
        className="btn btn-green"
        style={{ width: "100%" }}
        onClick={onStartGame}
        disabled={yourTeam.code === oppTeam.code}
      >
        Start shootout
      </button>
    </section>
  );
}
