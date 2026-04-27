"use client";

import { Mail } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ApiError, sendEmail } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import type { MealPlan } from "@/lib/plan/types";

export interface EmailButtonProps {
  plan: MealPlan;
  disabled: boolean;
}

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return String(err);
}

export function EmailButton({ plan, disabled }: EmailButtonProps) {
  const [sending, setSending] = useState(false);

  function handleClick() {
    if (sending || disabled) return;
    setSending(true);
    sendEmail(plan)
      .then(({ id }) => {
        toast.success("Email sent", { description: `id: ${id}` });
      })
      .catch((err: unknown) => {
        toast.error("Couldn't send email", {
          description: errorMessage(err),
        });
      })
      .finally(() => {
        setSending(false);
      });
  }

  return (
    <Button
      onClick={handleClick}
      disabled={disabled || sending}
      aria-label="Email me this"
    >
      <Mail />
      {sending ? "Sending…" : "Email me this"}
    </Button>
  );
}
