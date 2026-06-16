import { NextResponse } from "next/server";
import crypto from "crypto";
import { encryptSession } from "@/utils/sessionCrypto";

export async function POST(request: Request) {
  try {
    const { yourTeam, oppTeam, clientSeed } = await request.json();
    if (!yourTeam || !oppTeam || !clientSeed) {
      return NextResponse.json(
        { success: false, error: "Missing required parameters" },
        { status: 400 }
      );
    }

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
