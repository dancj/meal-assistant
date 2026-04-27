import { HomePage } from "@/components/home-page";
import { isDemoMode } from "@/lib/demo/fixtures";

export default function Page() {
  const emailEnabled =
    (process.env.RESEND_API_KEY ?? "").length > 0 || isDemoMode();
  return <HomePage emailEnabled={emailEnabled} />;
}
