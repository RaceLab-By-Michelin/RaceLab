"use client";

import { useRouter } from "next/navigation";
import { StravaClubsScreen } from "@/app/components/StravaClubsScreen";

export default function StravaClubsPage() {
  const router = useRouter();
  return <StravaClubsScreen onBack={() => router.push("/settings")} />;
}
