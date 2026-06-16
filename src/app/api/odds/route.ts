import { NextResponse } from "next/server";
import { TEAMS } from "@/utils/constants";
import { Team } from "@/utils/types";

export async function GET() {
  let timeoutId: NodeJS.Timeout | undefined;
  try {
    // 1. Try to fetch from Polymarket Gamma API (sports query/tag)
    const controller = new AbortController();
    timeoutId = setTimeout(() => controller.abort(), 3500); // 3.5s timeout

    const res = await fetch("https://gamma-api.polymarket.com/markets?limit=10&active=true&query=winner", {
      signal: controller.signal,
      next: { revalidate: 30 } // Cache for 30s
    });
    
    clearTimeout(timeoutId);
    timeoutId = undefined;

    if (!res.ok) {
      throw new Error(`Polymarket Gamma API returned status: ${res.status}`);
    }

    const markets = await res.json();
    const priceMap: Record<string, number> = {};

    if (Array.isArray(markets)) {
      markets.forEach((m) => {
        if (m.outcomes && m.outcomePrices) {
          const outcomes: string[] = m.outcomes;
          const prices: string[] = m.outcomePrices;
          outcomes.forEach((name, idx) => {
            const priceVal = parseFloat(prices[idx]);
            if (!isNaN(priceVal) && priceVal > 0) {
              priceMap[name.toLowerCase()] = priceVal;
            }
          });
        }
      });
    }

    // 2. Map Polymarket prices to our teams
    let matchCount = 0;
    const mappedTeams: Team[] = TEAMS.map((team) => {
      const nameKey = team.name.toLowerCase();
      const codeKey = team.code.toLowerCase();
      const livePrice = priceMap[nameKey] ?? priceMap[codeKey];

      if (livePrice !== undefined) {
        matchCount++;
        return {
          ...team,
          p: Math.max(0.5, Math.round(livePrice * 100 * 10) / 10),
        };
      }

      // Fallback: add a small visual fluctuation to simulate active trading
      const nudge = (Math.random() - 0.5) * 1.5; // -0.75% to +0.75%
      const newP = Math.max(0.5, Math.min(45, team.p + nudge));
      return {
        ...team,
        p: Math.round(newP * 10) / 10,
      };
    });

    return NextResponse.json({
      success: true,
      source: matchCount > 0 ? "polymarket" : "simulation",
      teams: mappedTeams,
    });
  } catch (error) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    // 3. Graceful fallback on network fail
    const fallbackTeams: Team[] = TEAMS.map((team) => {
      const nudge = (Math.random() - 0.5) * 1.2;
      const newP = Math.max(0.5, Math.min(45, team.p + nudge));
      return {
        ...team,
        p: Math.round(newP * 10) / 10,
      };
    });

    return NextResponse.json({
      success: true,
      source: "fallback",
      teams: fallbackTeams,
    });
  }
}
