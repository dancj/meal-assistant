import { NextResponse } from "next/server";
import { getMealPlanRepo } from "@/lib/storage";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authError = requireAuth(request);
  if (authError) return authError;

  try {
    const plan = await getMealPlanRepo().getCurrent();
    if (!plan) {
      return NextResponse.json(
        { error: "No meal plan found" },
        { status: 404 }
      );
    }
    return NextResponse.json(plan);
  } catch (err) {
    console.error("Failed to fetch current meal plan:", err);
    return NextResponse.json(
      { error: "Failed to fetch current meal plan" },
      { status: 500 }
    );
  }
}
