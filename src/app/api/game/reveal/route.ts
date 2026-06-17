import { NextResponse } from "next/server";
import { decryptSession } from "@/utils/sessionCrypto";

export async function POST(request: Request) {
  try {
    const { sessionToken } = await request.json();
    if (!sessionToken) {
      return NextResponse.json(
        { success: false, error: "Missing session token" },
        { status: 400 }
      );
    }

    const sessionPayload = decryptSession(sessionToken);
    const { serverSeed } = sessionPayload;

    return NextResponse.json({
      success: true,
      serverSeed
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
