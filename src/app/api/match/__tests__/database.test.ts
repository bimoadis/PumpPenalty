/**
 * @jest-environment node
 */

import { POST as matchPost } from "../route";
import { GET as leaderboardGet } from "../../leaderboard/route";
import { supabase } from "../../../../utils/supabaseClient";

// Mock Supabase Client queries
jest.mock("../../../../utils/supabaseClient", () => ({
  supabase: {
    from: jest.fn(),
  },
}));

describe("Database APIs - Match & Leaderboard Operations", () => {
  let mockSelect: jest.Mock;
  let mockInsert: jest.Mock;
  let mockEq: jest.Mock;
  let mockIs: jest.Mock;
  let mockSingle: jest.Mock;
  let mockMaybeSingle: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSelect = jest.fn();
    mockInsert = jest.fn();
    mockEq = jest.fn();
    mockIs = jest.fn();
    mockSingle = jest.fn();
    mockMaybeSingle = jest.fn();

    (supabase.from as jest.Mock).mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
    });

    mockSelect.mockReturnValue({
      eq: mockEq,
      maybeSingle: mockMaybeSingle,
      single: mockSingle,
    });

    mockInsert.mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: mockSingle,
      }),
    });

    mockEq.mockReturnValue({
      maybeSingle: mockMaybeSingle,
      is: mockIs,
    });

    mockIs.mockReturnValue({
      maybeSingle: mockMaybeSingle,
    });
  });

  test("records a match successfully for a guest player", async () => {
    // 1. Mock user retrieval (null, user not found)
    mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null });
    // 2. Mock user insertion (successful user insert)
    mockSingle.mockResolvedValueOnce({ data: { id: "mock-user-uuid" }, error: null });
    // 3. Mock match insertion (successful match insert)
    mockSingle.mockResolvedValueOnce({ data: { id: "mock-match-uuid" }, error: null });

    const req = new Request("http://localhost/api/match", {
      method: "POST",
      body: JSON.stringify({
        username: "Player-degen",
        playerTeam: "ESP",
        opponentTeam: "FRA",
        playerScore: 5,
        opponentScore: 3,
        outcome: "win",
        serverSeed: "mockserverseed",
        clientSeed: "mockclientseed",
        nonceCount: 10,
      }),
    });

    const res = await matchPost(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.matchId).toBe("mock-match-uuid");
  });

  test("retrieves the leaderboard successfully", async () => {
    const mockLeaderboardData = [
      { username: "Player1", wallet_address: "0x123", total_wins: 10 },
      { username: "Player2", wallet_address: null, total_wins: 8 },
    ];

    mockSelect.mockResolvedValueOnce({ data: mockLeaderboardData, error: null });

    const res = await leaderboardGet();
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.leaderboard).toEqual(mockLeaderboardData);
  });

  test("returns 400 on missing parameters in POST match", async () => {
    const req = new Request("http://localhost/api/match", {
      method: "POST",
      body: JSON.stringify({
        username: "Player-degen",
        playerTeam: "ESP",
      }),
    });

    const res = await matchPost(req);
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error).toBe("Missing required match parameters");
  });
});
