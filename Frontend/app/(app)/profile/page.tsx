"use client";

import { useRouter } from "next/navigation";
import { ProfileScreen } from "@/app/components/ProfileScreen";

export default function ProfilePage() {
  const router = useRouter();
  return <ProfileScreen onNavigate={(s) => router.push(`/${s}`)} />;
}
