import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    preferences: process.env.DIETARY_PREFERENCES || "",
  });
}
