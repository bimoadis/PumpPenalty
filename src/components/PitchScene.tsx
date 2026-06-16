"use client";

import React, { useRef, useState, useEffect } from "react";
import { GameState, Team } from "@/utils/types";
import { PixelKit, Keeper, Ball } from "./Sprites";

const SCENE_H = 244;

interface PitchSceneProps {
  gameState: GameState;
  yourTeam: Team;
  oppTeam: Team;
}

export default function PitchScene({ gameState, yourTeam, oppTeam }: PitchSceneProps) {
  const sceneRef = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(360);

  useEffect(() => {
    const measure = () => {
      if (sceneRef.current) {
        setW(sceneRef.current.offsetWidth);
      }
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // Remeasure when phase changes
  useEffect(() => {
    if (sceneRef.current) {
      setW(sceneRef.current.offsetWidth);
    }
  }, [gameState.phase]);

  const s = gameState.scene;
  const flying = s.ballFly;
  const miss = s.result === "MISS";
  const shotZone = s.shotZone ?? 1;
  const keeperZone = s.keeperZone ?? 1;

  const zx = (z: number) => (z - 1) * w * 0.27;
  const bx = flying ? zx(shotZone) * (miss ? 1.5 : 1) : 0;
  const by = flying ? -(SCENE_H * (miss ? 0.82 : 0.6)) : 0;
  const ballTransform = `translate(calc(-50% + ${bx}px), calc(-50% + ${by}px)) scale(${flying ? 0.5 : 1})`;

  const kx = flying ? zx(keeperZone) * 0.92 : 0;
  const ky = flying ? (keeperZone === 1 ? -12 : 0) : 0;
  const kdeg = flying ? (keeperZone - 1) * 26 : 0;
  const keeperTransform = `translate(calc(-50% + ${kx}px), calc(-50% + ${ky}px)) rotate(${kdeg}deg)`;

  const currentTurn = s.actor ?? gameState.turn;
  const shooter = currentTurn === "opp" ? oppTeam : yourTeam;
  const keeperTeam = currentTurn === "opp" ? yourTeam : oppTeam;
  const resColor =
    s.result === "GOAL"
      ? "var(--green)"
      : s.result === "SAVED"
      ? "var(--gold)"
      : "var(--gray)";

  return (
    <div
      ref={sceneRef}
      className="panel"
      style={{
        position: "relative",
        height: SCENE_H,
        overflow: "hidden",
        marginBottom: 12,
        background:
          "linear-gradient(180deg, #0a1410 0%, #0c2a1a 60%, #0e3320 100%)",
      }}
    >
      {/* goal frame */}
      <div
        style={{
          position: "absolute",
          top: 18,
          left: "9%",
          right: "9%",
          height: 104,
          border: "3px solid #e8edf0",
          borderBottom: "none",
          background:
            "repeating-linear-gradient(90deg, rgba(255,255,255,0.10) 0 1px, transparent 1px 13px), repeating-linear-gradient(0deg, rgba(255,255,255,0.10) 0 1px, transparent 1px 13px)",
        }}
      >
        {/* net flash on goal */}
        {s.showResult && s.result === "GOAL" && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "var(--green)",
              animation: "netflash .7s ease forwards",
            }}
          />
        )}
        {/* zone dividers */}
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: "33.3%",
            width: 1,
            background: "rgba(255,255,255,0.12)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: "66.6%",
            width: 1,
            background: "rgba(255,255,255,0.12)",
          }}
        />
      </div>

      {/* goal line */}
      <div
        style={{
          position: "absolute",
          top: 122,
          left: "6%",
          right: "6%",
          height: 2,
          background: "rgba(255,255,255,0.25)",
        }}
      />

      {/* penalty spot */}
      <div
        style={{
          position: "absolute",
          top: SCENE_H - 34,
          left: "50%",
          width: 6,
          height: 6,
          background: "#e8edf0",
          borderRadius: "50%",
          transform: "translateX(-50%)",
        }}
      />

      {/* keeper */}
      <div
        key={"k" + gameState.kickIndex}
        data-testid="keeper"
        style={{
          position: "absolute",
          left: "50%",
          top: 96,
          transform: keeperTransform,
          transition: "transform .4s ease-out",
          zIndex: 2,
        }}
      >
        <Keeper color={keeperTeam.color} size={42} />
      </div>

      {/* shooter */}
      <div
        data-testid="shooter"
        style={{
          position: "absolute",
          left: "50%",
          top: SCENE_H - 28,
          transform: `translate(calc(-50% - 26px), -50%) rotate(${
            flying ? -12 : 0
          }deg)`,
          transition: "transform .25s ease",
          zIndex: 1,
          opacity: 0.95,
        }}
      >
        <PixelKit color={shooter.color} size={26} />
      </div>

      {/* ball */}
      <div
        key={"b" + gameState.kickIndex}
        style={{
          position: "absolute",
          left: "50%",
          top: SCENE_H - 31,
          transform: ballTransform,
          transition: "transform .45s cubic-bezier(.3,.7,.4,1)",
          zIndex: 3,
        }}
      >
        <Ball size={16} />
      </div>

      {/* result overlay */}
      {s.showResult && (
        <div
          style={{
            position: "absolute",
            top: 40,
            left: 0,
            right: 0,
            textAlign: "center",
            zIndex: 4,
          }}
        >
          <div
            className="disp up"
            style={{
              fontSize: 40,
              fontWeight: 800,
              color: resColor,
              animation: "pop .3s ease both",
              textShadow: "0 2px 16px rgba(0,0,0,0.6)",
            }}
          >
            {s.result}
          </div>
        </div>
      )}

      {/* prompt */}
      {(gameState.phase === "shoot" || gameState.phase === "dive") && (
        <div
          style={{
            position: "absolute",
            bottom: 8,
            left: 0,
            right: 0,
            textAlign: "center",
            zIndex: 4,
          }}
        >
          <span
            className="mono up"
            style={{
              fontSize: 11,
              color:
                gameState.phase === "shoot"
                  ? "var(--green)"
                  : "var(--gold)",
            }}
          >
            {gameState.phase === "shoot" ? "Aim your shot" : "Dive to save"}
            <span style={{ animation: "blink 1s step-end infinite" }}>_</span>
          </span>
        </div>
      )}
    </div>
  );
}
