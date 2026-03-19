import { NextResponse } from "next/server";
import { isDemoMode, isGeminiAvailable } from "@/lib/demo-mode";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    demo: isDemoMode(),
    geminiAvailable: isGeminiAvailable(),
  });
}
