import { NextResponse } from "next/server";
import crypto from "crypto";
import { encryptSession } from "@/utils/sessionCrypto";

export async function POST(request: Request) {
  try {
    const { yourTeam: yourTeamInput, oppTeam: oppTeamInput, clientSeed } = await request.json();
    if (!yourTeamInput || !oppTeamInput || !clientSeed) {
      return NextResponse.json(
        { success: false, error: "Missing required parameters" },
        { status: 400 }
      );
    }

    if (typeof yourTeamInput !== "object" || typeof oppTeamInput !== "object") {
      return NextResponse.json(
        { success: false, error: "yourTeam and oppTeam must be valid team objects" },
        { status: 400 }
      );
    }

    // Clamp probabilities to prevent tampering and ensure valid numbers
    const yourTeam = {
      ...yourTeamInput,
      p: Math.max(0.1, Math.min(50, parseFloat(yourTeamInput.p || "0")))
    };
    const oppTeam = {
      ...oppTeamInput,
      p: Math.max(0.1, Math.min(50, parseFloat(oppTeamInput.p || "0")))
    };

    // Generate random 64-char hex serverSeed (32 bytes)
    const serverSeed = crypto.randomBytes(32).toString("hex");
    const serverHash = crypto.createHash("sha256").update(serverSeed).digest("hex");

    const initialGameState = {
      phase: "shoot",
      round: 1,
      turn: "you",
      ys: 0,
      os: 0,
      yk: [],
      ok: [],
      scene: { ballFly: false },
      kickIndex: 1,
      winner: null,
      nonce: 0,
      lastHash: "",
      busy: false,
    };

    // Session payload to encrypt
    const sessionPayload = {
      serverSeed,
      serverHash,
      clientSeed,
      yourTeam,
      oppTeam,
      gameState: initialGameState
    };

    const sessionToken = encryptSession(sessionPayload);

    return NextResponse.json({
      success: true,
      serverHash,
      sessionToken,
      gameState: initialGameState
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
