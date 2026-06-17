"use client";

import { useRouter } from "next/navigation";
import { TireUpdateScreen } from "@/app/components/TireUpdateScreen";

export default function TiresPage() {
  const router = useRouter();
  return <TireUpdateScreen onNavigate={(s) => router.push(`/${s}`)} />;
}
