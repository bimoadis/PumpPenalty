import { Web3GameSimulator } from "../web3GameSimulator";
import { Team } from "../types";

const mockYourTeam: Team = { code: "ESP", name: "Spain", color: "#ef3340", p: 16 };
const mockOppTeam: Team = { code: "FRA", name: "France", color: "#2563eb", p: 15 };

describe("Web3GameSimulator - Solana VRF Play Loop", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("initializes session correctly with bet amount", () => {
    const playerKey = "5Gf9dJzYhW...";
    const { session, txHash } = Web3GameSimulator.initialize(
      playerKey,
      mockYourTeam,
      mockOppTeam,
      "degen-123",
      0.25
    );

    expect(session.betAmount).toBe(0.25);
    expect(session.clientSeed).toBe("degen-123");
    expect(session.yourTeam.code).toBe("ESP");
    expect(session.oppTeam.code).toBe("FRA");
    expect(session.gameState.phase).toBe("shoot");
    expect(session.gameState.ys).toBe(0);
    expect(session.gameState.os).toBe(0);
    expect(txHash).toBeDefined();
    expect(txHash.length).toBe(44);
  });

  test("processes shoot and dive actions with on-chain VRF simulations", async () => {
    const playerKey = "5Gf9dJzYhW...";
    Web3GameSimulator.clearSession(playerKey);
    Web3GameSimulator.initialize(playerKey, mockYourTeam, mockOppTeam, "degen-123", 0.5);

    // 1. Shoot Action
    const promiseShoot = Web3GameSimulator.processAction(playerKey, 1, "shoot");

    // Fast forward VRF delay timer
    jest.advanceTimersByTime(1200);

    const shootRes = await promiseShoot;
    expect(shootRes.success).toBe(true);
    expect(shootRes.opponentZone).toBeDefined();
    expect(shootRes.result).toBeDefined();
    expect(shootRes.gameState?.nonce).toBe(1);
    expect(shootRes.gameState?.phase).toBe("dive");
    expect(shootRes.gameState?.turn).toBe("opp");

    // 2. Dive Action
    const promiseDive = Web3GameSimulator.processAction(playerKey, 0, "dive");

    // Fast forward VRF delay timer
    jest.advanceTimersByTime(1200);

    const diveRes = await promiseDive;
    expect(diveRes.success).toBe(true);
    expect(diveRes.opponentZone).toBeDefined();
    expect(diveRes.gameState?.nonce).toBe(2);
    expect(diveRes.gameState?.phase).toBe("shoot"); // next round
    expect(diveRes.gameState?.round).toBe(2);
  });

  test("errors on invalid session execution or action mismatch", async () => {
    const playerKey = "non-existent-player";
    const res = await Web3GameSimulator.processAction(playerKey, 1, "shoot");
    expect(res.success).toBe(false);
    expect(res.error).toBe("Session not found");
  });
});
