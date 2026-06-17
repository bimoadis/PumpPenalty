import { NextResponse } from "next/server";
import { supabase } from "@/utils/supabaseClient";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      walletAddress,
      username,
      playerTeam,
      opponentTeam,
      playerScore,
      opponentScore,
      outcome,
      serverSeed,
      clientSeed,
      nonceCount,
    } = body;

    // Validate request inputs
    if (
      !username ||
      !playerTeam ||
      !opponentTeam ||
      playerScore === undefined ||
      opponentScore === undefined ||
      !outcome ||
      !serverSeed ||
      !clientSeed ||
      nonceCount === undefined
    ) {
      return NextResponse.json(
        { success: false, error: "Missing required match parameters" },
        { status: 400 }
      );
    }

    let userId: string | null = null;

    try {
      // 1. Resolve User ID
      if (walletAddress) {
        // Mode Web3: Cari atau daftarkan berdasarkan wallet address
        const { data: userByWallet, error: fetchErr } = await supabase
          .from("users")
          .select("id")
          .eq("wallet_address", walletAddress)
          .maybeSingle();

        if (fetchErr) throw fetchErr;

        if (userByWallet) {
          userId = userByWallet.id;
        } else {
          const { data: newUser, error: insertErr } = await supabase
            .from("users")
            .insert({ wallet_address: walletAddress, username })
            .select("id")
            .single();

          if (insertErr) throw insertErr;
          userId = newUser.id;
        }
      } else {
        // Mode Web2/Guest: Cari atau daftarkan berdasarkan username saja
        const { data: userByUsername, error: fetchErr } = await supabase
          .from("users")
          .select("id")
          .eq("username", username)
          .is("wallet_address", null)
          .maybeSingle();

        if (fetchErr) throw fetchErr;

        if (userByUsername) {
          userId = userByUsername.id;
        } else {
          const { data: newUser, error: insertErr } = await supabase
            .from("users")
            .insert({ username })
            .select("id")
            .single();

          if (insertErr) throw insertErr;
          userId = newUser.id;
        }
      }

      // 2. Catat riwayat pertandingan (match_history)
      const { data: match, error: matchErr } = await supabase
        .from("match_history")
        .insert({
          user_id: userId,
          player_team: playerTeam,
          opponent_team: opponentTeam,
          player_score: playerScore,
          opponent_score: opponentScore,
          outcome,
          server_seed: serverSeed,
          client_seed: clientSeed,
          nonce_count: nonceCount,
        })
        .select("id")
        .single();

      if (matchErr) throw matchErr;

      return NextResponse.json({
        success: true,
        matchId: match.id,
      });
    } catch (dbError) {
      const errMsg = (dbError as Error).message || "";
      if (errMsg.includes("relation") || errMsg.includes("cache") || (dbError as any).code === "PGRST204") {
        console.warn("Supabase tables not initialized. Saved locally in browser only.");
        return NextResponse.json({
          success: true,
          matchId: "local-fallback-" + Math.random().toString(36).substring(2, 10),
          warning: "Database tables not set up yet. Playing in local storage mode."
        });
      }
      throw dbError;
    }
  } catch (error) {
    console.error("Error saving match:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
