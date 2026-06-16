"use client";

import React, { useState, useRef, useEffect } from "react";
import { Team, Zone, KickResult, GameState } from "@/utils/types";
import { TEAMS } from "@/utils/constants";
import { sha256Hex, randHex } from "@/utils/crypto";
import { PixelKit } from "@/components/Sprites";
import TeamSelect from "@/components/TeamSelect";
import ScoreBoard from "@/components/ScoreBoard";
import PitchScene from "@/components/PitchScene";
import Controls from "@/components/Controls";
import ProvablyFairPanel from "@/components/ProvablyFairPanel";

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

function outcome(
  shooter: Team,
  keeper: Team,
  shotZone: Zone,
  keeperZone: Zone,
  hash: string
): { result: KickResult; roll: number; conv: number } {
  const roll = parseInt(hash.slice(2, 10), 16) / 0xffffffff;
  const ss = shooter.p / 16;
  const ks = keeper.p / 16;
  if (shotZone === keeperZone) {
    const conv = clamp(0.12 + 0.3 * ss - 0.12 * ks, 0.05, 0.5);
    return { result: roll < conv ? "GOAL" : "SAVED", roll, conv };
  }
  const conv = clamp(0.8 + 0.15 * ss, 0.6, 0.97);
  return { result: roll < conv ? "GOAL" : "MISS", roll, conv };
}

const zoneFromHash = (hash: string): Zone => (parseInt(hash.slice(0, 2), 16) % 3) as Zone;

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [serverHash, setServerHash] = useState("");
  const [clientSeed, setClientSeed] = useState("");
  const [sessionToken, setSessionToken] = useState("");
  const [revealedServerSeed, setRevealedServerSeed] = useState("");
  const [yourTeam, setYourTeam] = useState<Team>(TEAMS[0]);
  const [oppTeam, setOppTeam] = useState<Team>(TEAMS[1]);
  const [teamsList, setTeamsList] = useState<Team[]>(TEAMS);
  const [loadingOdds, setLoadingOdds] = useState(false);
  const [oddsSource, setOddsSource] = useState<"static" | "polymarket" | "simulation" | "fallback">("static");

  const stateRef = useRef<GameState>({
    phase: "select",
    round: 1,
    turn: "you",
    ys: 0,
    os: 0,
    yk: [],
    ok: [],
    scene: { ballFly: false },
    kickIndex: 0,
    winner: null,
    nonce: 0,
    lastHash: "",
    busy: false,
  });

  const [gameState, setGameState] = useState<GameState>(stateRef.current);

  const updateState = (updater: (draft: GameState) => void) => {
    updater(stateRef.current);
    setGameState({
      ...stateRef.current,
      scene: { ...stateRef.current.scene },
      yk: [...stateRef.current.yk],
      ok: [...stateRef.current.ok],
    });
  };

  const fetchLiveOdds = async () => {
    setLoadingOdds(true);
    try {
      const res = await fetch("/api/odds");
      if (!res.ok) throw new Error("Failed to fetch live odds");
      const data = await res.json();
      if (data.success && Array.isArray(data.teams)) {
        setTeamsList(data.teams);
        setOddsSource(data.source);
        
        // Sync selected teams
        setYourTeam(prev => data.teams.find((t: Team) => t.code === prev.code) || prev);
        setOppTeam(prev => data.teams.find((t: Team) => t.code === prev.code) || prev);
      }
    } catch (err) {
      console.error("Error fetching live odds:", err);
    } finally {
      setLoadingOdds(false);
    }
  };

  // Safe client mounting
  useEffect(() => {
    setMounted(true);
    setClientSeed("degen-" + randHex(3));
    fetchLiveOdds();
  }, []);

  // Reveal server seed automatically when game is finished
  useEffect(() => {
    if (gameState.phase === "done" && sessionToken) {
      const revealSeed = async () => {
        try {
          const res = await fetch("/api/game/reveal", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionToken }),
          });
          const data = await res.json();
          if (data.success) {
            setRevealedServerSeed(data.serverSeed);
          }
        } catch (err) {
          console.error("Error revealing server seed:", err);
        }
      };
      revealSeed();
    }
  }, [gameState.phase, sessionToken]);

  async function startGame() {
    if (!yourTeam || !oppTeam || yourTeam.code === oppTeam.code) return;
    updateState((s) => {
      s.busy = true;
    });
    try {
      const res = await fetch("/api/game/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          yourTeam: yourTeam.code,
          oppTeam: oppTeam.code,
          clientSeed,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setServerHash(data.serverHash);
        setSessionToken(data.sessionToken);
        setRevealedServerSeed("");
        updateState((s) => {
          s.phase = data.gameState.phase;
          s.round = data.gameState.round;
          s.turn = data.gameState.turn;
          s.ys = data.gameState.ys;
          s.os = data.gameState.os;
          s.yk = [...data.gameState.yk];
          s.ok = [...data.gameState.ok];
          s.scene = { ballFly: false };
          s.kickIndex = data.gameState.kickIndex;
          s.winner = data.gameState.winner;
          s.nonce = data.gameState.nonce;
          s.lastHash = data.gameState.lastHash;
          s.busy = false;
        });
      }
    } catch (err) {
      console.error("Error starting game:", err);
      updateState((s) => {
        s.busy = false;
      });
    }
  }

  function toSelect() {
    setSessionToken("");
    setRevealedServerSeed("");
    setServerHash("");
    updateState((s) => {
      s.phase = "select";
      s.round = 1;
      s.turn = "you";
      s.ys = 0;
      s.os = 0;
      s.yk = [];
      s.ok = [];
      s.scene = { ballFly: false };
      s.winner = null;
      s.busy = false;
      s.nonce = 0;
      s.lastHash = "";
    });
  }

  function randomizeClient() {
    if (gameState.phase !== "select") return;
    setClientSeed("degen-" + randHex(3));
  }

  function playKick({
    actor,
    shotZone,
    keeperZone,
    result,
    nextGameState,
    nextSessionToken,
  }: {
    actor: "you" | "opp";
    shotZone: Zone;
    keeperZone: Zone;
    result: KickResult;
    nextGameState: GameState;
    nextSessionToken: string;
  }) {
    updateState((s) => {
      s.phase = "anim";
      s.scene = {
        shotZone,
        keeperZone,
        ballFly: false,
        result,
        actor,
        showResult: false,
      };
    });

    requestAnimationFrame(() => {
      updateState((s) => {
        s.scene.ballFly = true;
      });
    });

    setTimeout(() => {
      updateState((s) => {
        s.scene.showResult = true;
        s.ys = nextGameState.ys;
        s.os = nextGameState.os;
        s.yk = [...nextGameState.yk];
        s.ok = [...nextGameState.ok];
      });
    }, 480);

    setTimeout(() => {
      updateState((s) => {
        s.phase = nextGameState.phase;
        s.turn = nextGameState.turn;
        s.round = nextGameState.round;
        s.kickIndex = nextGameState.kickIndex;
        s.winner = nextGameState.winner;
        s.nonce = nextGameState.nonce;
        s.lastHash = nextGameState.lastHash;
        s.busy = false;
        s.scene = { ballFly: false };
      });
      setSessionToken(nextSessionToken);
    }, 1140);
  }

  async function onShoot(zone: Zone) {
    if (gameState.phase !== "shoot" || gameState.busy) return;
    updateState((s) => {
      s.busy = true;
    });
    try {
      const res = await fetch("/api/game/shoot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionToken,
          clientSeed,
          zone,
          action: "shoot",
        }),
      });
      const data = await res.json();
      if (data.success) {
        playKick({
          actor: "you",
          shotZone: zone,
          keeperZone: data.opponentZone,
          result: data.result,
          nextGameState: data.gameState,
          nextSessionToken: data.sessionToken,
        });
      } else {
        updateState((s) => {
          s.busy = false;
        });
      }
    } catch (err) {
      console.error("Error in onShoot:", err);
      updateState((s) => {
        s.busy = false;
      });
    }
  }

  async function onDive(zone: Zone) {
    if (gameState.phase !== "dive" || gameState.busy) return;
    updateState((s) => {
      s.busy = true;
    });
    try {
      const res = await fetch("/api/game/shoot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionToken,
          clientSeed,
          zone,
          action: "dive",
        }),
      });
      const data = await res.json();
      if (data.success) {
        playKick({
          actor: "opp",
          shotZone: data.opponentZone,
          keeperZone: zone,
          result: data.result,
          nextGameState: data.gameState,
          nextSessionToken: data.sessionToken,
        });
      } else {
        updateState((s) => {
          s.busy = false;
        });
      }
    } catch (err) {
      console.error("Error in onDive:", err);
      updateState((s) => {
        s.busy = false;
      });
    }
  }

  if (!mounted) {
    return (
      <div className="pk-root">
        <div className="wrap">
          <header style={{ marginBottom: 14 }}>
            <div className="eyebrow up">PUMP.FUN // PROVABLY FAIR SHOOTOUT</div>
            <h1 className="disp" style={{ fontSize: "clamp(28px,7vw,46px)", fontWeight: 800, margin: "6px 0 8px", lineHeight: 1, letterSpacing: "-0.02em" }}>
              PUMP <span style={{ color: "var(--green)" }}>PENALTY</span>
            </h1>
            <p className="mono" style={{ fontSize: 12.5, color: "var(--gray)", lineHeight: 1.5, margin: 0 }}>
              Loading components...
            </p>
          </header>
        </div>
      </div>
    );
  }

  const inMatch =
    gameState.phase === "shoot" ||
    gameState.phase === "dive" ||
    gameState.phase === "anim";

  return (
    <div className="pk-root">
      <div className="wrap">
        {/* header */}
        <header style={{ marginBottom: 14, animation: "launch .45s ease both" }}>
          <div className="eyebrow up">PUMP.FUN // PROVABLY FAIR SHOOTOUT</div>
          <h1
            className="disp"
            style={{
              fontSize: "clamp(28px,7vw,46px)",
              fontWeight: 800,
              margin: "6px 0 8px",
              lineHeight: 1,
              letterSpacing: "-0.02em",
            }}
          >
            PUMP <span style={{ color: "var(--green)" }}>PENALTY</span>
          </h1>
          <p className="mono" style={{ fontSize: 12.5, color: "var(--gray)", lineHeight: 1.5, margin: 0 }}>
            Conversion odds come from Polymarket. Every kick rolls from a seed you can verify. Beat the keeper, then guess where they shoot.
          </p>
        </header>

        {/* scoreboard */}
        {(inMatch || gameState.phase === "done") && (
          <ScoreBoard
            gameState={gameState}
            yourTeam={yourTeam}
            oppTeam={oppTeam}
          />
        )}

        {/* pitch scene */}
        {(inMatch || gameState.phase === "done") && (
          <PitchScene
            gameState={gameState}
            yourTeam={yourTeam}
            oppTeam={oppTeam}
          />
        )}

        {/* controls during match */}
        <Controls
          phase={gameState.phase}
          busy={gameState.busy}
          onSelectZone={gameState.phase === "shoot" ? onShoot : onDive}
        />

        {/* done banner */}
        {gameState.phase === "done" && (
          <div className="flow" style={{ marginBottom: 12, animation: "launch .4s ease both" }}>
            <div
              style={{
                background: "var(--panel)",
                padding: 16,
                display: "flex",
                alignItems: "center",
                gap: 14,
                flexWrap: "wrap",
              }}
            >
              <PixelKit
                color={
                  (gameState.winner === "you" ? yourTeam : oppTeam).color
                }
                size={40}
              />
              <div>
                <div
                  className="lbl up"
                  style={{
                    color:
                      gameState.winner === "you"
                        ? "var(--green)"
                        : "var(--red)",
                  }}
                >
                  {gameState.winner === "you" ? "You win" : "You lose"}
                </div>
                <div className="disp" style={{ fontSize: 24, fontWeight: 800, lineHeight: 1 }}>
                  {(gameState.winner === "you" ? yourTeam : oppTeam).name} take
                  it {Math.max(gameState.ys, gameState.os)} to{" "}
                  {Math.min(gameState.ys, gameState.os)}
                </div>
              </div>
              <button
                className="btn btn-green"
                style={{ marginLeft: "auto" }}
                onClick={startGame}
              >
                Rematch
              </button>
              <button className="btn" onClick={toSelect}>
                Change teams
              </button>
            </div>
          </div>
        )}

        {/* team select */}
        {gameState.phase === "select" && (
          <TeamSelect
            yourTeam={yourTeam}
            oppTeam={oppTeam}
            setYourTeam={setYourTeam}
            setOppTeam={setOppTeam}
            onStartGame={startGame}
            teamsList={teamsList}
            loadingOdds={loadingOdds}
            oddsSource={oddsSource}
            onRefreshOdds={fetchLiveOdds}
          />
        )}

        {/* provably fair panel */}
        <ProvablyFairPanel
          serverHash={serverHash}
          clientSeed={clientSeed}
          setClientSeed={setClientSeed}
          nonce={gameState.nonce}
          lastHash={gameState.lastHash}
          onRandomizeClient={randomizeClient}
          disabled={gameState.phase !== "select"}
          revealedServerSeed={revealedServerSeed}
        />

        <footer className="mono" style={{ fontSize: 10.5, color: "var(--dim)", marginTop: 16, lineHeight: 1.6 }}>
          Polymarket odds are a snapshot from 16 Jun 2026 and will move. Entertainment and simulation, not betting advice.
        </footer>
      </div>
    </div>
  );
}
