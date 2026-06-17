"use client";

import { useRouter } from "next/navigation";
import { CoachScreen } from "@/app/components/CoachScreen";

export default function CoachPage() {
  const router = useRouter();
  return <CoachScreen onNavigate={(s) => router.push(`/${s}`)} />;
}
