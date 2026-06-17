import { redirect } from "next/navigation";

// Point d'entrée "/" : redirige vers l'écran principal. Le layout du groupe
// (app) prend ensuite le relais côté client pour rediriger vers /login ou
// /onboarding si nécessaire (utilisateur non connecté / profil incomplet).
export default function Home() {
  redirect("/telemetry");
}
