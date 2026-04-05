import { NextResponse } from "next/server";
import { getMealPlanRepo } from "@/lib/storage";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authError = requireAuth(request);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(
      Math.max(parseInt(searchParams.get("limit") ?? "10") || 10, 1),
      50
    );
    const plans = await getMealPlanRepo().list(limit);
    return NextResponse.json(plans);
  } catch (err) {
    console.error("Failed to fetch plans:", err);
    return NextResponse.json(
      { error: "Failed to fetch plans" },
      { status: 500 }
    );
  }
}
