export interface Team {
  code: string;
  name: string;
  color: string;
  p: number;
}

export type Zone = 0 | 1 | 2; // Left, Center, Right

export type KickResult = "GOAL" | "SAVED" | "MISS" | "POST";

export interface GameSceneState {
  ballFly: boolean;
  shotZone?: Zone;
  keeperZone?: Zone;
  result?: KickResult;
  actor?: "you" | "opp";
  showResult?: boolean;
}

export interface GameState {
  phase: "select" | "shoot" | "dive" | "anim" | "done";
  round: number;
  turn: "you" | "opp";
  ys: number; // Your score
  os: number; // Opponent score
  yk: KickResult[]; // Your kicks history
  ok: KickResult[]; // Opponent kicks history
  scene: GameSceneState;
  kickIndex: number;
  winner: "you" | "opp" | null;
  nonce: number;
  lastHash: string;
  busy: boolean;
}
