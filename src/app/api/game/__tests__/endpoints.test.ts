/**
 * @jest-environment node
 */

import { POST as startPOST } from "../start/route";
import { POST as shootPOST } from "../shoot/route";
import { POST as revealPOST } from "../reveal/route";
import crypto from "crypto";

describe("API Routes - Game Loop & Kriptografi", () => {
  let sessionToken = "";
  let serverHash = "";
  const clientSeed = "degen-test-123";

  test("1. /api/game/start initializes session successfully", async () => {
    const request = new Request("http://localhost/api/game/start", {
      method: "POST",
      body: JSON.stringify({
        yourTeam: { code: "ESP", name: "Spain", color: "#ef3340", p: 16 },
        oppTeam: { code: "FRA", name: "France", color: "#2563eb", p: 16 },
        clientSeed,
      }),
    });

    const res = await startPOST(request);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.serverHash).toBeDefined();
    expect(data.sessionToken).toBeDefined();
    expect(data.gameState).toBeDefined();
    expect(data.gameState.phase).toBe("shoot");
    expect(data.gameState.ys).toBe(0);
    expect(data.gameState.os).toBe(0);

    sessionToken = data.sessionToken;
    serverHash = data.serverHash;
  });

  test("2. /api/game/shoot processes kicks cryptographically", async () => {
    const request = new Request("http://localhost/api/game/shoot", {
      method: "POST",
      body: JSON.stringify({
        sessionToken,
        clientSeed,
        zone: 1, // shoot center
        action: "shoot",
      }),
    });

    const res = await shootPOST(request);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.result).toMatch(/GOAL|SAVED|MISS/);
    expect(data.opponentZone).toBeGreaterThanOrEqual(0);
    expect(data.opponentZone).toBeLessThanOrEqual(2);
    expect(data.hash).toBeDefined();
    expect(data.sessionToken).toBeDefined();
    expect(data.gameState.nonce).toBe(1);
    expect(data.gameState.phase).toBe("dive"); // turns to defense phase

    // Save token for next tests
    sessionToken = data.sessionToken;
  });

  test("3. /api/game/reveal exposes serverSeed for audit", async () => {
    const request = new Request("http://localhost/api/game/reveal", {
      method: "POST",
      body: JSON.stringify({
        sessionToken,
      }),
    });

    const res = await revealPOST(request);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.serverSeed).toBeDefined();

    // Verify provably fair commit match
    const hashedSeed = crypto.createHash("sha256").update(data.serverSeed).digest("hex");
    expect(hashedSeed).toBe(serverHash);
  });
});
