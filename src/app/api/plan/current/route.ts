import { NextResponse } from "next/server";
import { getMealPlanRepo } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // Auth: skip if CRON_SECRET is not configured
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    if (token !== cronSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

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
