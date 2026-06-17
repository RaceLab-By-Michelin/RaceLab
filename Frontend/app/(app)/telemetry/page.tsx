"use client";

import { useRouter } from "next/navigation";
import { TelemetryScreen } from "@/app/components/TelemetryScreen";

export default function TelemetryPage() {
  const router = useRouter();
  return <TelemetryScreen onNavigate={(s) => router.push(`/${s}`)} />;
}
