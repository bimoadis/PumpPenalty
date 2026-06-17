import { NextResponse } from "next/server";
import { supabase } from "@/utils/supabaseClient";

export async function GET() {
  try {
    // Kueri view leaderboard di Supabase
    const { data: leaderboard, error } = await supabase
      .from("leaderboard")
      .select("*");

    if (error) {
      // Jika view leaderboard belum dibuat, kembalikan data ranking demo/simulasi
      if (error.code === "PGRST204" || error.message?.includes("relation") || error.message?.includes("cache")) {
        console.warn("Supabase leaderboard view not initialized. Returning demo standings.");
        return NextResponse.json({
          success: true,
          leaderboard: [
            { username: "Demo_ESP", wallet_address: "5Gf9dJzYhW...ESP", total_wins: 18 },
            { username: "Demo_FRA", wallet_address: "5Gf9dJzYhW...FRA", total_wins: 14 },
            { username: "Demo_GER", wallet_address: "5Gf9dJzYhW...GER", total_wins: 9 },
          ],
          warning: "Database not initialized. Displaying simulated standings."
        });
      }
      throw error;
    }

    return NextResponse.json({
      success: true,
      leaderboard: leaderboard || [],
    });
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    return NextResponse.json(
      { success: true, leaderboard: [] },
      { status: 200 }
    );
  }
}
