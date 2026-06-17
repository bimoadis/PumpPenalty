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
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Web3GameSimulator } from "@/utils/web3GameSimulator";
import { playKickSound, playGoalSound, playSaveSound, playWhistleSound, playPostHitSound, playCheerSound, startBGM, stopBGM, startCrowdAmbient, stopCrowdAmbient } from "@/utils/audioSynth";

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

  // Web3 State Variables
  const [playMode, setPlayMode] = useState<"web2" | "web3">("web2");
  const [betAmount, setBetAmount] = useState<string>("0.1");
  const [solBalance, setSolBalance] = useState<number>(5.0);
  const [txHash, setTxHash] = useState<string>("");
  const [isAwaitingOracle, setIsAwaitingOracle] = useState<boolean>(false);
  const [sessionHash, setSessionHash] = useState<string>("");

  const { publicKey, connected } = useWallet();

  // Database / Leaderboard State Variables
  const [activeTab, setActiveTab] = useState<"leaderboard" | "history">("leaderboard");
  const [leaderboardData, setLeaderboardData] = useState<any[]>([]);
  const [myMatches, setMyMatches] = useState<any[]>([]);

  // Audio and Animation State Variables
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [triggerShake, setTriggerShake] = useState<boolean>(false);

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
    fetchLeaderboard();
  }, []);

  // Load local match history on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("pump_penalty_matches");
      if (stored) {
        try {
          setMyMatches(JSON.parse(stored));
        } catch (e) {
          console.error(e);
        }
      }

      const storedMute = localStorage.getItem("pump_penalty_muted");
      if (storedMute) {
        const muted = storedMute === "true";
        setIsMuted(muted);
        if (!muted) {
          startBGM(false);
          startCrowdAmbient(false);
        }
      } else {
        startBGM(false);
        startCrowdAmbient(false);
      }
    }
  }, []);

  const toggleMute = () => {
    setIsMuted(prev => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("pump_penalty_muted", String(next));
        if (next) {
          stopBGM();
          stopCrowdAmbient();
        } else {
          startBGM(false);
          startCrowdAmbient(false);
        }
      }
      return next;
    });
  };

  const addLocalMatch = (match: any) => {
    setMyMatches(prev => {
      const updated = [match, ...prev].slice(0, 20); // Keep last 20
      if (typeof window !== "undefined") {
        localStorage.setItem("pump_penalty_matches", JSON.stringify(updated));
      }
      return updated;
    });
  };

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch("/api/leaderboard");
      if (!res.ok) throw new Error("Failed to fetch leaderboard");
      const data = await res.json();
      if (data.success) {
        setLeaderboardData(data.leaderboard);
      }
    } catch (err) {
      console.error("Error fetching leaderboard:", err);
    }
  };

  const recordMatchResult = async (finalState: GameState, sSeed: string) => {
    // 1. Catat ke local storage terlebih dahulu agar fungsionalitas offline terjamin
    const localId = "local-" + Math.random().toString(36).substring(2, 10);
    const localMatch = {
      id: localId,
      player_team: yourTeam.code,
      opponent_team: oppTeam.code,
      player_score: finalState.ys,
      opponent_score: finalState.os,
      outcome: finalState.winner === "you" ? "win" : "lose",
      server_seed: sSeed,
      client_seed: clientSeed,
      nonce_count: finalState.nonce,
      created_at: new Date().toISOString()
    };
    addLocalMatch(localMatch);

    // 2. Kirim data ke Supabase API secara asynchronous
    try {
      const payload = {
        walletAddress: playMode === "web3" && publicKey ? publicKey.toBase58() : null,
        username: playMode === "web3" && publicKey ? publicKey.toBase58().slice(0, 6) + "..." + publicKey.toBase58().slice(-4) : "Player-" + clientSeed.slice(-4),
        playerTeam: yourTeam.code,
        opponentTeam: oppTeam.code,
        playerScore: finalState.ys,
        opponentScore: finalState.os,
        outcome: finalState.winner === "you" ? "win" : "lose",
        serverSeed: sSeed,
        clientSeed,
        nonceCount: finalState.nonce,
      };

      const res = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        console.log("Match recorded in remote database:", data.matchId);
        fetchLeaderboard();
      } else {
        console.warn("Supabase save warning:", data.warning || data.error);
      }
    } catch (err) {
      console.warn("Network error saving to database:", err);
    }
  };

  const auditMatch = async (match: any) => {
    const resolvedHash = await sha256Hex(match.server_seed);
    setServerHash(resolvedHash);
    setClientSeed(match.client_seed);
    setRevealedServerSeed(match.server_seed);
    updateState((s) => {
      s.nonce = match.nonce_count;
      s.lastHash = "";
    });
  };

  // Reveal server seed automatically when game is finished
  useEffect(() => {
    if (gameState.phase === "done" && sessionToken && playMode === "web2") {
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
            // Record match result in Supabase
            recordMatchResult(gameState, data.serverSeed);
          }
        } catch (err) {
          console.error("Error revealing server seed:", err);
        }
      };
      revealSeed();
    }
  }, [gameState.phase, sessionToken, playMode]);

  // Reveal server seed in Web3 mode
  useEffect(() => {
    if (gameState.phase === "done" && playMode === "web3" && sessionHash) {
      const session = Web3GameSimulator.getSession(sessionHash);
      if (session) {
        setRevealedServerSeed(session.serverSeed);
      }
    }
  }, [gameState.phase, playMode, sessionHash]);

  async function startGame() {
    if (!yourTeam || !oppTeam || yourTeam.code === oppTeam.code) return;
    startBGM(isMuted);
    startCrowdAmbient(isMuted);
    playWhistleSound(isMuted);

    if (playMode === "web3") {
      if (!connected || !publicKey) {
        alert("Please connect your Solana wallet first!");
        return;
      }
      const bet = parseFloat(betAmount);
      if (isNaN(bet) || bet <= 0) {
        alert("Please enter a valid bet amount!");
        return;
      }
      if (solBalance < bet) {
        alert("Insufficient simulated SOL balance!");
        return;
      }

      updateState((s) => {
        s.busy = true;
      });

      try {
        setSolBalance(prev => parseFloat((prev - bet).toFixed(3)));
        const { session, txHash: initTx } = Web3GameSimulator.initialize(
          publicKey.toBase58(),
          yourTeam,
          oppTeam,
          clientSeed,
          bet
        );
        setTxHash(initTx);
        setServerHash(session.serverHash);
        setSessionHash(publicKey.toBase58());
        setRevealedServerSeed("");

        updateState((s) => {
          s.phase = session.gameState.phase;
          s.round = session.gameState.round;
          s.turn = session.gameState.turn;
          s.ys = session.gameState.ys;
          s.os = session.gameState.os;
          s.yk = [...session.gameState.yk];
          s.ok = [...session.gameState.ok];
          s.scene = { ballFly: false };
          s.kickIndex = session.gameState.kickIndex;
          s.winner = session.gameState.winner;
          s.nonce = session.gameState.nonce;
          s.lastHash = session.gameState.lastHash;
          s.busy = false;
        });
      } catch (err) {
        console.error("Error starting Web3 game:", err);
        updateState((s) => {
          s.busy = false;
        });
      }
      return;
    }

    updateState((s) => {
      s.busy = true;
    });
    try {
      const res = await fetch("/api/game/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          yourTeam,
          oppTeam,
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
    setTxHash("");
    if (sessionHash) {
      Web3GameSimulator.clearSession(sessionHash);
      setSessionHash("");
    }
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
    // Deterministically decide if a MISS result hits the post/crossbar
    let visualResult = result;
    if (result === "MISS") {
      const hashVal = nextGameState.lastHash || Math.random().toString();
      const rollNum = parseInt(hashVal.slice(10, 14), 16) % 100;
      if (rollNum < 40) {
        visualResult = "POST";
      }
    }

    updateState((s) => {
      s.phase = "anim";
      s.scene = {
        shotZone,
        keeperZone,
        ballFly: false,
        result: visualResult,
        actor,
        showResult: false,
      };
    });

    // Make sure BGM is started on interaction
    startBGM(isMuted);

    // Trigger kick sound
    playKickSound(isMuted);

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

      // Play outcome audio and shake screen
      if (visualResult === "GOAL") {
        playGoalSound(isMuted);
        playCheerSound(isMuted);
        setTriggerShake(true);
        setTimeout(() => setTriggerShake(false), 300);
      } else if (visualResult === "POST") {
        playPostHitSound(isMuted);
        setTriggerShake(true);
        setTimeout(() => setTriggerShake(false), 300);
        updateState((s) => {
          (s.scene as any).bounce = true;
        });
      } else {
        playSaveSound(isMuted);
        setTriggerShake(true);
        setTimeout(() => setTriggerShake(false), 200);
      }
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

      // Play cheers if game finished and you won
      if (nextGameState.phase === "done") {
        if (nextGameState.winner === "you") {
          playGoalSound(isMuted);
          playCheerSound(isMuted);
        } else {
          playSaveSound(isMuted);
        }
      }

      if (nextSessionToken) {
        setSessionToken(nextSessionToken);
      }
    }, 1140);
  }

  async function onShoot(zone: Zone) {
    if (gameState.phase !== "shoot" || gameState.busy) return;
    updateState((s) => {
      s.busy = true;
    });

    if (playMode === "web3" && sessionHash) {
      setIsAwaitingOracle(true);
      try {
        const res = await Web3GameSimulator.processAction(sessionHash, zone, "shoot");
        setIsAwaitingOracle(false);
        if (res.success && res.gameState) {
          setTxHash(res.txHash || "");
          playKick({
            actor: "you",
            shotZone: zone,
            keeperZone: res.opponentZone!,
            result: res.result!,
            nextGameState: res.gameState,
            nextSessionToken: "",
          });

          if (res.gameState.phase === "done") {
            const finalState = res.gameState;
            if (finalState.winner === "you") {
              const winnings = parseFloat(betAmount) * 1.8;
              setSolBalance(prev => parseFloat((prev + winnings).toFixed(3)));
            }
            const session = Web3GameSimulator.getSession(sessionHash);
            if (session) {
              recordMatchResult(finalState, session.serverSeed);
            }
          }
        } else {
          updateState((s) => {
            s.busy = false;
          });
        }
      } catch (err) {
        console.error("Error in Web3 onShoot:", err);
        setIsAwaitingOracle(false);
        updateState((s) => {
          s.busy = false;
        });
      }
      return;
    }

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

    if (playMode === "web3" && sessionHash) {
      setIsAwaitingOracle(true);
      try {
        const res = await Web3GameSimulator.processAction(sessionHash, zone, "dive");
        setIsAwaitingOracle(false);
        if (res.success && res.gameState) {
          setTxHash(res.txHash || "");
          playKick({
            actor: "opp",
            shotZone: res.opponentZone!,
            keeperZone: zone,
            result: res.result!,
            nextGameState: res.gameState,
            nextSessionToken: "",
          });

          if (res.gameState.phase === "done") {
            const finalState = res.gameState;
            if (finalState.winner === "you") {
              const winnings = parseFloat(betAmount) * 1.8;
              setSolBalance(prev => parseFloat((prev + winnings).toFixed(3)));
            }
            const session = Web3GameSimulator.getSession(sessionHash);
            if (session) {
              recordMatchResult(finalState, session.serverSeed);
            }
          }
        } else {
          updateState((s) => {
            s.busy = false;
          });
        }
      } catch (err) {
        console.error("Error in Web3 onDive:", err);
        setIsAwaitingOracle(false);
        updateState((s) => {
          s.busy = false;
        });
      }
      return;
    }

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
      <div className={`wrap ${triggerShake ? "shake-screen" : ""}`}>
        {/* header */}
        <header style={{ marginBottom: 14, animation: "launch .45s ease both" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
            <div>
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
            </div>
            
            {/* Mode Toggle & Wallet Connection Button */}
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <button
                className="mono btn"
                style={{
                  padding: "8px 10px",
                  fontSize: 12,
                  height: 36,
                  width: 36,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderColor: "var(--line)",
                }}
                onClick={toggleMute}
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? "🔇" : "🔊"}
              </button>
              
              <div className="panel" style={{ display: "flex", padding: 2, background: "#0a0e0f" }}>
                <button
                  className="mono"
                  style={{
                    padding: "6px 10px",
                    fontSize: 10,
                    fontWeight: 700,
                    border: 0,
                    background: playMode === "web2" ? "var(--green)" : "transparent",
                    color: playMode === "web2" ? "#000" : "var(--gray)",
                    cursor: "pointer",
                    textTransform: "uppercase",
                  }}
                  onClick={() => setPlayMode("web2")}
                  disabled={gameState.phase !== "select"}
                >
                  Web2 Demo
                </button>
                <button
                  className="mono"
                  style={{
                    padding: "6px 10px",
                    fontSize: 10,
                    fontWeight: 700,
                    border: 0,
                    background: playMode === "web3" ? "var(--green)" : "transparent",
                    color: playMode === "web3" ? "#000" : "var(--gray)",
                    cursor: "pointer",
                    textTransform: "uppercase",
                  }}
                  onClick={() => setPlayMode("web3")}
                  disabled={gameState.phase !== "select"}
                >
                  Web3 Solana
                </button>
              </div>
              <WalletMultiButton />
            </div>
          </div>
          <p className="mono" style={{ fontSize: 12.5, color: "var(--gray)", lineHeight: 1.5, margin: "8px 0 0" }}>
            {playMode === "web3"
              ? "Running in On-Chain mode. Bets are placed in SOL and randomness is resolved via Solana VRF Oracle."
              : "Conversion odds come from Polymarket. Every kick rolls from a seed you can verify. Beat the keeper, then guess where they shoot."}
          </p>
        </header>

        {/* Web3 Betting Panel */}
        {gameState.phase === "select" && playMode === "web3" && (
          <div className="panel" style={{ padding: 16, marginBottom: 14, borderLeft: "3px solid var(--gold)" }}>
            <div className="lbl up" style={{ marginBottom: 6, color: "var(--gold)" }}>Web3 Betting Config (Devnet)</div>
            <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 150 }}>
                <label className="lbl up" style={{ fontSize: 10, display: "block", marginBottom: 4 }}>Bet Amount (SOL)</label>
                <input
                  type="number"
                  step="0.05"
                  min="0.05"
                  className="inp"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                />
              </div>
              <div>
                <label className="lbl up" style={{ fontSize: 10, display: "block", marginBottom: 4 }}>Player Simulated Wallet Balance</label>
                <div className="disp" style={{ fontSize: 20, fontWeight: 800, color: "var(--green)" }}>
                  {connected ? `${solBalance.toFixed(3)} SOL` : "Wallet Not Connected"}
                </div>
              </div>
            </div>
          </div>
        )}

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

        {/* awaiting oracle message overlay */}
        {isAwaitingOracle && (
          <div
            className="panel"
            style={{
              padding: 16,
              textAlign: "center",
              marginBottom: 14,
              border: "1px solid var(--gold)",
              background: "#0c0d0e",
            }}
          >
            <div className="disp" style={{ color: "var(--gold)", fontSize: 13, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              ⚡ Awaiting Solana VRF Oracle (ORAO)...
            </div>
            <div className="mono" style={{ fontSize: 10, color: "var(--gray)", marginTop: 4 }}>
              Requesting verifiable randomness on-chain
            </div>
            {txHash && (
              <div
                className="mono"
                style={{
                  fontSize: 9,
                  color: "var(--dim)",
                  marginTop: 8,
                  textOverflow: "ellipsis",
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                }}
              >
                Tx Signature: {txHash}
              </div>
            )}
          </div>
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

        {/* Solana transaction logs auditor */}
        {playMode === "web3" && sessionHash && (
          <div className="panel" style={{ padding: 16, marginTop: 14, borderLeft: "3px solid var(--green)" }}>
            <div className="lbl up" style={{ marginBottom: 8, color: "var(--green)", fontWeight: 700 }}>
              Solana On-Chain Transaction Logs
            </div>
            <div className="mono" style={{ fontSize: 11, display: "flex", flexDirection: "column", gap: 6 }}>
              {Web3GameSimulator.getSession(sessionHash)?.txHistory.map((tx, idx) => (
                <div key={idx} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <span style={{ color: "var(--gray)" }}>{idx + 1}. {tx.action}</span>
                  <span style={{ color: "var(--dim)", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", maxWidth: "70%" }}>
                    {tx.txHash}
                  </span>
                </div>
              ))}
              {txHash && (
                <div style={{ marginTop: 8, borderTop: "1px solid var(--line)", paddingTop: 8 }}>
                  <span style={{ color: "var(--gold)" }}>Latest Tx Sign: </span>
                  <span style={{ color: "var(--text)" }}>{txHash}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Leaderboard and Match History section */}
        <div className="panel" style={{ marginTop: 14, padding: 16 }}>
          <div style={{ display: "flex", borderBottom: "1px solid var(--line)", marginBottom: 12 }}>
            <button
              className="mono"
              style={{
                padding: "8px 16px",
                border: 0,
                background: activeTab === "leaderboard" ? "var(--line)" : "transparent",
                color: activeTab === "leaderboard" ? "var(--green)" : "var(--gray)",
                cursor: "pointer",
                fontWeight: 700,
                textTransform: "uppercase",
                fontSize: 12,
              }}
              onClick={() => setActiveTab("leaderboard")}
            >
              🏆 Top Standings
            </button>
            <button
              className="mono"
              style={{
                padding: "8px 16px",
                border: 0,
                background: activeTab === "history" ? "var(--line)" : "transparent",
                color: activeTab === "history" ? "var(--green)" : "var(--gray)",
                cursor: "pointer",
                fontWeight: 700,
                textTransform: "uppercase",
                fontSize: 12,
              }}
              onClick={() => setActiveTab("history")}
            >
              📜 My Matches
            </button>
          </div>

          {activeTab === "leaderboard" && (
            <div>
              {leaderboardData.length === 0 ? (
                <div className="mono" style={{ fontSize: 12, color: "var(--dim)", textAlign: "center", padding: "12px 0" }}>
                  No ranks recorded yet. Win a shootout to be the first!
                </div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--line)", textAlign: "left", color: "var(--dim)" }}>
                      <th style={{ padding: "6px 4px" }}>Rank</th>
                      <th style={{ padding: "6px 4px" }}>Player</th>
                      <th style={{ padding: "6px 4px" }}>Wallet</th>
                      <th style={{ padding: "6px 4px", textAlign: "right" }}>Wins</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboardData.map((row: any, idx: number) => (
                      <tr key={idx} style={{ borderBottom: "1px solid #141a1c" }}>
                        <td style={{ padding: "8px 4px", color: idx === 0 ? "var(--gold)" : "var(--text)", fontWeight: 700 }}>
                          #{idx + 1}
                        </td>
                        <td style={{ padding: "8px 4px" }}>{row.username}</td>
                        <td style={{ padding: "8px 4px", color: "var(--dim)", fontFamily: "monospace" }}>
                          {row.wallet_address ? `${row.wallet_address.slice(0, 6)}...${row.wallet_address.slice(-4)}` : "Demo Mode"}
                        </td>
                        <td style={{ padding: "8px 4px", textAlign: "right", color: "var(--green)", fontWeight: 700 }}>
                          {row.total_wins}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeTab === "history" && (
            <div>
              {myMatches.length === 0 ? (
                <div className="mono" style={{ fontSize: 12, color: "var(--dim)", textAlign: "center", padding: "12px 0" }}>
                  You haven't played any matches yet.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {myMatches.map((match: any, idx: number) => (
                    <div
                      key={idx}
                      className="panel"
                      style={{
                        padding: 10,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        fontSize: 11,
                        background: "#0a0e0f",
                      }}
                    >
                      <div>
                        <span
                          style={{
                            color: match.outcome === "win" ? "var(--green)" : "var(--red)",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            marginRight: 8,
                          }}
                        >
                          {match.outcome === "win" ? "WIN" : "LOSS"}
                        </span>
                        <span className="mono">
                          {match.player_team} vs {match.opponent_team} ({match.player_score}-{match.opponent_score})
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: 10 }}>
                        <button
                          className="chip"
                          style={{ padding: "2px 6px", fontSize: 9 }}
                          onClick={() => auditMatch(match)}
                        >
                          🔍 Audit
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <footer className="mono" style={{ fontSize: 10.5, color: "var(--dim)", marginTop: 16, lineHeight: 1.6 }}>
          Polymarket odds are a snapshot from 16 Jun 2026 and will move. Entertainment and simulation, not betting advice.
        </footer>
      </div>
    </div>
  );
}
