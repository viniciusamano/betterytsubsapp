import { NextResponse } from "next/server";
import { syncChannels } from "@/lib/sync-channels";

export const dynamic = "force-dynamic";

// Manual trigger for now: visit /api/sync?limit=20 in a browser. Once this
// is proven out, Fase 1 item 7 wires the same syncChannels() call into a
// Netlify scheduled/background function so it runs daily on its own.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? Number(limitParam) : undefined;

  try {
    const result = await syncChannels(limit);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
