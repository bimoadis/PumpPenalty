import { Team, GameState, Zone, KickResult } from "./types";

// Pure TypeScript implementation of SHA-256 for synchronous environment-agnostic hashing
function sha256Sync(ascii: string): string {
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }

  const lengthProperty = 'length';
  let i, j;
  let result = '';

  const words: number[] = [];
  const asciiLength = ascii[lengthProperty] * 8;

  for (i = 0; i < ascii[lengthProperty]; i++) {
    const code = ascii.charCodeAt(i);
    words[i >> 2] |= (code & 0xff) << (24 - (i % 4) * 8);
  }

  const padLength = (((asciiLength + 64) >>> 9) << 4) + 15;
  words[asciiLength >> 5] |= 0x80 << (24 - (asciiLength % 32));
  words[padLength] = asciiLength;

  const hash = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ];

  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  const w = new Array(64);
  for (i = 0; i < words.length; i += 16) {
    const subWords = words.slice(i, i + 16);
    let a = hash[0];
    let b = hash[1];
    let c = hash[2];
    let d = hash[3];
    let e = hash[4];
    let f = hash[5];
    let g = hash[6];
    let h = hash[7];

    for (j = 0; j < 64; j++) {
      if (j < 16) {
        w[j] = subWords[j] || 0;
      } else {
        const s0 = rightRotate(w[j - 15], 7) ^ rightRotate(w[j - 15], 18) ^ (w[j - 15] >>> 3);
        const s1 = rightRotate(w[j - 2], 17) ^ rightRotate(w[j - 2], 19) ^ (w[j - 2] >>> 10);
        w[j] = (w[j - 16] + s0 + w[j - 7] + s1) | 0;
      }

      const temp1 = (h + (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) + ((e & f) ^ (~e & g)) + k[j] + w[j]) | 0;
      const temp2 = ((rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) | 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) | 0;
    }

    hash[0] = (hash[0] + a) | 0;
    hash[1] = (hash[1] + b) | 0;
    hash[2] = (hash[2] + c) | 0;
    hash[3] = (hash[3] + d) | 0;
    hash[4] = (hash[4] + e) | 0;
    hash[5] = (hash[5] + f) | 0;
    hash[6] = (hash[6] + g) | 0;
    hash[7] = (hash[7] + h) | 0;
  }

  for (i = 0; i < 8; i++) {
    result += (hash[i] >>> 0).toString(16).padStart(8, '0');
  }
  return result;
}

// Generate simulated Solana transaction signatures
export function generateTxHash(): string {
  const chars = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let hash = "";
  for (let i = 0; i < 44; i++) {
    hash += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return hash;
}

// Generate simulated random 64-char hex strings
export function generateRandomSeed(): string {
  const chars = "abcdef0123456789";
  let seed = "";
  for (let i = 0; i < 64; i++) {
    seed += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return seed;
}

export interface Web3Session {
  serverSeed: string;
  serverHash: string;
  clientSeed: string;
  betAmount: number;
  yourTeam: Team;
  oppTeam: Team;
  gameState: GameState;
  txHistory: { txHash: string; action: string }[];
}

export class Web3GameSimulator {
  private static sessions = new Map<string, Web3Session>();

  // Inisialisasi game state Web3
  static initialize(
    playerKey: string,
    yourTeam: Team,
    oppTeam: Team,
    clientSeed: string,
    betAmount: number
  ): { session: Web3Session; txHash: string } {
    const serverSeed = generateRandomSeed();
    const serverHash = sha256Sync(serverSeed);
    const txHash = generateTxHash();

    const initialGameState: GameState = {
      phase: "shoot",
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
    };

    const session: Web3Session = {
      serverSeed,
      serverHash,
      clientSeed,
      betAmount,
      yourTeam,
      oppTeam,
      gameState: initialGameState,
      txHistory: [{ txHash, action: "initialize_game" }],
    };

    this.sessions.set(playerKey, session);

    return { session, txHash };
  }

  static getSession(playerKey: string): Web3Session | undefined {
    return this.sessions.get(playerKey);
  }

  static clearSession(playerKey: string): void {
    this.sessions.delete(playerKey);
  }

  // Proses action (shoot atau dive) dengan delay oracle VRF
  static async processAction(
    playerKey: string,
    zone: Zone,
    action: "shoot" | "dive"
  ): Promise<{
    success: boolean;
    result?: KickResult;
    opponentZone?: Zone;
    gameState?: GameState;
    txHash?: string;
    error?: string;
  }> {
    const session = this.sessions.get(playerKey);
    if (!session) {
      return { success: false, error: "Session not found" };
    }

    const { gameState, yourTeam, oppTeam, serverSeed, clientSeed } = session;

    if (gameState.phase !== action) {
      return { success: false, error: `Invalid action for phase: ${gameState.phase}` };
    }

    // Delay 1.2 detik untuk meniru respons block confirmation & orakel VRF
    await new Promise((resolve) => setTimeout(resolve, 1200));

    const n = gameState.nonce + 1;
    gameState.nonce = n;

    // Cryptographic roll menggunakan SHA256 Sync
    const hash = sha256Sync(`${serverSeed}:${clientSeed}:${n}`);
    gameState.lastHash = hash;

    // Arah kiper/penembak musuh ditentukan dari byte pertama hash
    const opponentZone = (parseInt(hash.slice(0, 2), 16) % 3) as Zone;

    // Hitung konversi gol
    let result: KickResult;
    const roll = parseInt(hash.slice(2, 10), 16) / 0xffffffff;
    const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

    const calculateOutcome = (shooter: Team, keeper: Team, shotZ: Zone, keeperZ: Zone) => {
      const ss = shooter.p / 16;
      const ks = keeper.p / 16;
      if (shotZ === keeperZ) {
        const conv = clamp(0.12 + 0.3 * ss - 0.12 * ks, 0.05, 0.5);
        return roll < conv ? "GOAL" : "SAVED";
      }
      const conv = clamp(0.8 + 0.15 * ss, 0.6, 0.97);
      return roll < conv ? "GOAL" : "MISS";
    };

    if (action === "shoot") {
      result = calculateOutcome(yourTeam, oppTeam, zone, opponentZone);
      gameState.yk = [...gameState.yk, result];
      if (result === "GOAL") gameState.ys++;
    } else {
      result = calculateOutcome(oppTeam, yourTeam, opponentZone, zone);
      gameState.ok = [...gameState.ok, result];
      if (result === "GOAL") gameState.os++;
    }

    let nextPhase: GameState["phase"] = action;
    let nextTurn = gameState.turn;
    let nextRound = gameState.round;
    let nextKickIndex = gameState.kickIndex;
    let winner = gameState.winner;

    if (action === "shoot") {
      nextTurn = "opp";
      nextPhase = "dive";
      nextKickIndex++;
    } else {
      const r = gameState.round;
      const diff = Math.abs(gameState.ys - gameState.os);

      if (r <= 5) {
        const remaining = 5 - r;
        if (diff > remaining) {
          nextPhase = "done";
          winner = gameState.ys > gameState.os ? "you" : "opp";
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
        if (gameState.ys !== gameState.os) {
          nextPhase = "done";
          winner = gameState.ys > gameState.os ? "you" : "opp";
        } else {
          nextRound = r + 1;
          nextTurn = "you";
          nextPhase = "shoot";
          nextKickIndex++;
        }
      }
    }

    gameState.phase = nextPhase;
    gameState.turn = nextTurn;
    gameState.round = nextRound;
    gameState.kickIndex = nextKickIndex;
    gameState.winner = winner;

    gameState.scene = {
      actor: action === "shoot" ? "you" : "opp",
      shotZone: action === "shoot" ? zone : opponentZone,
      keeperZone: action === "shoot" ? opponentZone : zone,
      ballFly: true,
      result,
      showResult: true,
    };

    const txHash = generateTxHash();
    session.txHistory.push({ txHash, action: `resolve_${action}` });

    return {
      success: true,
      result,
      opponentZone,
      gameState,
      txHash,
    };
  }
}
