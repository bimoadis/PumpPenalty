import { NextResponse } from "next/server";
import crypto from "crypto";
import { decryptSession, encryptSession } from "@/utils/sessionCrypto";
import { Team, Zone, KickResult } from "@/utils/types";

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

function calculateOutcome(
  shooter: Team,
  keeper: Team,
  shotZone: Zone,
  keeperZone: Zone,
  hash: string
): KickResult {
  const roll = parseInt(hash.slice(2, 10), 16) / 0xffffffff;
  const ss = shooter.p / 16;
  const ks = keeper.p / 16;
  if (shotZone === keeperZone) {
    const conv = clamp(0.12 + 0.3 * ss - 0.12 * ks, 0.05, 0.5);
    return roll < conv ? "GOAL" : "SAVED";
  }
  const conv = clamp(0.8 + 0.15 * ss, 0.6, 0.97);
  return roll < conv ? "GOAL" : "MISS";
}

const zoneFromHash = (hash: string): Zone => (parseInt(hash.slice(0, 2), 16) % 3) as Zone;

export async function POST(request: Request) {
  try {
    const { sessionToken, clientSeed, zone, action } = await request.json();
    if (sessionToken === undefined || clientSeed === undefined || zone === undefined || !action) {
      return NextResponse.json(
        { success: false, error: "Missing required parameters" },
        { status: 400 }
      );
    }

    // Decrypt the current session state
    const sessionPayload = decryptSession(sessionToken);
    const { serverSeed, serverHash, yourTeam, oppTeam, gameState } = sessionPayload;

    if (gameState.phase !== action) {
      return NextResponse.json(
        { success: false, error: `Invalid action for phase: ${gameState.phase}` },
        { status: 400 }
      );
    }

    const n = gameState.nonce + 1;
    gameState.nonce = n;

    // Cryptographic roll
    const hash = crypto.createHash("sha256").update(`${serverSeed}:${clientSeed}:${n}`).digest("hex");
    gameState.lastHash = hash;

    const opponentZone = zoneFromHash(hash);
    let result: KickResult;

    if (action === "shoot") {
      result = calculateOutcome(yourTeam, oppTeam, zone as Zone, opponentZone, hash);
    } else {
      result = calculateOutcome(oppTeam, yourTeam, opponentZone, zone as Zone, hash);
    }

    // Return the result and next game state
    // We will simulate the same transition rules as frontend advance()
    const updatedState = { ...gameState };
    updatedState.scene = {
      actor: action === "shoot" ? "you" : "opp",
      shotZone: action === "shoot" ? (zone as Zone) : opponentZone,
      keeperZone: action === "shoot" ? opponentZone : (zone as Zone),
      ballFly: true,
      result,
      showResult: true,
    };

    // Update history and scores
    if (action === "shoot") {
      updatedState.yk = [...updatedState.yk, result];
      if (result === "GOAL") updatedState.ys++;
    } else {
      updatedState.ok = [...updatedState.ok, result];
      if (result === "GOAL") updatedState.os++;
    }

    // Game loop advancement logic (advance)
    updatedState.busy = false;
    let nextPhase = action;
    let nextTurn = updatedState.turn;
    let nextRound = updatedState.round;
    let nextKickIndex = updatedState.kickIndex;
    let winner = updatedState.winner;

    if (action === "shoot") {
      nextTurn = "opp";
      nextPhase = "dive";
      nextKickIndex++;
    } else {
      // action was "dive" (end of round)
      const r = updatedState.round;
      const diff = Math.abs(updatedState.ys - updatedState.os);

      if (r <= 5) {
        const remaining = 5 - r;
        if (diff > remaining) {
          nextPhase = "done";
          winner = updatedState.ys > updatedState.os ? "you" : "opp";
        } else if (r === 5) {
          nextRound = 6;
          nextTurn = "you";
          nextPhase = "shoot";
          nextKickIndex++;
        } else {
          nextRound = r + 1;
          nextTurn = "you";
          nextPhase = "shoot";
          nextKickIndex++;
        }
      } else {
        // Sudden death
        if (updatedState.ys !== updatedState.os) {
          nextPhase = "done";
          winner = updatedState.ys > updatedState.os ? "you" : "opp";
        } else {
          nextRound = r + 1;
          nextTurn = "you";
          nextPhase = "shoot";
          nextKickIndex++;
        }
      }
    }

    updatedState.phase = nextPhase;
    updatedState.turn = nextTurn;
    updatedState.round = nextRound;
    updatedState.kickIndex = nextKickIndex;
    updatedState.winner = winner;

    // Encrypt the new session token
    const nextPayload = {
      serverSeed,
      serverHash,
      clientSeed,
      yourTeam,
      oppTeam,
      gameState: updatedState
    };

    const nextSessionToken = encryptSession(nextPayload);

    return NextResponse.json({
      success: true,
      result,
      opponentZone,
      hash,
      sessionToken: nextSessionToken,
      gameState: updatedState
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
