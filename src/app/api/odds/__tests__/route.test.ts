/**
 * @jest-environment node
 */
import { GET } from "../route";

describe("API Route - /api/odds", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  test("returns success and mapped teams when Polymarket API is working", async () => {
    // Mock successful Polymarket API response
    const mockMarkets = [
      {
        outcomes: ["Spain", "France", "England"],
        outcomePrices: ["0.20", "0.15", "0.12"]
      }
    ];

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockMarkets
    } as Response);

    const response = await GET();
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.source).toBe("polymarket");
    expect(Array.isArray(data.teams)).toBe(true);
    
    // Check Spain (ESP) should have 20%
    const espTeam = data.teams.find((t: any) => t.code === "ESP");
    expect(espTeam).toBeDefined();
    expect(espTeam.p).toBe(20);

    // Check France (FRA) should have 15%
    const fraTeam = data.teams.find((t: any) => t.code === "FRA");
    expect(fraTeam).toBeDefined();
    expect(fraTeam.p).toBe(15);
  });

  test("falls back gracefully when Polymarket API returns an error", async () => {
    // Mock network error / rate limit response
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 429
    } as Response);

    const response = await GET();
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.source).toBe("fallback");
    expect(Array.isArray(data.teams)).toBe(true);

    // Ensure all teams are present in fallback list
    expect(data.teams.length).toBeGreaterThan(5);
    const espTeam = data.teams.find((t: any) => t.code === "ESP");
    expect(espTeam).toBeDefined();
    expect(typeof espTeam.p).toBe("number");
  });

  test("falls back gracefully when Polymarket API throws network error", async () => {
    // Mock fetch throwing exception (e.g. DNS or connection timeout)
    global.fetch = jest.fn().mockRejectedValue(new Error("Network connection lost"));

    const response = await GET();
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.source).toBe("fallback");
    expect(Array.isArray(data.teams)).toBe(true);
    expect(data.teams.length).toBeGreaterThan(0);
  });
});
