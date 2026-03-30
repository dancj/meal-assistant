import { NextResponse } from "next/server";
import { isLocalMode, isGeminiAvailable } from "@/lib/demo-mode";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    demo: isLocalMode(),
    local: isLocalMode(),
    geminiAvailable: isGeminiAvailable(),
  });
}
