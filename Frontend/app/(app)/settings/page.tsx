"use client";

import { useRouter } from "next/navigation";
import { SettingsScreen } from "@/app/components/SettingsScreen";

export default function SettingsPage() {
  const router = useRouter();
  return <SettingsScreen onNavigate={(s) => router.push(`/${s}`)} />;
}
