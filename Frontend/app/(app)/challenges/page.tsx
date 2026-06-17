"use client";

import { useRouter } from "next/navigation";
import { ChallengesScreen } from "@/app/components/ChallengesScreen";

export default function ChallengesPage() {
  const router = useRouter();
  return <ChallengesScreen onNavigate={(s) => router.push(`/${s}`)} />;
}
