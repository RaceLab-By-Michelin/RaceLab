"use client";

import { useRouter } from "next/navigation";
import { PartnersScreen } from "@/app/components/PartnersScreen";

export default function PartnersPage() {
  const router = useRouter();
  return <PartnersScreen onNavigate={(s) => router.push(`/${s}`)} />;
}
